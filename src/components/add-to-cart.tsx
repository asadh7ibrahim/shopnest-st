"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type VariantOption = {
  id: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
};

export function AddToCart({
  product,
  variants,
}: {
  product: { id: string; slug: string; name: string; image: string | null };
  variants: VariantOption[];
}) {
  const { add } = useCart();
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = useMemo(() => variants.find((v) => v.id === variantId), [variants, variantId]);
  if (!variant) return <p className="text-slate-500">This product is currently unavailable.</p>;

  const soldOut = variant.stock <= 0;
  const maxQty = Math.max(1, Math.min(variant.stock, 20));
  const onSale = variant.compare_at_price !== null && variant.compare_at_price > variant.price;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-slate-900">{formatPrice(variant.price)}</span>
        {onSale && (
          <span className="text-lg text-slate-400 line-through">
            {formatPrice(variant.compare_at_price)}
          </span>
        )}
      </div>

      {variants.length > 1 && (
        <fieldset>
          <legend className="label">Option</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const selected = v.id === variant.id;
              return (
                <label
                  key={v.id}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-medium transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-600",
                    selected
                      ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
                    v.stock <= 0 && "opacity-50",
                  )}
                >
                  <input
                    type="radio"
                    name="variant"
                    value={v.id}
                    checked={selected}
                    onChange={() => {
                      setVariantId(v.id);
                      setQuantity(1);
                      setAdded(false);
                    }}
                    className="sr-only"
                  />
                  <span className={cn(v.stock <= 0 && "line-through")}>{v.name}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <p
        className={cn(
          "text-sm font-medium",
          soldOut ? "text-red-600" : variant.stock <= 5 ? "text-amber-600" : "text-green-700",
        )}
        aria-live="polite"
      >
        {soldOut ? "Out of stock" : variant.stock <= 5 ? `Only ${variant.stock} left` : "In stock"}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
          <button
            type="button"
            className="h-11 w-11 text-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={soldOut || quantity <= 1}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-semibold" aria-live="polite">
            {soldOut ? 0 : quantity}
          </span>
          <button
            type="button"
            className="h-11 w-11 text-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={soldOut || quantity >= maxQty}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          type="button"
          disabled={soldOut}
          className="btn-primary h-11 flex-1 sm:flex-none sm:px-10"
          onClick={() => {
            add(
              {
                variantId: variant.id,
                productId: product.id,
                slug: product.slug,
                name: product.name,
                variantName: variant.name,
                price: variant.price,
                image: product.image,
                stock: variant.stock,
              },
              quantity,
            );
            setAdded(true);
          }}
        >
          {soldOut ? "Sold out" : "Add to cart"}
        </button>
      </div>

      {added && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
          Added to your cart.{" "}
          <Link href="/cart" className="font-semibold underline">
            View cart
          </Link>
        </p>
      )}
    </div>
  );
}
