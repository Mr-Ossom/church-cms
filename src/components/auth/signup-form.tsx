"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { signUp, type AuthState } from "@/app/(auth)/actions";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthState = {};

export function SignupForm() {
  const [state, formAction] = useActionState(signUp, initialState);

  if (state.success) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p className="flex items-center gap-2 font-medium">
            <MailCheck className="h-4 w-4" /> Confirm your email
          </p>
          <p className="mt-1.5 leading-relaxed">{state.success}</p>
        </div>
        <p className="text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="first_name">
          <Input
            id="first_name"
            name="first_name"
            autoComplete="given-name"
            placeholder="Ama"
            required
          />
        </Field>
        <Field label="Last name" htmlFor="last_name">
          <Input
            id="last_name"
            name="last_name"
            autoComplete="family-name"
            placeholder="Mensah"
            required
          />
        </Field>
      </div>

      <Field label="Email address" htmlFor="signup_email">
        <Input
          id="signup_email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </Field>

      <Field label="Phone number" htmlFor="signup_phone" hint="Optional">
        <Input
          id="signup_phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+233 20 000 0000"
        />
      </Field>

      <Field label="Password" htmlFor="signup_password" hint="At least 8 characters">
        <Input
          id="signup_password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          required
        />
      </Field>

      <Field label="Confirm password" htmlFor="signup_confirm">
        <Input
          id="signup_confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          required
        />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingLabel="Creating account...">
        Create account
      </SubmitButton>
    </form>
  );
}
