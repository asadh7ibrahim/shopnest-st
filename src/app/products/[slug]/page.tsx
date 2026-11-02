import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/storage";
import { ProductGallery } from "@/components/product-gallery";
import { AddToCart } from "@/components/add-to-cart";
import type { ProductImage, Variant } from "@/types/db";

type Params = Promise<{ slug: string }>;

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: { name: string; slug: string } | null;
  product_variants: Variant[];
  product_images: ProductImage[];
};

const getProduct = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, category:categories(name, slug), product_variants(id, name, sku, price, compare_at_price, stock, is_active, position), product_images(id, path, alt, position)",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as unknown as ProductRow | null) ?? null;
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  const image = [...product.product_images].sort((a, b) => a.position - b.position)[0];
  const description = product.description?.slice(0, 160);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      images: image ? [publicImageUrl(image.path)] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const variants = product.product_variants
    .filter((v) => v.is_active)
    .sort((a, b) => a.position - b.position)
    .map((v) => ({ ...v, price: Number(v.price), compare_at_price: v.compare_at_price === null ? null : Number(v.compare_at_price) }));
  const images = [...product.product_images].sort((a, b) => a.position - b.position);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: images.map((i) => publicImageUrl(i.path)),
    offers: variants.map((v) => ({
      "@type": "Offer",
      price: v.price,
      priceCurrency: process.env.NEXT_PUBLIC_CURRENCY || "USD",
      availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      sku: v.sku ?? undefined,
    })),
  };

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="hover:text-slate-900">Home</Link></li>
          <li aria-hidden>/</li>
          {product.category && (
            <>
              <li>
                <Link href={`/products?category=${product.category.slug}`} className="hover:text-slate-900">
                  {product.category.name}
                </Link>
              </li>
              <li aria-hidden>/</li>
            </>
          )}
          <li aria-current="page" className="text-slate-800">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={images} name={product.name} />

        <div>
          {product.category && (
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              {product.category.name}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{product.name}</h1>

          <div className="mt-5">
            <AddToCart
              product={{ id: product.id, slug: product.slug, name: product.name, image: images[0]?.path ?? null }}
              variants={variants.map((v) => ({
                id: v.id,
                name: v.name,
                price: v.price,
                compare_at_price: v.compare_at_price,
                stock: v.stock,
              }))}
            />
          </div>

          {product.description && (
            <section className="mt-8 border-t border-slate-200 pt-6">
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-600">
                {product.description}
              </p>
            </section>
          )}
        </div>
      </div>

      {/* JSON.stringify output escapes quotes; "<" is replaced to prevent </script> injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
