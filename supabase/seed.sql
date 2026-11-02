-- Optional demo data (no images — add them from /admin/products).
-- Safe to run once on an empty catalog.

insert into public.categories (name, slug, description) values
  ('Clothing',    'clothing',    'T-shirts, hoodies and everyday wear'),
  ('Accessories', 'accessories', 'Bags, caps and small essentials'),
  ('Home',        'home',        'Mugs, candles and home goods')
on conflict (slug) do nothing;

with p as (
  insert into public.products (category_id, name, slug, description) values
    ((select id from public.categories where slug = 'clothing'),
     'Classic Cotton T-Shirt', 'classic-cotton-t-shirt',
     'Soft, breathable 100% cotton tee with a relaxed fit. Pre-shrunk and built to last.'),
    ((select id from public.categories where slug = 'clothing'),
     'Everyday Hoodie', 'everyday-hoodie',
     'Midweight fleece hoodie with a kangaroo pocket and ribbed cuffs.'),
    ((select id from public.categories where slug = 'accessories'),
     'Canvas Tote Bag', 'canvas-tote-bag',
     'Heavy-duty canvas tote with reinforced handles and an inner pocket.'),
    ((select id from public.categories where slug = 'home'),
     'Ceramic Mug', 'ceramic-mug',
     'Hand-glazed 350 ml ceramic mug. Dishwasher and microwave safe.')
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.product_variants (product_id, name, sku, price, compare_at_price, stock, position)
select p.id, v.name, v.sku, v.price, v.compare_at, v.stock, v.pos
from p
join (values
  ('classic-cotton-t-shirt', 'White / S',  'TEE-WHT-S',  19.00, null::numeric, 25, 0),
  ('classic-cotton-t-shirt', 'White / M',  'TEE-WHT-M',  19.00, null,          30, 1),
  ('classic-cotton-t-shirt', 'Black / M',  'TEE-BLK-M',  21.00, 25.00,         12, 2),
  ('everyday-hoodie',        'Grey / M',   'HOOD-GRY-M', 49.00, 59.00,          8, 0),
  ('everyday-hoodie',        'Grey / L',   'HOOD-GRY-L', 49.00, 59.00,          0, 1),
  ('canvas-tote-bag',        'Natural',    'TOTE-NAT',   15.00, null,          40, 0),
  ('ceramic-mug',            'Default',    'MUG-001',    12.50, null,          60, 0)
) as v(slug, name, sku, price, compare_at, stock, pos) on v.slug = p.slug;
