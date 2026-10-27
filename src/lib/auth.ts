import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ChurchSettings, Profile, UserRole } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";

export interface SessionContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string | null };
  profile: Profile;
}

export async function getSessionContext(): Promise<SessionContext | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return { supabase, user, profile: profile as Profile };
}

export async function requireUser(): Promise<SessionContext> {
  const context = await getSessionContext();
  if (!context) redirect("/login");
  if (!context.profile.active) {
    redirect("/login?error=Your account has been deactivated. Contact an administrator.");
  }
  return context;
}

export async function requireStaff(): Promise<SessionContext> {
  const context = await requireUser();
  if (context.profile.role !== "admin" && context.profile.role !== "pastor") {
    redirect("/dashboard?error=You do not have permission to access that page.");
  }
  return context;
}

export async function requireTeam(): Promise<SessionContext> {
  const context = await requireUser();
  if (context.profile.role === "member") {
    redirect("/portal");
  }
  return context;
}

export async function requireAdmin(): Promise<SessionContext> {
  const context = await requireUser();
  if (context.profile.role !== "admin") {
    redirect("/dashboard?error=Only administrators can access that page.");
  }
  return context;
}

export async function requireRole(roles: UserRole[]): Promise<SessionContext> {
  const context = await requireUser();
  if (!roles.includes(context.profile.role)) {
    redirect("/dashboard?error=You do not have permission to do that.");
  }
  return context;
}

export async function getChurchSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ChurchSettings> {
  const { data } = await supabase
    .from("church_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (data as ChurchSettings | null) ?? DEFAULT_SETTINGS;
}
