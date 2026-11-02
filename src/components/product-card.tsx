import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { formatPrice } from "@/lib/format";
import type { ListingProduct } from "@/types/db";

export function ProductCard({
  product,
  priority = false,
}: {
  product: ListingProduct;
  priority?: boolean;
}) {
  const soldOut = product.total_stock <= 0;
  const min = product.min_price;
  const max = product.max_price;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <ProductImage
          path={product.image_path}
          alt={product.name}
          sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 46vw"
          priority={priority}
          className="transition duration-300 group-hover:scale-105"
        />
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-slate-900/85 px-2.5 py-1 text-xs font-medium text-white">
            Sold out
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.category_name && (
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {product.category_name}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 sm:text-base">
          {product.name}
        </h3>
        <p className="mt-auto pt-2 text-sm font-semibold text-slate-900 sm:text-base">
          {min === null
            ? "—"
            : min === max
              ? formatPrice(min)
              : `From ${formatPrice(min)}`}
        </p>
      </div>
    </Link>
  );
}
