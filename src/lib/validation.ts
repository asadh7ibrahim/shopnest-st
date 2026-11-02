import { z } from "zod";

const uuid = z.string().uuid();

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters."),
});

export const cartItemSchema = z.object({
  variantId: uuid,
  quantity: z.number().int().min(1).max(100),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Your cart is empty.").max(50),
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{6,20}$/, "Enter a valid phone number."),
  address: z.string().trim().min(5, "Enter your delivery address.").max(300),
  city: z.string().trim().min(2, "Enter your city.").max(100),
  notes: z.string().trim().max(500).optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug may only contain a-z, 0-9 and dashes."),
  description: z.string().trim().max(500).optional(),
});

const money = z.number().min(0).max(10_000_000);

export const variantSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Every variant needs a name.").max(100),
  sku: z.string().trim().max(64).optional(),
  price: money,
  compareAtPrice: money.nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000),
  isActive: z.boolean(),
});

export const productSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Name is required.").max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug may only contain a-z, 0-9 and dashes."),
  description: z.string().trim().max(5000).optional(),
  categoryId: uuid.nullable(),
  isActive: z.boolean(),
  variants: z.array(variantSchema).min(1, "Add at least one variant.").max(100),
});

export const orderStatusSchema = z.enum([
  "pending",
  "slip_uploaded",
  "approved",
  "delivered",
  "rejected",
]);

export { uuid as uuidSchema };
