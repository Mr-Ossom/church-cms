import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/setup-notice";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const context = await getSessionContext();
  if (context?.profile.active) {
    redirect(context.profile.role === "member" ? "/portal" : "/dashboard");
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to manage your church or view your member portal."
      footer={
        <>
          <p>
            New here?{" "}
            <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
              Create an account
            </Link>
          </p>
          <p className="mt-2">Staff and leader accounts are created by invitation.</p>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
