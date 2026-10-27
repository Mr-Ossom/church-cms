import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Church } from "lucide-react";
import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/setup-notice";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = { title: "Update password" };

export default async function UpdatePasswordPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const context = await getSessionContext();
  if (!context) {
    redirect("/login");
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
            <p className="text-xs text-slate-500">Account security</p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Set a new password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose a strong password for {context.profile.email ?? "your account"}.
        </p>

        <div className="mt-7">
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}
