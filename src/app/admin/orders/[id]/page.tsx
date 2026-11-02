import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import { uuidSchema } from "@/lib/validation";
import { StatusBadge } from "@/components/status-badge";
import { OrderTimeline } from "@/components/order-timeline";
import { OrderActions } from "@/components/admin/order-actions";
import { ProductImage } from "@/components/product-image";
import type { Order, OrderItem } from "@/types/db";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const order = data as unknown as Order & { order_items: OrderItem[] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", order.user_id)
    .maybeSingle();

  let slipUrl: string | null = null;
  if (order.payment_slip_path) {
    const { data: signed } = await supabase.storage
      .from("payment-slips")
      .createSignedUrl(order.payment_slip_path, 600);
    slipUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm font-medium text-indigo-700 hover:underline">
        ← All orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.order_number}</h1>
          <p className="text-sm text-slate-500">Placed {formatDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="card p-5">
        <OrderTimeline status={order.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5" aria-labelledby="slip-heading">
          <h2 id="slip-heading" className="font-semibold">Payment slip</h2>
          {slipUrl ? (
            <>
              {order.slip_uploaded_at && (
                <p className="text-sm text-slate-500">Uploaded {formatDate(order.slip_uploaded_at)}</p>
              )}
              <a href={slipUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                {/* Signed, expiring URL: not suitable for next/image optimisation */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slipUrl} alt="Customer payment slip" className="max-h-[28rem] w-full rounded-xl border border-slate-200 object-contain" />
              </a>
              <p className="mt-2 text-xs text-slate-500">Link expires in 10 minutes. Click the image to open full size.</p>
            </>
          ) : (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              No slip uploaded yet. Amount expected: <strong>{formatPrice(order.total)}</strong>.
            </p>
          )}
        </section>

        <section className="card p-5" aria-labelledby="actions-heading">
          <h2 id="actions-heading" className="font-semibold">Update status</h2>
          <p className="mb-4 text-sm text-slate-500">
            Expected payment: <strong>{formatPrice(order.total)}</strong> · reference ORDER-{order.order_number}
          </p>
          <OrderActions orderId={order.id} status={order.status} />
          {order.admin_note && (
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              <span className="font-semibold">Last note:</span> {order.admin_note}
            </p>
          )}
        </section>
      </div>

      <section className="card divide-y divide-slate-100">
        <h2 className="p-5 font-semibold">Items</h2>
        <ul className="divide-y divide-slate-100">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 p-4 sm:px-5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <ProductImage path={item.image_path} alt={item.product_name} sizes="56px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.product_name}</p>
                <p className="text-sm text-slate-500">
                  {item.variant_name} · {formatPrice(item.unit_price)} × {item.quantity}
                </p>
              </div>
              <p className="font-semibold">{formatPrice(item.unit_price * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="flex justify-between p-5">
          <span className="font-semibold">Total</span>
          <span className="font-bold">{formatPrice(order.total)}</span>
        </div>
      </section>

      <section className="card p-5 text-sm">
        <h2 className="font-semibold">Customer &amp; delivery</h2>
        <address className="mt-2 not-italic leading-relaxed text-slate-700">
          {order.shipping_name}
          {profile?.full_name && profile.full_name !== order.shipping_name ? ` (account: ${profile.full_name})` : ""}
          <br />
          {order.shipping_address}
          <br />
          {order.shipping_city}
          <br />
          <a href={`tel:${order.shipping_phone}`} className="text-indigo-700 hover:underline">{order.shipping_phone}</a>
        </address>
        {order.notes && <p className="mt-3 text-slate-600">Customer notes: {order.notes}</p>}
      </section>
    </div>
  );
}
