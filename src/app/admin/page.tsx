import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import { StatusBadge, STATUS_LABEL } from "@/components/status-badge";
import type { Order, OrderStatus } from "@/types/db";

export const metadata: Metadata = { title: "Dashboard" };

type Stats = {
  revenue: number;
  revenue_30d: number;
  orders_total: number;
  orders_by_status: Partial<Record<OrderStatus, number>>;
  products_count: number;
  customers_count: number;
  low_stock_count: number;
  daily: { day: string; revenue: number; orders: number }[];
};

const STATUSES: OrderStatus[] = ["pending", "slip_uploaded", "approved", "delivered", "rejected"];

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [{ data: statsData, error }, { data: review }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase
      .from("orders")
      .select("id, order_number, status, total, shipping_name, created_at")
      .eq("status", "slip_uploaded")
      .order("created_at", { ascending: true })
      .limit(8),
  ]);

  if (error || !statsData) {
    return (
      <p className="rounded-xl bg-red-50 p-4 text-red-700" role="alert">
        Could not load statistics. Did you run the SQL migration?
      </p>
    );
  }

  const stats = statsData as unknown as Stats;
  const toReview = (review ?? []) as Pick<
    Order,
    "id" | "order_number" | "status" | "total" | "shipping_name" | "created_at"
  >[];
  const maxRevenue = Math.max(1, ...stats.daily.map((d) => Number(d.revenue)));

  const cards = [
    { label: "Revenue (approved + delivered)", value: formatPrice(stats.revenue) },
    { label: "Revenue, last 30 days", value: formatPrice(stats.revenue_30d) },
    { label: "Total orders", value: String(stats.orders_total) },
    { label: "Awaiting review", value: String(stats.orders_by_status.slip_uploaded ?? 0), href: "/admin/orders?status=slip_uploaded" },
    { label: "Active products", value: String(stats.products_count), href: "/admin/products" },
    { label: "Low-stock variants (≤5)", value: String(stats.low_stock_count), href: "/admin/products?stock=low" },
    { label: "Customers", value: String(stats.customers_count) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => {
          const body = (
            <>
              <dt className="text-xs font-medium text-slate-500">{c.label}</dt>
              <dd className="mt-1 text-2xl font-bold">{c.value}</dd>
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="card p-4 transition hover:border-indigo-300">
              {body}
            </Link>
          ) : (
            <div key={c.label} className="card p-4">
              {body}
            </div>
          );
        })}
      </dl>

      <section className="card p-5" aria-labelledby="chart-heading">
        <h2 id="chart-heading" className="font-semibold">Revenue, last 14 days</h2>
        <div className="mt-4 flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label="Bar chart of daily revenue for the last 14 days">
          {stats.daily.map((d) => {
            const h = Math.round((Number(d.revenue) / maxRevenue) * 100);
            return (
              <div key={d.day} className="group flex h-full flex-1 flex-col justify-end">
                <div
                  className="w-full rounded-t bg-indigo-500 transition group-hover:bg-indigo-700"
                  style={{ height: `${Math.max(h, d.revenue > 0 ? 4 : 1)}%` }}
                  title={`${d.day}: ${formatPrice(d.revenue)} · ${d.orders} orders`}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{stats.daily[0]?.day}</span>
          <span>{stats.daily[stats.daily.length - 1]?.day}</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="status-heading">
          <h2 id="status-heading" className="font-semibold">Orders by status</h2>
          <ul className="mt-4 space-y-3">
            {STATUSES.map((s) => {
              const n = stats.orders_by_status[s] ?? 0;
              const pct = stats.orders_total ? (n / stats.orders_total) * 100 : 0;
              return (
                <li key={s}>
                  <Link href={`/admin/orders?status=${s}`} className="block">
                    <div className="flex justify-between text-sm">
                      <span>{STATUS_LABEL[s]}</span>
                      <span className="font-semibold">{n}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-5" aria-labelledby="review-heading">
          <div className="flex items-center justify-between">
            <h2 id="review-heading" className="font-semibold">Payment slips to review</h2>
            <Link href="/admin/orders?status=slip_uploaded" className="text-sm font-medium text-indigo-700 hover:underline">
              View all
            </Link>
          </div>
          {toReview.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Nothing waiting for review. 🎉</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {toReview.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">#{o.order_number} · {o.shipping_name}</p>
                      <p className="text-xs text-slate-500">{formatDate(o.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={o.status} />
                      <span className="text-sm font-semibold">{formatPrice(o.total)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
