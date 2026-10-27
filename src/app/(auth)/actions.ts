"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signupSchema } from "@/lib/schemas";

export interface AuthState {
  error?: string;
  success?: string;
}

async function getOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured yet. Follow the setup steps first." };
  }

  const parsed = signupSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/portal`,
      data: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        phone: parsed.data.phone ?? "",
        self_signup: true,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect("/portal");
  }

  return {
    success:
      "Check your inbox for a confirmation link, then sign in to your member portal. Check your spam folder if it does not arrive.",
  };
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured yet. Follow the setup steps first." };
  }

  const parsed = z
    .object({
      email: z.string().trim().email("Enter a valid email address"),
      password: z.string().min(1, "Enter your password"),
    })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (!profile) {
    return {
      error:
        "Signed in, but no profile was found. Make sure the database migration has been applied, then try again.",
    };
  }

  if (!profile.active) {
    await supabase.auth.signOut();
    return { error: "Your account has been deactivated. Contact a church administrator." };
  }

  redirect(profile.role === "member" ? "/portal" : "/dashboard");
}

export async function requestPasswordReset(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured yet." };
  }

  const parsed = z
    .object({ email: z.string().trim().email("Enter a valid email address") })
    .safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  return {
    success: "If that email is registered, a password reset link is on its way.",
  };
}

export async function updatePassword(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured yet." };
  }

  const parsed = z
    .object({
      password: z.string().min(8, "Use at least 8 characters"),
      confirm: z.string(),
    })
    .refine((values) => values.password === values.confirm, {
      message: "Passwords do not match",
      path: ["confirm"],
    })
    .safeParse({
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
  redirect(profile?.role === "member" ? "/portal" : "/dashboard");
}
