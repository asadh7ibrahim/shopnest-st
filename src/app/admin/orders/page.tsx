import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import { first, toInt } from "@/lib/utils";
import { orderStatusSchema } from "@/lib/validation";
import { StatusBadge, STATUS_LABEL } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types/db";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 20;
const FILTERS: (OrderStatus | "all")[] = ["all", "pending", "slip_uploaded", "approved", "delivered", "rejected"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const parsedStatus = orderStatusSchema.safeParse(first(sp.status));
  const status = parsedStatus.success ? parsedStatus.data : undefined;
  const page = toInt(first(sp.page), 1, 1, 10_000);
  const orderNo = Number.parseInt(first(sp.order) ?? "", 10);

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, order_number, status, total, shipping_name, shipping_phone, created_at", { count: "exact" })
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (Number.isFinite(orderNo)) query = query.eq("order_number", orderNo);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const orders = (data ?? []) as Pick<
    Order,
    "id" | "order_number" | "status" | "total" | "shipping_name" | "shipping_phone" | "created_at"
  >[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <form action="/admin/orders" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="order" className="sr-only">Order number</label>
          <input id="order" name="order" type="number" min={1} placeholder="Order #" defaultValue={Number.isFinite(orderNo) ? orderNo : ""} className="input w-32" />
          <button className="btn-secondary" type="submit">Find</button>
        </form>
      </div>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (f === "all" && !status) || f === status;
          return (
            <Link
              key={f}
              href={f === "all" ? "/admin/orders" : `/admin/orders?status=${f}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium",
                active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white hover:bg-slate-50",
              )}
            >
              {f === "all" ? "All" : STATUS_LABEL[f]}
            </Link>
          );
        })}
      </nav>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th" scope="col">Order</th>
              <th className="th" scope="col">Customer</th>
              <th className="th" scope="col">Date</th>
              <th className="th" scope="col">Status</th>
              <th className="th text-right" scope="col">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="td py-10 text-center text-slate-500">No orders found.</td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="td font-semibold">
                  <Link href={`/admin/orders/${o.id}`} className="text-indigo-700 hover:underline">
                    #{o.order_number}
                  </Link>
                </td>
                <td className="td">
                  {o.shipping_name}
                  <span className="block text-xs text-slate-500">{o.shipping_phone}</span>
                </td>
                <td className="td whitespace-nowrap">{formatDate(o.created_at)}</td>
                <td className="td"><StatusBadge status={o.status} /></td>
                <td className="td text-right font-semibold">{formatPrice(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/admin/orders" page={page} totalPages={totalPages} params={{ status }} />
    </div>
  );
}
