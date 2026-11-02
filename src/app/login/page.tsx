import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getUser } from "@/lib/auth";
import { first, safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeNext(first((await searchParams).next));
  if (await getUser()) redirect(next);
  return <AuthForm mode="login" next={next} />;
}
