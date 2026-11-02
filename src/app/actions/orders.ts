"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, processImage } from "@/lib/image";
import { uuidSchema } from "@/lib/validation";
import type { ActionResult } from "@/types/db";

/**
 * Customer uploads a payment slip for one of THEIR orders.
 * The image is validated and re-compressed with sharp, stored in the PRIVATE
 * `payment-slips` bucket (never in the database) and linked via an RPC that
 * re-checks ownership and status.
 */
export async function uploadPaymentSlip(
  orderId: string,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  if (!uuidSchema.safeParse(orderId).success) return { ok: false, error: "Invalid order." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose an image of your payment slip." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "That file is too large. Please choose a smaller image." };
  }

  const supabase = await createClient();

  // RLS limits this to the user's own orders; the explicit filter is defence in depth.
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, payment_slip_path")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "pending" && order.status !== "slip_uploaded") {
    return { ok: false, error: "A payment slip can no longer be uploaded for this order." };
  }

  let body: Buffer;
  try {
    body = await processImage(file, { maxDimension: 1800, quality: 80 });
  } catch {
    return { ok: false, error: "That doesn't look like a valid JPG, PNG or WebP image." };
  }

  const path = `${user.id}/${orderId}/${Date.now()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from("payment-slips")
    .upload(path, body, { contentType: "image/webp", upsert: false, cacheControl: "3600" });
  if (uploadError) {
    console.error("slip upload failed", uploadError);
    return { ok: false, error: "Upload failed. Please try again." };
  }

  const { error: rpcError } = await supabase.rpc("attach_payment_slip", {
    p_order_id: orderId,
    p_path: path,
  });
  if (rpcError) {
    await supabase.storage.from("payment-slips").remove([path]); // don't leave orphans
    console.error("attach_payment_slip failed", rpcError);
    return { ok: false, error: "We couldn't attach your slip to the order. Please try again." };
  }

  // Replace: delete the previous slip (best effort)
  if (order.payment_slip_path) {
    await supabase.storage.from("payment-slips").remove([order.payment_slip_path]);
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
