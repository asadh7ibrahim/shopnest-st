"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validation";
import type { ActionResult } from "@/types/db";

/**
 * Creates an order. Prices, stock checks and stock decrement all happen inside the
 * `create_order` database function — the client only sends variant ids + quantities.
 */
export async function placeOrder(input: unknown): Promise<ActionResult<{ orderId: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in to place an order." };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_items: d.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    p_name: d.name,
    p_phone: d.phone,
    p_address: d.address,
    p_city: d.city,
    p_notes: d.notes ?? null,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.startsWith("insufficient_stock:")) {
      const name = msg.slice("insufficient_stock:".length);
      return {
        ok: false,
        error: `Sorry, "${name}" doesn't have enough stock for the quantity in your cart. Please update your cart.`,
      };
    }
    if (msg.includes("invalid_items")) {
      return {
        ok: false,
        error: "Some items in your cart are no longer available. Please review your cart.",
      };
    }
    console.error("create_order failed", error);
    return { ok: false, error: "We couldn't place your order. Please try again." };
  }

  revalidatePath("/orders");
  revalidatePath("/admin", "layout");
  return { ok: true, orderId: data as string };
}
