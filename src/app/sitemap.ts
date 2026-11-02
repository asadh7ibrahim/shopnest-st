import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/config/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "daily", priority: 1 },
    { url: `${siteConfig.url}/products`, changeFrequency: "daily", priority: 0.9 },
  ];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return entries;

  try {
    // Public, anonymous read (RLS only exposes active products)
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase.from("products").select("slug, updated_at").eq("is_active", true).limit(5000),
      supabase.from("categories").select("slug").limit(500),
    ]);

    for (const c of categories ?? []) {
      entries.push({ url: `${siteConfig.url}/products?category=${c.slug}`, changeFrequency: "weekly", priority: 0.7 });
    }
    for (const p of products ?? []) {
      entries.push({
        url: `${siteConfig.url}/products/${p.slug}`,
        lastModified: p.updated_at,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (err) {
    // Never fail the build because the database is unreachable
    console.error("sitemap: could not load catalog", err);
  }
  return entries;
}
