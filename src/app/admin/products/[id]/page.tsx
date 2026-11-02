import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation";
import { ProductForm, type ProductDraft } from "@/components/admin/product-form";
import { ImageManager } from "@/components/admin/image-manager";
import type { Category, ProductImage, Variant } from "@/types/db";

export const metadata: Metadata = { title: "Edit product" };

type Row = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  is_active: boolean;
  product_variants: Variant[];
  product_images: ProductImage[];
};

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const sp = await searchParams;
  const created = sp.created === "1";
  const saved = sp.saved === "1";

  const supabase = await createClient();
  const [{ data }, { data: cats }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, slug, description, category_id, is_active, product_variants(id, name, sku, price, compare_at_price, stock, is_active, position), product_images(id, path, alt, position)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name, slug, description").order("name"),
  ]);
  if (!data) notFound();
  const product = data as unknown as Row;

  const initial: ProductDraft = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    categoryId: product.category_id ?? "",
    isActive: product.is_active,
    variants: [...product.product_variants]
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        key: v.id,
        id: v.id,
        name: v.name,
        sku: v.sku ?? "",
        price: String(v.price),
        compareAtPrice: v.compare_at_price === null ? "" : String(v.compare_at_price),
        stock: String(v.stock),
        isActive: v.is_active,
      })),
  };

  const images = [...product.product_images].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/products" className="text-sm font-medium text-indigo-700 hover:underline">
            ← Products
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{product.name}</h1>
        </div>
        {product.is_active && (
          <Link href={`/products/${product.slug}`} target="_blank" className="btn-secondary">
            View in store ↗
          </Link>
        )}
      </div>

      {created && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">
          Product created. Now add some images below.
        </p>
      )}

      {saved && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">
          Changes saved.
        </p>
      )}

      {/* key forces a fresh form state after a save refreshes the server data */}
      <ProductForm key={JSON.stringify(initial)} initial={initial} categories={(cats ?? []) as Category[]} />
      <ImageManager productId={product.id} images={images} />
    </div>
  );
}
