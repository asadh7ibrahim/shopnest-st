import Link from "next/link";
import type { Category } from "@/types/db";

export type FilterValues = {
  q: string;
  category: string;
  min: string;
  max: string;
  inStock: boolean;
  sort: string;
};

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name: A–Z" },
] as const;

/**
 * Plain GET <form>: works without JavaScript, is shareable/bookmarkable and SEO
 * friendly. The same component is rendered in the sidebar (desktop) and inside a
 * collapsible panel (mobile).
 */
export function ProductFilters({
  idSuffix,
  categories,
  values,
}: {
  idSuffix: string;
  categories: Category[];
  values: FilterValues;
}) {
  const id = (name: string) => `${name}-${idSuffix}`;

  return (
    <form action="/products" method="get" className="space-y-5">
      <div>
        <label htmlFor={id("q")} className="label">
          Search
        </label>
        <input
          id={id("q")}
          name="q"
          type="search"
          defaultValue={values.q}
          maxLength={80}
          placeholder="Name or description"
          className="input"
        />
      </div>

      <div>
        <label htmlFor={id("category")} className="label">
          Category
        </label>
        <select id={id("category")} name="category" defaultValue={values.category} className="input">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">Price</legend>
        <div className="flex items-center gap-2">
          <input
            name="min"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={values.min}
            placeholder="Min"
            aria-label="Minimum price"
            className="input"
          />
          <span className="text-slate-400">–</span>
          <input
            name="max"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={values.max}
            placeholder="Max"
            aria-label="Maximum price"
            className="input"
          />
        </div>
      </fieldset>

      <div>
        <label htmlFor={id("sort")} className="label">
          Sort by
        </label>
        <select id={id("sort")} name="sort" defaultValue={values.sort} className="input">
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="stock"
          value="1"
          defaultChecked={values.inStock}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
        />
        In stock only
      </label>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1">
          Apply filters
        </button>
        <Link href="/products" className="btn-secondary">
          Reset
        </Link>
      </div>
    </form>
  );
}
