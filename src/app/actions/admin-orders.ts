"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { orderStatusSchema, uuidSchema } from "@/lib/validation";
import type { ActionResult } from "@/types/db";

const inputSchema = z.object({
  orderId: uuidSchema,
  status: orderStatusSchema,
  note: z.string().trim().max(500).optional(),
});

/**
 * Changes an order's status. The allowed transitions are enforced in the database
 * function `admin_set_order_status` (which also re-checks the admin role and puts
 * stock back when an order is rejected).
 */
export async function setOrderStatus(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { orderId, status, note } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_note: note ?? null,
  });

  if (error) {
    if (error.message.includes("invalid_transition")) {
      return { ok: false, error: "That status change isn't allowed for this order." };
    }
    console.error("admin_set_order_status failed", error);
    return { ok: false, error: "Could not update the order. Please try again." };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin", "layout");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}
