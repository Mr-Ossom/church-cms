import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/setup-notice";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const context = await getSessionContext();
  if (context?.profile.active) {
    redirect(context.profile.role === "member" ? "/portal" : "/dashboard");
  }

  return (
    <AuthShell
      title="Create your account"
      description="Join the member portal to follow church events, announcements and your giving."
      footer={
        <>
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
              Sign in
            </Link>
          </p>
          <p className="mt-2">Staff and leader accounts are created by invitation.</p>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
