import Link from "next/link";
import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import type { Category, ListingProduct } from "@/types/db";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("product_listing")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("categories").select("id, name, slug, description").order("name").limit(8),
  ]);

  const latest = (products ?? []) as ListingProduct[];
  const cats = (categories ?? []) as Category[];

  return (
    <>
      <section className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 text-white">
        <div className="container-page grid items-center gap-8 py-14 sm:py-20 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Everyday essentials, delivered.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-indigo-100">{siteConfig.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
              >
                Shop all products
              </Link>
              <Link
                href="/products?sort=newest"
                className="inline-flex items-center rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                New arrivals
              </Link>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["Simple checkout", "Order now, pay by bank transfer and upload your slip."],
              ["Track every order", "See your order move from pending to delivered."],
              ["Secure & private", "Your slip is stored privately and only you and our team can see it."],
            ].map(([title, text]) => (
              <li key={title} className="rounded-xl bg-white/10 p-4 ring-1 ring-white/20">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-indigo-100">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {cats.length > 0 && (
        <section className="container-page mt-12">
          <h2 className="text-xl font-bold sm:text-2xl">Shop by category</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cats.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/products?category=${c.slug}`}
                  className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                >
                  <span className="font-semibold text-slate-900">{c.name}</span>
                  {c.description && (
                    <span className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-page mt-12">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-bold sm:text-2xl">New arrivals</h2>
          <Link href="/products" className="text-sm font-semibold text-indigo-700 hover:underline">
            View all
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No products yet. Sign in as an admin and add your first product.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {latest.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
