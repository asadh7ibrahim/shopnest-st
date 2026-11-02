import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import { uuidSchema } from "@/lib/validation";
import { StatusBadge } from "@/components/status-badge";
import { OrderTimeline } from "@/components/order-timeline";
import { SlipUploader } from "@/components/slip-uploader";
import { ProductImage } from "@/components/product-image";
import type { Order, OrderItem } from "@/types/db";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const user = await requireUser(`/orders/${id}`);
  const justPlaced = (await searchParams).placed === "1";

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) notFound();

  const order = data as unknown as Order & { order_items: OrderItem[] };

  // Private bucket -> short-lived signed URL (10 min), generated per request.
  let slipUrl: string | null = null;
  if (order.payment_slip_path) {
    const { data: signed } = await supabase.storage
      .from("payment-slips")
      .createSignedUrl(order.payment_slip_path, 600);
    slipUrl = signed?.signedUrl ?? null;
  }

  const canUpload = order.status === "pending" || order.status === "slip_uploaded";
  const p = siteConfig.payment;

  return (
    <div className="container-page max-w-4xl py-8">
      <Link href="/orders" className="text-sm font-medium text-indigo-700 hover:underline">
        ← All orders
      </Link>

      {justPlaced && (
        <p className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">
          Thank you! Your order has been placed. Complete the payment below and upload your slip.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Order #{order.order_number}</h1>
          <p className="text-sm text-slate-500">Placed {formatDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="card mt-6 p-5 sm:p-6">
        <OrderTimeline status={order.status} />
        {order.admin_note && (
          <p className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <span className="font-semibold">Note from the store:</span> {order.admin_note}
          </p>
        )}
      </div>

      {canUpload && (
        <section className="card mt-6 space-y-5 p-5 sm:p-6" aria-labelledby="payment-heading">
          <h2 id="payment-heading" className="text-lg font-semibold">
            Payment
          </h2>
          <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Method</dt><dd className="font-medium">{p.method}</dd></div>
            <div><dt className="text-slate-500">Amount to pay</dt><dd className="text-base font-bold">{formatPrice(order.total)}</dd></div>
            <div><dt className="text-slate-500">Bank</dt><dd className="font-medium">{p.bankName}</dd></div>
            <div><dt className="text-slate-500">Account name</dt><dd className="font-medium">{p.accountName}</dd></div>
            <div><dt className="text-slate-500">Account number</dt><dd className="font-mono font-medium">{p.accountNumber}</dd></div>
            <div><dt className="text-slate-500">Reference</dt><dd className="font-mono font-medium">ORDER-{order.order_number}</dd></div>
          </dl>
          <p className="text-sm text-slate-600">{p.instructions}</p>
          <SlipUploader orderId={order.id} hasSlip={!!order.payment_slip_path} />
        </section>
      )}

      {slipUrl && (
        <section className="card mt-6 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Your payment slip</h2>
          {order.slip_uploaded_at && (
            <p className="text-sm text-slate-500">Uploaded {formatDate(order.slip_uploaded_at)}</p>
          )}
          {/* Signed, expiring URL: not suitable for next/image optimisation */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slipUrl}
            alt="Uploaded payment slip"
            className="mt-4 max-h-96 rounded-xl border border-slate-200 object-contain"
          />
        </section>
      )}

      <section className="card mt-6 divide-y divide-slate-100" aria-labelledby="items-heading">
        <h2 id="items-heading" className="p-5 text-lg font-semibold sm:px-6">
          Items
        </h2>
        <ul className="divide-y divide-slate-100">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 p-4 sm:px-6">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <ProductImage path={item.image_path} alt={item.product_name} sizes="64px" />
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
        <div className="flex justify-between p-5 text-base sm:px-6">
          <span className="font-semibold">Total</span>
          <span className="font-bold">{formatPrice(order.total)}</span>
        </div>
      </section>

      <section className="card mt-6 p-5 text-sm sm:p-6">
        <h2 className="text-lg font-semibold">Delivery</h2>
        <address className="mt-2 not-italic leading-relaxed text-slate-700">
          {order.shipping_name}
          <br />
          {order.shipping_address}
          <br />
          {order.shipping_city}
          <br />
          {order.shipping_phone}
        </address>
        {order.notes && <p className="mt-3 text-slate-500">Notes: {order.notes}</p>}
      </section>
    </div>
  );
}
