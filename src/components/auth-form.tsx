"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type FormState } from "@/app/actions/auth";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    mode === "login" ? signIn : signUp,
    undefined,
  );
  const isLogin = mode === "login";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {isLogin ? "Sign in to check out and track your orders." : "It only takes a minute."}
        </p>

        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />

          {!isLogin && (
            <div>
              <label htmlFor="fullName" className="label">Full name</label>
              <input id="fullName" name="fullName" required minLength={2} maxLength={100} autoComplete="name" className="input" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={isLogin ? 1 : 8}
              maxLength={72}
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="input"
            />
            {!isLogin && <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>}
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              {state.error}
            </p>
          )}
          {state?.message && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">
              {state.message}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <Link
            href={`${isLogin ? "/register" : "/login"}?next=${encodeURIComponent(next)}`}
            className="font-semibold text-indigo-700 hover:underline"
          >
            {isLogin ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </div>
    </div>
  );
}
