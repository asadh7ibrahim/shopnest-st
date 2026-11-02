import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { first, sanitizeSearch, toInt, toNumber } from "@/lib/utils";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";
import { ProductFilters, SORT_OPTIONS, type FilterValues } from "@/components/product-filters";
import type { Category, ListingProduct } from "@/types/db";

const PAGE_SIZE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "All products",
  description: "Browse, search and filter all products.",
};

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const q = sanitizeSearch(first(sp.q));
  const categorySlug = (first(sp.category) ?? "").replace(/[^a-z0-9-]/g, "").slice(0, 80);
  const minPrice = toNumber(first(sp.min));
  const maxPrice = toNumber(first(sp.max));
  const inStock = first(sp.stock) === "1";
  const sortParam = first(sp.sort) ?? "newest";
  const sort = SORT_OPTIONS.some((o) => o.value === sortParam) ? sortParam : "newest";
  const page = toInt(first(sp.page), 1, 1, 1000);

  const supabase = await createClient();

  let query = supabase.from("product_listing").select("*", { count: "exact" });

  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,category_name.ilike.%${q}%`);
  if (categorySlug) query = query.eq("category_slug", categorySlug);
  if (minPrice !== undefined) query = query.gte("max_price", minPrice);
  if (maxPrice !== undefined) query = query.lte("min_price", maxPrice);
  if (inStock) query = query.gt("total_stock", 0);

  switch (sort) {
    case "price_asc":
      query = query.order("min_price", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("min_price", { ascending: false, nullsFirst: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const from = (page - 1) * PAGE_SIZE;
  const [{ data, count }, { data: cats }] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    supabase.from("categories").select("id, name, slug, description").order("name"),
  ]);

  const products = (data ?? []) as ListingProduct[];
  const categories = (cats ?? []) as Category[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCategory = categories.find((c) => c.slug === categorySlug);

  const values: FilterValues = {
    q,
    category: categorySlug,
    min: minPrice?.toString() ?? "",
    max: maxPrice?.toString() ?? "",
    inStock,
    sort,
  };

  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {activeCategory ? activeCategory.name : q ? `Results for “${q}”` : "All products"}
        </h1>
        {activeCategory?.description && (
          <p className="mt-1 text-slate-600">{activeCategory.description}</p>
        )}
        <p className="mt-1 text-sm text-slate-500" aria-live="polite">
          {total} {total === 1 ? "product" : "products"}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Mobile: collapsible */}
        <details className="card p-4 lg:hidden">
          <summary className="cursor-pointer select-none text-sm font-semibold">
            Search &amp; filters
          </summary>
          <div className="mt-4">
            <ProductFilters idSuffix="m" categories={categories} values={values} />
          </div>
        </details>

        {/* Desktop: sidebar */}
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="card sticky top-36 p-5">
            <ProductFilters idSuffix="d" categories={categories} values={values} />
          </div>
        </aside>

        <section aria-label="Products">
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="font-semibold text-slate-800">No products match your filters.</p>
              <p className="mt-1 text-sm text-slate-500">Try removing a filter or searching for something else.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 3} />
              ))}
            </div>
          )}
          <Pagination
            basePath="/products"
            page={page}
            totalPages={totalPages}
            params={{
              q: q || undefined,
              category: categorySlug || undefined,
              min: values.min || undefined,
              max: values.max || undefined,
              stock: inStock ? "1" : undefined,
              sort: sort !== "newest" ? sort : undefined,
            }}
          />
        </section>
      </div>
    </div>
  );
}
