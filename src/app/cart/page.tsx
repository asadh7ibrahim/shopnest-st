import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Your cart</h1>
      <CartView />
    </div>
  );
}
