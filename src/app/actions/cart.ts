"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { VariantInfo } from "@/lib/cart";

type Row = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  products: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    product_images: { path: string; position: number }[];
  } | null;
};

/** Returns fresh price / stock / names for cart lines (public catalog data only). */
export async function getVariantsInfo(ids: string[]): Promise<VariantInfo[]> {
  const parsed = z.array(z.string().uuid()).max(50).safeParse(ids);
  if (!parsed.success || parsed.data.length === 0) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("product_variants")
    .select(
      "id, name, price, stock, is_active, products!inner(id, name, slug, is_active, product_images(path, position))",
    )
    .in("id", parsed.data);

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.is_active && r.products?.is_active)
    .map((r) => {
      const images = [...(r.products!.product_images ?? [])].sort(
        (a, b) => a.position - b.position,
      );
      return {
        variantId: r.id,
        productId: r.products!.id,
        slug: r.products!.slug,
        name: r.products!.name,
        variantName: r.name,
        price: Number(r.price),
        image: images[0]?.path ?? null,
        stock: r.stock,
      };
    });
}
