# ShopNest — Next.js + Supabase online store

A modern, responsive e-commerce store with **bank-transfer checkout**: customers place an order, pay by transfer, and **upload a payment slip**; an admin reviews it and moves the order through its lifecycle.

**Stack:** Next.js 15 (App Router, Server Components & Server Actions) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · sharp · zod · deploys on Vercel.

> ⚠️ **First run:** this project was generated without access to the npm registry, so it has not been compiled yet. Run `npm install && npm run typecheck && npm run build` once and fix anything the compiler reports (it should be little to nothing).

---

## Features

**Storefront**
- Home page, category bar, product grid with **search, category / price / in-stock filters, sorting and pagination** (plain GET form → shareable URLs, works without JS)
- Product page: **multiple images** gallery, **variants** (e.g. "Black / M") with own price, compare-at price, SKU and **stock**
- Cart (localStorage, re-validated against the server), checkout, **order tracking**
- Order **status**: `pending → slip_uploaded → approved → delivered` (or `rejected`)
- Payment slip upload with **client-side + server-side compression**
- SEO: metadata, Open Graph, JSON-LD product data, sitemap, robots.txt · Accessible (labels, skip link, focus states, reduced motion)

**Admin (`/admin`)**
- Dashboard: revenue, 30-day revenue, orders by status, 14-day revenue chart, low-stock count, slips awaiting review
- Products: create / edit / hide / delete, variants & stock, upload / delete / reorder images, search, low-stock filter
- Categories: create / rename / delete
- Orders: filter by status, find by number, view slip (private, signed URL), approve / reject / mark delivered, note to customer

---

## Setup

### 1. Supabase
1. Create a project at <https://supabase.com>.
2. **SQL Editor →** paste and run `supabase/migrations/0001_init.sql` (tables, RLS, functions, storage buckets & policies).
3. *(Optional)* run `supabase/seed.sql` for demo categories/products.
4. **Authentication → URL Configuration:** set *Site URL* to your site (`http://localhost:3000` for dev, your Vercel URL for prod) and add `…/auth/callback` to *Redirect URLs*.
5. **Authentication → Providers → Email:** keep "Confirm email" on for production (turn off for quick local testing).
6. **Storage:** you should now see two buckets: `product-images` (public) and `payment-slips` (**private**).

### 2. Local development
```bash
cp .env.example .env.local      # fill in the Supabase URL + anon key
npm install
npm run dev                     # http://localhost:3000
```

### 3. Create your admin account
Register on the site, then run this once in the Supabase SQL editor:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```
(Roles can't be changed from the app — on purpose.) You'll now see **Admin** in the header.

### 4. Customise
- `src/config/site.ts` — store name, **bank details & payment instructions** shown to customers.
- `NEXT_PUBLIC_CURRENCY` in env — e.g. `USD`, `PKR`, `MVR`.

### 5. Deploy to Vercel
1. Push to GitHub → *Import* in Vercel.
2. Add the env vars from `.env.example` (set `NEXT_PUBLIC_SITE_URL` to your production URL).
3. Deploy. Then update the Supabase *Site URL / Redirect URLs* to the production URL.

---

## Image compression (so storage & DB stay small)

Images are **never stored in the database** — only a short file path is. Files go to Supabase Storage, and are compressed twice:

| Step | Where | What |
|---|---|---|
| 1 | Browser (`src/lib/image-client.ts`) | Resize (product ≤1600px, slip ≤1800px), re-encode to **WebP**, loop quality down until ≤ ~600–900 KB. A 10 MB phone photo becomes a few hundred KB *before* upload (also keeps you under Vercel's 4.5 MB request limit). |
| 2 | Server (`src/lib/image.ts`, sharp) | Verifies the real format from the bytes, blocks decompression bombs, applies EXIF rotation then **strips all metadata (GPS etc.)**, resizes, re-encodes WebP. |

Product images get immutable 1-year cache headers and are served through `next/image` (AVIF/WebP, responsive sizes).

---

## Order flow

| Status | Meaning | Who moves it |
|---|---|---|
| `pending` | Order placed, stock reserved, awaiting payment | system |
| `slip_uploaded` | Customer uploaded a slip | customer (can replace slip until reviewed) |
| `approved` | Payment verified | admin |
| `delivered` | Order delivered | admin |
| `rejected` | Cancelled / payment invalid — **stock is returned** | admin |

Allowed transitions are enforced **in the database** (`admin_set_order_status`): `pending→rejected`, `slip_uploaded→approved/rejected`, `approved→delivered/rejected`.

---

## Security design

- **Row Level Security on every table.** Customers can only read their own orders; there is **no service-role key** anywhere in the app — every query runs as the signed-in user.
- **Orders are created by a database function** (`create_order`): prices and stock come from the DB (client-sent prices are ignored), stock rows are locked and decremented atomically → no overselling, no price tampering.
- **Admin is enforced 3 ways:** middleware (must be signed in) → admin layout (role check, 404 otherwise) → every admin Server Action (`requireAdmin()`) → RLS/`is_admin()` in the database.
- Users **cannot change their own role** (column-level grants; only `full_name`/`phone` are updatable).
- **Payment slips are in a private bucket**, path = `<user_id>/<order_id>/…`, storage policies restrict access to the owner + admins; admins/customers view them through **10-minute signed URLs**.
- Uploads validated by magic bytes (not file name/MIME header), size-limited, re-encoded, metadata stripped.
- Input validated with **zod** on the server; search input sanitised against filter injection; redirects restricted to same-site paths (no open redirect).
- Security headers: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy. Session refreshed via `getUser()` (validated with Supabase, not just decoded from the cookie). Generic login errors (no user enumeration).
- Server Actions have built-in CSRF/origin protection in Next.js.

### Hardening ideas for later
- Rate limiting for login/registration/uploads (Vercel WAF, or Upstash Ratelimit) and CAPTCHA (e.g. Turnstile) on sign-up. Supabase Auth already rate-limits e-mail flows.
- Nonce-based CSP via middleware to drop `'unsafe-inline'` for scripts.
- E-mail notifications on order status changes (Supabase Edge Function / Resend).
- Audit log table for admin actions; admin 2FA (Supabase MFA).

---

## Project structure

```
supabase/migrations/0001_init.sql   schema, RLS, RPC functions, storage policies
supabase/seed.sql                   optional demo data
src/middleware.ts                   session refresh + auth gate
src/app/                            routes (storefront, /admin, /orders, /checkout …)
src/app/actions/                    Server Actions (auth, checkout, orders, admin-*)
src/components/                     UI (admin/ for back-office components)
src/lib/                            supabase clients, auth guards, validation, image pipeline, cart
src/config/site.ts                  store name & bank details
```

## Notes & limits
- Guest checkout is intentionally disabled — customers sign in so orders, slips and RLS are tied to an account.
- Delivery fee is not modelled (total = subtotal); add a `shipping_cost` column and include it in `create_order` if you need it.
- Supabase free tier: 1 GB storage — with compression (~100–400 KB per image) that is thousands of images.
- Vercel Hobby: Server Action request bodies are capped at 4.5 MB; the app stays well below that thanks to client compression.
