import Link from "next/link";
import { siteConfig } from "@/config/site";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { CartLink } from "@/components/cart-link";

export async function SiteHeader() {
  const supabase = await createClient();
  const [profile, { data: categories }] = await Promise.all([
    getProfile(),
    supabase.from("categories").select("name, slug").order("name").limit(12),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3 sm:gap-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white" aria-hidden>
            S
          </span>
          <span className="hidden sm:inline">{siteConfig.name}</span>
        </Link>

        <form action="/products" method="get" role="search" className="mx-auto w-full max-w-xl">
          <label htmlFor="header-search" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              id="header-search"
              name="q"
              type="search"
              placeholder="Search products…"
              maxLength={80}
              className="input rounded-full bg-slate-100 pl-10 shadow-none"
            />
          </div>
        </form>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
          {profile ? (
            <>
              {profile.role === "admin" && (
                <Link href="/admin" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 sm:block">
                  Admin
                </Link>
              )}
              <Link href="/orders" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:block">
                My orders
              </Link>
              <form action={signOut}>
                <button type="submit" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Sign in
            </Link>
          )}
          <CartLink />
        </nav>
      </div>

      {/* Category bar */}
      <div className="border-t border-slate-100 bg-white">
        <nav
          aria-label="Categories"
          className="container-page flex gap-1 overflow-x-auto py-2 text-sm [scrollbar-width:none]"
        >
          <Link href="/products" className="whitespace-nowrap rounded-full px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100">
            All products
          </Link>
          {(categories ?? []).map((c: { name: string; slug: string }) => (
            <Link
              key={c.slug}
              href={`/products?category=${c.slug}`}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {c.name}
            </Link>
          ))}
          {profile && (
            <Link href="/orders" className="whitespace-nowrap rounded-full px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 sm:hidden">
              My orders
            </Link>
          )}
          {profile?.role === "admin" && (
            <Link href="/admin" className="whitespace-nowrap rounded-full px-3 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-50 sm:hidden">
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
