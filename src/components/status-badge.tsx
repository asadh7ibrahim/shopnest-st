import type { OrderStatus } from "@/types/db";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  slip_uploaded: "Slip uploaded",
  approved: "Approved",
  delivered: "Delivered",
  rejected: "Rejected",
};

const STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  slip_uploaded: "bg-blue-50 text-blue-800 ring-blue-600/20",
  approved: "bg-green-50 text-green-800 ring-green-600/20",
  delivered: "bg-emerald-100 text-emerald-900 ring-emerald-700/20",
  rejected: "bg-red-50 text-red-800 ring-red-600/20",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
