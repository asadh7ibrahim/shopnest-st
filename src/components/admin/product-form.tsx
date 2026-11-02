"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProduct, saveProduct } from "@/app/actions/admin-products";
import { slugify } from "@/lib/utils";
import type { Category } from "@/types/db";

export type VariantDraft = {
  key: string;
  id?: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  isActive: boolean;
};

export type ProductDraft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  isActive: boolean;
  variants: VariantDraft[];
};

let keyCounter = 0;
export const newVariant = (name = "Default"): VariantDraft => ({
  key: `new-${++keyCounter}`,
  name,
  sku: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
  isActive: true,
});

export function ProductForm({
  initial,
  categories,
}: {
  initial: ProductDraft;
  categories: Category[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const setVariant = (key: string, patch: Partial<VariantDraft>) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)),
    }));
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      id: draft.id,
      name: draft.name,
      slug: draft.slug,
      description: draft.description,
      categoryId: draft.categoryId || null,
      isActive: draft.isActive,
      variants: draft.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice.trim() === "" ? null : Number(v.compareAtPrice),
        stock: Number(v.stock),
        isActive: v.isActive,
      })),
    };

    startTransition(async () => {
      const res = await saveProduct(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (!draft.id) {
        router.push(`/admin/products/${res.id}?created=1`);
      } else {
        // The edit page remounts the form with fresh server data (so new variants get ids);
        // the "saved" banner is therefore driven by the URL, not local state.
        router.replace(`/admin/products/${res.id}?saved=1`);
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!draft.id) return;
    if (!window.confirm("Delete this product and all of its images? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteProduct(draft.id!);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/admin/products");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="card space-y-4 p-5" aria-labelledby="details-heading">
        <h2 id="details-heading" className="font-semibold">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-name" className="label">Name</label>
            <input
              id="p-name"
              required
              maxLength={160}
              value={draft.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value));
              }}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="p-slug" className="label">URL slug</label>
            <input
              id="p-slug"
              required
              maxLength={80}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Lowercase letters, numbers and dashes"
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase());
              }}
              className="input font-mono"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-cat" className="label">Category</label>
            <select id="p-cat" value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="input">
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Visible in the store
          </label>
        </div>
        <div>
          <label htmlFor="p-desc" className="label">Description</label>
          <textarea
            id="p-desc"
            rows={5}
            maxLength={5000}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            className="input"
          />
        </div>
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="variants-heading">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="variants-heading" className="font-semibold">Variants &amp; stock</h2>
            <p className="text-sm text-slate-500">
              One row per option (e.g. &quot;Red / M&quot;). Use a single &quot;Default&quot; row if there are no options.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => set("variants", [...draft.variants, newVariant("")])}
          >
            + Add variant
          </button>
        </div>

        <ul className="space-y-3">
          {draft.variants.map((v, i) => (
            <li key={v.key} className="rounded-xl border border-slate-200 p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div className="lg:col-span-2">
                  <label htmlFor={`v-name-${v.key}`} className="label">Name</label>
                  <input id={`v-name-${v.key}`} required maxLength={100} value={v.name} onChange={(e) => setVariant(v.key, { name: e.target.value })} className="input" />
                </div>
                <div>
                  <label htmlFor={`v-sku-${v.key}`} className="label">SKU</label>
                  <input id={`v-sku-${v.key}`} maxLength={64} value={v.sku} onChange={(e) => setVariant(v.key, { sku: e.target.value })} className="input" />
                </div>
                <div>
                  <label htmlFor={`v-price-${v.key}`} className="label">Price</label>
                  <input id={`v-price-${v.key}`} required type="number" min={0} step="0.01" inputMode="decimal" value={v.price} onChange={(e) => setVariant(v.key, { price: e.target.value })} className="input" />
                </div>
                <div>
                  <label htmlFor={`v-cmp-${v.key}`} className="label">Compare-at</label>
                  <input id={`v-cmp-${v.key}`} type="number" min={0} step="0.01" inputMode="decimal" value={v.compareAtPrice} onChange={(e) => setVariant(v.key, { compareAtPrice: e.target.value })} className="input" placeholder="Optional" />
                </div>
                <div>
                  <label htmlFor={`v-stock-${v.key}`} className="label">Stock</label>
                  <input id={`v-stock-${v.key}`} required type="number" min={0} step={1} inputMode="numeric" value={v.stock} onChange={(e) => setVariant(v.key, { stock: e.target.value })} className="input" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={v.isActive} onChange={(e) => setVariant(v.key, { isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                  Active
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-40"
                  disabled={draft.variants.length === 1}
                  onClick={() => set("variants", draft.variants.filter((x) => x.key !== v.key))}
                  aria-label={`Remove variant ${i + 1}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : draft.id ? "Save changes" : "Create product"}
        </button>
        {draft.id && (
          <button type="button" className="btn-danger" onClick={onDelete} disabled={pending}>
            Delete product
          </button>
        )}
      </div>
    </form>
  );
}
