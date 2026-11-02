import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductForm, newVariant } from "@/components/admin/product-form";
import type { Category } from "@/types/db";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, name, slug, description").order("name");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm font-medium text-indigo-700 hover:underline">
          ← Products
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New product</h1>
        <p className="text-sm text-slate-500">Save the product first, then you can upload its images.</p>
      </div>
      <ProductForm
        categories={(data ?? []) as Category[]}
        initial={{
          name: "",
          slug: "",
          description: "",
          categoryId: "",
          isActive: true,
          variants: [newVariant("Default")],
        }}
      />
    </div>
  );
}
