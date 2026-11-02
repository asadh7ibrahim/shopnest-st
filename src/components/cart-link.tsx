"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartLink() {
  const { count, hydrated } = useCart();
  return (
    <Link
      href="/cart"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
      aria-label={hydrated && count > 0 ? `Cart, ${count} items` : "Cart"}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20 8H6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="20" r="1.2" />
        <circle cx="17" cy="20" r="1.2" />
      </svg>
      {hydrated && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
