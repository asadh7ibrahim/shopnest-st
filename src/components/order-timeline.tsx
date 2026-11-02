import type { OrderStatus } from "@/types/db";
import { cn } from "@/lib/utils";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order placed" },
  { status: "slip_uploaded", label: "Slip uploaded" },
  { status: "approved", label: "Approved" },
  { status: "delivered", label: "Delivered" },
];

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "rejected") {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="status">
        This order was rejected or cancelled. Reserved stock has been released. If you think this is a
        mistake, please contact support.
      </div>
    );
  }
  const current = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
      {STEPS.map((step, i) => {
        const reached = i <= current;
        return (
          <li key={step.status} className="text-center" aria-current={i === current ? "step" : undefined}>
            <div
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                reached ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500",
              )}
            >
              {reached && i < current ? "✓" : i + 1}
            </div>
            <p className={cn("mt-2 text-xs sm:text-sm", reached ? "font-semibold text-slate-900" : "text-slate-500")}>
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
