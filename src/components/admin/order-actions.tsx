"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setOrderStatus } from "@/app/actions/admin-orders";
import type { OrderStatus } from "@/types/db";

const NEXT: Record<OrderStatus, { status: OrderStatus; label: string; danger?: boolean; confirm?: string }[]> = {
  pending: [
    { status: "rejected", label: "Cancel / reject order", danger: true, confirm: "Reject this order and return its stock?" },
  ],
  slip_uploaded: [
    { status: "approved", label: "Approve payment" },
    { status: "rejected", label: "Reject", danger: true, confirm: "Reject this order and return its stock?" },
  ],
  approved: [
    { status: "delivered", label: "Mark as delivered" },
    { status: "rejected", label: "Reject / refund", danger: true, confirm: "Reject this order and return its stock?" },
  ],
  delivered: [],
  rejected: [],
};

export function OrderActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const actions = NEXT[status];

  if (actions.length === 0) {
    return <p className="text-sm text-slate-500">This order is final — no further actions.</p>;
  }

  function run(next: OrderStatus, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      const res = await setOrderStatus({ orderId, status: next, note: note || undefined });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="note" className="label">Note to customer (optional)</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          className="input"
          placeholder="e.g. Slip unclear, please upload again…"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.status}
            type="button"
            disabled={pending}
            onClick={() => run(a.status, a.confirm)}
            className={a.danger ? "btn-danger" : "btn-primary"}
          >
            {pending ? "Saving…" : a.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
