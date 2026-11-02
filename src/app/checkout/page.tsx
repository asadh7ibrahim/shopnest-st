import type { Metadata } from "next";
import { getProfile, requireUser } from "@/lib/auth";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  await requireUser("/checkout");
  const profile = await getProfile();

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Checkout</h1>
      <CheckoutForm defaults={{ name: profile?.full_name ?? "", phone: profile?.phone ?? "" }} />
    </div>
  );
}
