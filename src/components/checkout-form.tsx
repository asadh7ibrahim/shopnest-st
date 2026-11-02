"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { placeOrder } from "@/app/actions/checkout";
import { useCart } from "@/lib/cart";
import { useCartSync } from "@/hooks/use-cart-sync";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "@/components/product-image";

export function CheckoutForm({ defaults }: { defaults: { name: string; phone: string } }) {
  const router = useRouter();
  const { items, hydrated, subtotal, clear } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  useCartSync();

  if (!hydrated) return <div className="card h-48 animate-pulse bg-slate-100" aria-busy="true" />;

  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-lg font-semibold">Your cart is empty</p>
        <Link href="/products" className="btn-primary mt-6">
          Continue shopping
        </Link>
      </div>
    );
  }

  const unavailable = items.some((i) => i.stock < 1);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      address: String(fd.get("address") ?? ""),
      city: String(fd.get("city") ?? ""),
      notes: String(fd.get("notes") ?? ""),
    };

    startTransition(async () => {
      const result = await placeOrder(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clear();
      router.push(`/orders/${result.orderId}?placed=1`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Delivery details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="label">Full name</label>
            <input id="name" name="name" required minLength={2} maxLength={100} defaultValue={defaults.name} autoComplete="name" className="input" />
          </div>
          <div>
            <label htmlFor="phone" className="label">Phone</label>
            <input id="phone" name="phone" type="tel" required maxLength={20} defaultValue={defaults.phone} autoComplete="tel" className="input" />
          </div>
        </div>
        <div>
          <label htmlFor="address" className="label">Address</label>
          <textarea id="address" name="address" required minLength={5} maxLength={300} rows={3} autoComplete="street-address" className="input" />
        </div>
        <div>
          <label htmlFor="city" className="label">City</label>
          <input id="city" name="city" required minLength={2} maxLength={100} autoComplete="address-level2" className="input" />
        </div>
        <div>
          <label htmlFor="notes" className="label">Order notes (optional)</label>
          <textarea id="notes" name="notes" maxLength={500} rows={2} className="input" />
        </div>

        <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900">
          <p className="font-semibold">How payment works</p>
          <p className="mt-1">
            After placing your order you&apos;ll see our bank details. Transfer the total, then upload your
            payment slip on the order page. We&apos;ll approve it and ship your order.
          </p>
        </div>
      </div>

      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-36">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {items.map((i) => (
            <li key={i.variantId} className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <ProductImage path={i.image} alt={i.name} sizes="56px" />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="line-clamp-1 font-medium">{i.name}</p>
                <p className="text-slate-500">{i.variantName} × {i.quantity}</p>
              </div>
              <p className="text-sm font-medium">{formatPrice(i.price * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-slate-200 pt-4 text-base">
          <span className="font-semibold">Total</span>
          <span className="font-bold">{formatPrice(subtotal)}</span>
        </div>

        {unavailable && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            Some items are out of stock. <Link href="/cart" className="font-semibold underline">Update your cart</Link>.
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={pending || unavailable}>
          {pending ? "Placing order…" : "Place order"}
        </button>
        <p className="text-center text-xs text-slate-500">Prices and stock are re-checked when you place the order.</p>
      </aside>
    </form>
  );
}
