/** Public URL of an object in the (public) product-images bucket. */
export function publicImageUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/product-images/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
