export default function Loading() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-live="polite">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
