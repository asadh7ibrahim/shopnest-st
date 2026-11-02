import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/db";

/** Verified user (token validated by Supabase Auth). Cached per request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

export async function requireUser(nextPath = "/") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Use at the top of every admin page AND every admin server action. */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  const profile = await getProfile();
  if (profile?.role !== "admin") notFound(); // don't reveal that /admin exists
  return user;
}
