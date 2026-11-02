import Link from "next/link";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold tracking-tight">{siteConfig.name}</p>
          <p className="mt-2 max-w-xs text-sm text-slate-600">{siteConfig.description}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/products" className="hover:text-slate-900">All products</Link></li>
            <li><Link href="/cart" className="hover:text-slate-900">Cart</Link></li>
            <li><Link href="/orders" className="hover:text-slate-900">My orders</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Help</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Payment: {siteConfig.payment.method}</li>
            <li>
              <a href={`mailto:${siteConfig.support.email}`} className="hover:text-slate-900">
                {siteConfig.support.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </div>
    </footer>
  );
}
