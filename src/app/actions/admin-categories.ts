"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { categorySchema, uuidSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export type CategoryFormState = { error?: string; ok?: boolean } | undefined;

function parseCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const rawSlug = String(formData.get("slug") ?? "").trim();
  return categorySchema.safeParse({
    name,
    slug: rawSlug || slugify(name),
    description: String(formData.get("description") ?? "") || undefined,
  });
}

function done() {
  revalidatePath("/", "layout");
}

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();
  const parsed = parseCategory(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid category." };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description ?? null,
  });
  if (error) {
    return { error: error.code === "23505" ? "That slug already exists." : "Could not create category." };
  }
  done();
  return { ok: true };
}

export async function updateCategory(
  id: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid category." };
  const parsed = parseCategory(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid category." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description ?? null,
    })
    .eq("id", id);
  if (error) {
    return { error: error.code === "23505" ? "That slug already exists." : "Could not save category." };
  }
  done();
  return { ok: true };
}

/** Products in a deleted category are kept (category becomes empty). */
export async function deleteCategory(id: string): Promise<CategoryFormState> {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid category." };
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: "Could not delete category." };
  done();
  return { ok: true };
}
