import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side role check (middleware only checks that a user is signed in).
  await requireAdmin();

  return (
    <div className="container-page grid gap-6 py-6 lg:grid-cols-[200px_1fr] lg:py-8">
      <aside className="lg:sticky lg:top-36 lg:h-fit">
        <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:block">
          Store admin
        </p>
        <AdminNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
