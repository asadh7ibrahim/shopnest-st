import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import type { Order } from "@/types/db";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser("/orders");
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const orders = (data ?? []) as Pick<Order, "id" | "order_number" | "status" | "total" | "created_at">[];

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">My orders</h1>

      {orders.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="font-semibold">You haven&apos;t placed any orders yet.</p>
          <Link href="/products" className="btn-primary mt-6">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-indigo-300 sm:p-5"
              >
                <div>
                  <p className="font-semibold">Order #{o.order_number}</p>
                  <p className="text-sm text-slate-500">{formatDate(o.created_at)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={o.status} />
                  <span className="font-semibold">{formatPrice(o.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
