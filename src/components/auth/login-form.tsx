"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/(auth)/actions";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <Field label="Email address" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@church.org"
          required
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Use your church account</span>
        <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-700">
          Forgot password?
        </Link>
      </div>

      <SubmitButton className="w-full" size="lg" pendingLabel="Signing in...">
        Sign in
      </SubmitButton>
    </form>
  );
}
