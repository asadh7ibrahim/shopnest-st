import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CategoryCreateForm, CategoryRow } from "@/components/admin/category-manager";
import type { Category } from "@/types/db";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, name, slug, description").order("name");
  const categories = (data ?? []) as Category[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Categories</h1>
      <CategoryCreateForm />
      <section className="card" aria-label="Existing categories">
        {categories.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No categories yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {categories.map((c) => (
              <CategoryRow key={c.id} category={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
