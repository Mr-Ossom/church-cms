import type { Metadata } from "next";
import { Church } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/setup-notice";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Church className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">ChurchOS</p>
            <p className="text-xs text-slate-500">Password recovery</p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter the email you use for church and we will send you a reset link.
        </p>

        <div className="mt-7">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
