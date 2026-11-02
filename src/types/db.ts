export type OrderStatus =
  | "pending"
  | "slip_uploaded"
  | "approved"
  | "delivered"
  | "rejected";

export type UserRole = "customer" | "admin";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type Variant = {
  id: string;
  product_id?: string;
  name: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  is_active: boolean;
  position: number;
};

export type ProductImage = {
  id: string;
  path: string;
  alt: string | null;
  position: number;
};

export type ListingProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  min_price: number | null;
  max_price: number | null;
  total_stock: number;
  image_path: string | null;
};

export type OrderItem = {
  id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string;
  unit_price: number;
  quantity: number;
  image_path: string | null;
};

export type Order = {
  id: string;
  order_number: number;
  user_id: string;
  status: OrderStatus;
  subtotal: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  notes: string | null;
  payment_slip_path: string | null;
  slip_uploaded_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type ActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };
