"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { useCartSync } from "@/hooks/use-cart-sync";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "@/components/product-image";

export function CartView() {
  const { items, hydrated, subtotal, setQuantity, remove, clear } = useCart();
  useCartSync();

  if (!hydrated) {
    return <div className="card h-48 animate-pulse bg-slate-100" aria-busy="true" />;
  }

  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-lg font-semibold">Your cart is empty</p>
        <p className="mt-1 text-slate-500">Looks like you haven&apos;t added anything yet.</p>
        <Link href="/products" className="btn-primary mt-6">
          Start shopping
        </Link>
      </div>
    );
  }

  const hasUnavailable = items.some((i) => i.stock < 1);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <ul className="card divide-y divide-slate-100">
        {items.map((item) => {
          const unavailable = item.stock < 1;
          return (
            <li key={item.variantId} className="flex gap-4 p-4 sm:p-5">
              <Link
                href={`/products/${item.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100"
              >
                <ProductImage path={item.image} alt={item.name} sizes="96px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${item.slug}`} className="line-clamp-2 font-semibold hover:underline">
                      {item.name}
                    </Link>
                    <p className="text-sm text-slate-500">{item.variantName}</p>
                  </div>
                  <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                </div>

                {unavailable && (
                  <p className="mt-1 text-sm font-medium text-red-600">Out of stock — remove to continue</p>
                )}

                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="inline-flex items-center rounded-lg border border-slate-300">
                    <button
                      type="button"
                      className="h-9 w-9 hover:bg-slate-50 disabled:opacity-40"
                      onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      −
                    </button>
                    <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      className="h-9 w-9 hover:bg-slate-50 disabled:opacity-40"
                      onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                      disabled={unavailable || item.quantity >= item.stock}
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.variantId)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-36">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Subtotal</dt>
            <dd className="font-medium">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Delivery</dt>
            <dd className="text-slate-500">Confirmed after approval</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold">{formatPrice(subtotal)}</dd>
          </div>
        </dl>
        {hasUnavailable ? (
          <button className="btn-primary w-full" disabled>
            Remove unavailable items
          </button>
        ) : (
          <Link href="/checkout" className="btn-primary w-full">
            Proceed to checkout
          </Link>
        )}
        <button type="button" onClick={clear} className="w-full text-center text-sm text-slate-500 hover:text-slate-800">
          Clear cart
        </button>
      </aside>
    </div>
  );
}
