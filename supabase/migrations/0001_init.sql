-- =====================================================================
-- ShopNest — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Security model
--   * Row Level Security (RLS) is ON for every table.
--   * Customers can only read their own orders; they cannot write to
--     orders/order_items directly. All writes go through SECURITY DEFINER
--     functions that validate input, prices and stock on the server.
--   * Admin = profiles.role = 'admin'. Role can NOT be changed by clients
--     (column-level grants), only via SQL editor / service role.
--   * Files live in Supabase Storage (never in the database). Payment slips
--     are in a PRIVATE bucket, product images in a public bucket.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------- Types ----------------------------------------------------
create type public.user_role as enum ('customer', 'admin');
create type public.order_status as enum
  ('pending', 'slip_uploaded', 'approved', 'delivered', 'rejected');

-- ---------- Helpers --------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Profiles -------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text check (char_length(full_name) <= 100),
  phone      text check (char_length(phone) <= 20),
  role       public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- Role helper (SECURITY DEFINER avoids RLS recursion on profiles)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Create a profile row for every new auth user. Role is NEVER taken from
-- user-controlled metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Catalog --------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 500),
  created_at  timestamptz not null default now()
);

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name        text not null check (char_length(name) between 1 and 160),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 5000),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_active_created_idx on public.products (is_active, created_at desc);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 100),
  sku              text unique check (char_length(sku) <= 64),
  price            numeric(12, 2) not null check (price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  stock            integer not null default 0 check (stock >= 0),
  is_active        boolean not null default true,
  position         integer not null default 0,
  created_at       timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id, position);

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path       text not null,                 -- object path inside the product-images bucket
  alt        text check (char_length(alt) <= 200),
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, position);

-- Listing view used by the storefront (search, filters, sorting, pagination).
-- security_invoker => RLS of the underlying tables applies to the caller.
create view public.product_listing with (security_invoker = true) as
select
  p.id,
  p.name,
  p.slug,
  p.description,
  p.created_at,
  p.category_id,
  c.name as category_name,
  c.slug as category_slug,
  min(v.price)                       as min_price,
  max(v.price)                       as max_price,
  coalesce(sum(v.stock), 0)::integer as total_stock,
  (
    select pi.path
    from public.product_images pi
    where pi.product_id = p.id
    order by pi.position, pi.created_at
    limit 1
  ) as image_path
from public.products p
left join public.categories c on c.id = p.category_id
left join public.product_variants v on v.product_id = p.id and v.is_active
where p.is_active
group by p.id, c.id;

-- ---------- Orders ---------------------------------------------------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      bigint generated always as identity (start with 1001) unique,
  user_id           uuid not null references auth.users (id) on delete restrict,
  status            public.order_status not null default 'pending',
  subtotal          numeric(12, 2) not null default 0 check (subtotal >= 0),
  total             numeric(12, 2) not null default 0 check (total >= 0),
  shipping_name     text not null,
  shipping_phone    text not null,
  shipping_address  text not null,
  shipping_city     text not null,
  notes             text check (char_length(notes) <= 500),
  payment_slip_path text,                   -- object path inside the payment-slips bucket
  slip_uploaded_at  timestamptz,
  admin_note        text check (char_length(admin_note) <= 500),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  variant_id   uuid references public.product_variants (id) on delete set null,
  product_name text not null,               -- snapshots: survive product edits/deletes
  variant_name text not null,
  unit_price   numeric(12, 2) not null check (unit_price >= 0),
  quantity     integer not null check (quantity > 0),
  image_path   text
);
create index order_items_order_idx on public.order_items (order_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images   enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;

-- profiles: read own (admins read all); users may only edit name/phone
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- catalog: public read, admin write
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy products_read on public.products for select to anon, authenticated
  using (is_active or public.is_admin());
create policy products_admin on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy variants_read on public.product_variants for select to anon, authenticated
  using (
    public.is_admin()
    or (is_active and exists (
      select 1 from public.products p where p.id = product_id and p.is_active))
  );
create policy variants_admin on public.product_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy images_read on public.product_images for select to anon, authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );
create policy images_admin on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke insert, update, delete on public.categories, public.products,
  public.product_variants, public.product_images from anon;

-- orders: customers read their own, admins read all. NO direct writes.
create policy orders_select on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy order_items_select on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = (select auth.uid()) or public.is_admin())
  ));
revoke insert, update, delete on public.orders, public.order_items from anon, authenticated;
revoke all on public.orders, public.order_items from anon;

grant select on public.product_listing to anon, authenticated;

-- =====================================================================
-- Order functions (SECURITY DEFINER, validated server-side)
-- =====================================================================

-- Create an order: prices and stock come from the DB, never from the client.
-- Stock is locked and decremented atomically, so overselling is impossible.
create or replace function public.create_order(
  p_items   jsonb,
  p_name    text,
  p_phone   text,
  p_address text,
  p_city    text,
  p_notes   text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid       uuid := auth.uid();
  v_order_id  uuid;
  v_subtotal  numeric(12, 2) := 0;
  v_expected  integer;
  v_found     integer := 0;
  r           record;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'invalid_items';
  end if;

  if char_length(coalesce(trim(p_name), ''))    not between 2 and 100
     or char_length(coalesce(trim(p_phone), ''))   not between 6 and 20
     or char_length(coalesce(trim(p_address), '')) not between 5 and 300
     or char_length(coalesce(trim(p_city), ''))    not between 2 and 100
     or char_length(coalesce(p_notes, '')) > 500 then
    raise exception 'invalid_shipping';
  end if;

  select count(distinct (e ->> 'variant_id')) into v_expected
  from jsonb_array_elements(p_items) e;

  insert into public.orders
    (user_id, shipping_name, shipping_phone, shipping_address, shipping_city, notes)
  values
    (v_uid, trim(p_name), trim(p_phone), trim(p_address), trim(p_city), nullif(trim(coalesce(p_notes, '')), ''))
  returning id into v_order_id;

  for r in
    select
      v.id    as variant_id,
      g.qty   as qty,
      v.price as price,
      v.stock as stock,
      v.name  as variant_name,
      p.name  as product_name,
      (select pi.path from public.product_images pi
        where pi.product_id = p.id order by pi.position, pi.created_at limit 1) as image_path
    from (
      select (e ->> 'variant_id')::uuid as variant_id,
             sum((e ->> 'quantity')::integer)::integer as qty
      from jsonb_array_elements(p_items) e
      group by 1
    ) g
    join public.product_variants v on v.id = g.variant_id and v.is_active
    join public.products p on p.id = v.product_id and p.is_active
    order by v.id
    for update of v
  loop
    if r.qty < 1 or r.qty > 100 then raise exception 'invalid_items'; end if;
    if r.stock < r.qty then
      raise exception 'insufficient_stock:%', r.product_name;
    end if;

    update public.product_variants set stock = stock - r.qty where id = r.variant_id;

    insert into public.order_items
      (order_id, variant_id, product_name, variant_name, unit_price, quantity, image_path)
    values
      (v_order_id, r.variant_id, r.product_name, r.variant_name, r.price, r.qty, r.image_path);

    v_subtotal := v_subtotal + r.price * r.qty;
    v_found := v_found + 1;
  end loop;

  -- some requested variant was missing / inactive: abort (rolls everything back)
  if v_found <> v_expected then raise exception 'invalid_items'; end if;

  update public.orders set subtotal = v_subtotal, total = v_subtotal where id = v_order_id;
  return v_order_id;
end $$;

-- Customer attaches an uploaded payment slip to their own order.
create or replace function public.attach_payment_slip(p_order_id uuid, p_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := auth.uid();
  v_status public.order_status;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select status into v_status from public.orders
  where id = p_order_id and user_id = v_uid for update;
  if not found then raise exception 'order_not_found'; end if;

  if v_status not in ('pending', 'slip_uploaded') then
    raise exception 'invalid_status';
  end if;

  if p_path is null or not starts_with(p_path, v_uid::text || '/' || p_order_id::text || '/') then
    raise exception 'invalid_path';
  end if;

  update public.orders
     set payment_slip_path = p_path,
         slip_uploaded_at  = now(),
         status            = 'slip_uploaded'
   where id = p_order_id;
end $$;

-- Admin changes order status. Allowed transitions:
--   pending       -> rejected
--   slip_uploaded -> approved | rejected
--   approved      -> delivered | rejected
-- Rejecting an order puts the reserved stock back.
create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_status   public.order_status,
  p_note     text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_old public.order_status;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  select status into v_old from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  if not (
       (v_old = 'pending'       and p_status = 'rejected')
    or (v_old = 'slip_uploaded' and p_status in ('approved', 'rejected'))
    or (v_old = 'approved'      and p_status in ('delivered', 'rejected'))
  ) then
    raise exception 'invalid_transition';
  end if;

  if p_status = 'rejected' then
    update public.product_variants v
       set stock = v.stock + oi.quantity
      from public.order_items oi
     where oi.order_id = p_order_id and oi.variant_id = v.id;
  end if;

  update public.orders
     set status     = p_status,
         admin_note = coalesce(nullif(left(trim(coalesce(p_note, '')), 500), ''), admin_note)
   where id = p_order_id;
end $$;

-- Dashboard statistics (admin only)
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'revenue', coalesce((select sum(total) from public.orders
                          where status in ('approved', 'delivered')), 0),
    'revenue_30d', coalesce((select sum(total) from public.orders
                          where status in ('approved', 'delivered')
                            and created_at > now() - interval '30 days'), 0),
    'orders_total', (select count(*) from public.orders),
    'orders_by_status', coalesce((
        select jsonb_object_agg(s.status::text, s.c)
        from (select status, count(*) as c from public.orders group by status) s
      ), '{}'::jsonb),
    'products_count', (select count(*) from public.products where is_active),
    'customers_count', (select count(*) from public.profiles where role = 'customer'),
    'low_stock_count', (select count(*) from public.product_variants v
                          join public.products p on p.id = v.product_id
                         where v.is_active and p.is_active and v.stock <= 5),
    'daily', coalesce((
        select jsonb_agg(
                 jsonb_build_object('day', d.day, 'revenue', coalesce(o.rev, 0), 'orders', coalesce(o.cnt, 0))
                 order by d.day)
        from (select (current_date - g)::date as day from generate_series(0, 13) g) d
        left join (
          select created_at::date as day,
                 sum(case when status in ('approved', 'delivered') then total else 0 end) as rev,
                 count(*) as cnt
          from public.orders
          where created_at >= current_date - 13
          group by 1
        ) o on o.day = d.day
      ), '[]'::jsonb)
  ) into result;

  return result;
end $$;

revoke all on function public.create_order(jsonb, text, text, text, text, text) from public, anon;
revoke all on function public.attach_payment_slip(uuid, text)                   from public, anon;
revoke all on function public.admin_set_order_status(uuid, public.order_status, text) from public, anon;
revoke all on function public.admin_stats()                                     from public, anon;
grant execute on function public.create_order(jsonb, text, text, text, text, text) to authenticated;
grant execute on function public.attach_payment_slip(uuid, text)                   to authenticated;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.admin_stats()                                     to authenticated;

-- =====================================================================
-- Storage
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true,  5242880, array['image/webp', 'image/jpeg', 'image/png']),
  ('payment-slips',  'payment-slips',  false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- product-images: public read (public bucket), admin-only write
create policy product_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy product_images_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy product_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- payment-slips: private. Path convention: <user_id>/<order_id>/<timestamp>.webp
create policy slips_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-slips'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy slips_select_own_or_admin on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-slips'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );
create policy slips_delete_own on storage.objects for delete to authenticated
  using (
    bucket_id = 'payment-slips'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
