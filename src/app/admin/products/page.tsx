import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { first, sanitizeSearch, toInt } from "@/lib/utils";
import { ProductImage } from "@/components/product-image";
import { Pagination } from "@/components/pagination";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 20;

type Row = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  categories: { name: string } | null;
  product_variants: { stock: number; is_active: boolean }[];
  product_images: { path: string; position: number }[];
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = sanitizeSearch(first(sp.q));
  const low = first(sp.stock) === "low";
  const page = toInt(first(sp.page), 1, 1, 10_000);

  const supabase = await createClient();
  const variantEmbed = low ? "product_variants!inner(stock, is_active)" : "product_variants(stock, is_active)";
  let query = supabase
    .from("products")
    .select(
      `id, name, slug, is_active, categories(name), ${variantEmbed}, product_images(path, position)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("name", `%${q}%`);
  if (low) query = query.lte("product_variants.stock", 5).eq("product_variants.is_active", true);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const rows = (data ?? []) as unknown as Row[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">
          + New product
        </Link>
      </div>

      <form action="/admin/products" className="flex flex-wrap items-center gap-2">
        <label htmlFor="q" className="sr-only">Search products</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Search by name…" className="input max-w-xs" />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="stock" value="low" defaultChecked={low} className="h-4 w-4 rounded border-slate-300" />
          Low stock only
        </label>
        <button className="btn-secondary" type="submit">Filter</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th" scope="col">Product</th>
              <th className="th" scope="col">Category</th>
              <th className="th" scope="col">Variants</th>
              <th className="th" scope="col">Stock</th>
              <th className="th" scope="col">Status</th>
              <th className="th" scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="td py-10 text-center text-slate-500">No products found.</td></tr>
            )}
            {rows.map((p) => {
              const image = [...p.product_images].sort((a, b) => a.position - b.position)[0];
              const stock = p.product_variants.reduce((n, v) => n + v.stock, 0);
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <ProductImage path={image?.path} alt={p.name} sizes="48px" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td">{p.categories?.name ?? "—"}</td>
                  <td className="td">{p.product_variants.length}</td>
                  <td className="td">
                    <span className={stock === 0 ? "font-semibold text-red-600" : ""}>{stock}</span>
                  </td>
                  <td className="td">
                    <span className={p.is_active ? "text-green-700" : "text-slate-500"}>
                      {p.is_active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="td text-right">
                    <Link href={`/admin/products/${p.id}`} className="font-semibold text-indigo-700 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/admin/products" page={page} totalPages={totalPages} params={{ q: q || undefined, stock: low ? "low" : undefined }} />
    </div>
  );
}
