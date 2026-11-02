"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_UPLOAD_BYTES, processImage } from "@/lib/image";
import { productSchema, uuidSchema } from "@/lib/validation";
import type { ActionResult } from "@/types/db";

const MAX_IMAGES_PER_PRODUCT = 10;

function refresh(slug?: string) {
  revalidatePath("/");
  revalidatePath("/products");
  if (slug) revalidatePath(`/products/${slug}`);
  revalidatePath("/admin", "layout");
}

/** Create or update a product together with its variants. */
export async function saveProduct(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product data." };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const fields = {
    name: d.name,
    slug: d.slug,
    description: d.description || null,
    category_id: d.categoryId,
    is_active: d.isActive,
  };

  let productId = d.id;
  let variantIdsBefore: string[] = [];
  if (productId) {
    // snapshot current variant ids BEFORE writing, so we know which ones were removed
    const { data: before } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);
    variantIdsBefore = (before ?? []).map((r) => r.id as string);

    const { error } = await supabase.from("products").update(fields).eq("id", productId);
    if (error) return { ok: false, error: friendlyError(error) };
  } else {
    const { data, error } = await supabase.from("products").insert(fields).select("id").single();
    if (error || !data) return { ok: false, error: friendlyError(error) };
    productId = data.id as string;
  }

  const rows = d.variants.map((v, position) => ({
    ...(v.id ? { id: v.id } : {}),
    product_id: productId,
    name: v.name,
    sku: v.sku || null,
    price: v.price,
    compare_at_price: v.compareAtPrice ?? null,
    stock: v.stock,
    is_active: v.isActive,
    position,
  }));

  const existing = rows.filter((r) => "id" in r);
  const created = rows.filter((r) => !("id" in r));

  if (existing.length) {
    const { error } = await supabase.from("product_variants").upsert(existing, { onConflict: "id" });
    if (error) return { ok: false, error: friendlyError(error) };
  }
  if (created.length) {
    const { error } = await supabase.from("product_variants").insert(created);
    if (error) return { ok: false, error: friendlyError(error) };
  }

  // Remove variants that were deleted in the form (order history keeps its snapshots)
  const keepIds = new Set(existing.map((r) => (r as { id: string }).id));
  const toDelete = variantIdsBefore.filter((id) => !keepIds.has(id));
  if (toDelete.length) {
    const { error } = await supabase.from("product_variants").delete().in("id", toDelete);
    if (error) return { ok: false, error: friendlyError(error) };
  }

  refresh(d.slug);
  return { ok: true, id: productId! };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(productId).success) return { ok: false, error: "Invalid product." };
  const supabase = await createClient();

  const { data: images } = await supabase
    .from("product_images")
    .select("path")
    .eq("product_id", productId);
  if (images?.length) {
    await supabase.storage.from("product-images").remove(images.map((i) => i.path as string));
  }

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true };
}

export async function uploadProductImage(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(productId).success) return { ok: false, error: "Invalid product." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "No file received." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "File is too large." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("product_images")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false });

  if ((existing?.length ?? 0) >= MAX_IMAGES_PER_PRODUCT) {
    return { ok: false, error: `A product can have at most ${MAX_IMAGES_PER_PRODUCT} images.` };
  }

  let body: Buffer;
  try {
    body = await processImage(file, { maxDimension: 1600, quality: 80 });
  } catch {
    return { ok: false, error: "That doesn't look like a valid JPG, PNG or WebP image." };
  }

  const path = `${productId}/${randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, body, {
      contentType: "image/webp",
      cacheControl: "31536000", // immutable: every upload gets a new unique path
      upsert: false,
    });
  if (uploadError) {
    console.error("product image upload failed", uploadError);
    return { ok: false, error: "Upload failed. Please try again." };
  }

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;
  const { error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, path, position: nextPosition });
  if (error) {
    await supabase.storage.from("product-images").remove([path]);
    return { ok: false, error: friendlyError(error) };
  }

  refresh();
  return { ok: true };
}

export async function deleteProductImage(imageId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(imageId).success) return { ok: false, error: "Invalid image." };
  const supabase = await createClient();

  const { data: image } = await supabase
    .from("product_images")
    .select("path")
    .eq("id", imageId)
    .maybeSingle();
  if (!image) return { ok: false, error: "Image not found." };

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { ok: false, error: friendlyError(error) };
  await supabase.storage.from("product-images").remove([image.path as string]);

  refresh();
  return { ok: true };
}

/** Moves the chosen image to position 0 (the main image shown in listings). */
export async function makePrimaryImage(imageId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(imageId).success) return { ok: false, error: "Invalid image." };
  const supabase = await createClient();

  const { data: image } = await supabase
    .from("product_images")
    .select("id, product_id")
    .eq("id", imageId)
    .maybeSingle();
  if (!image) return { ok: false, error: "Image not found." };

  const { data: all } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", image.product_id)
    .order("position")
    .order("created_at");

  const ordered = [imageId, ...(all ?? []).map((r) => r.id as string).filter((id) => id !== imageId)];
  for (let i = 0; i < ordered.length; i++) {
    const { error } = await supabase.from("product_images").update({ position: i }).eq("id", ordered[i]);
    if (error) return { ok: false, error: friendlyError(error) };
  }

  refresh();
  return { ok: true };
}

function friendlyError(error: { code?: string; message?: string } | null): string {
  if (error?.code === "23505") {
    return error.message?.includes("sku")
      ? "That SKU is already used by another variant."
      : "That URL slug is already in use. Choose another one.";
  }
  if (error?.code === "42501") return "You don't have permission to do that.";
  console.error("admin product error", error);
  return "Something went wrong. Please try again.";
}
