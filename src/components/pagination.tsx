import Link from "next/link";
import { cn } from "@/lib/utils";

export function Pagination({
  basePath,
  params,
  page,
  totalPages,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  // window of up to 5 pages around the current one
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const base =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium";

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} className={cn(base, "border-slate-300 bg-white hover:bg-slate-50")} rel="prev">
          Previous
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            base,
            p === page
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-slate-300 bg-white hover:bg-slate-50",
          )}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link href={href(page + 1)} className={cn(base, "border-slate-300 bg-white hover:bg-slate-50")} rel="next">
          Next
        </Link>
      )}
    </nav>
  );
}
