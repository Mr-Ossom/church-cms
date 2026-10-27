"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { inviteSchema, roleUpdateSchema, settingsSchema } from "@/lib/schemas";
import { firstError } from "@/lib/utils";

function encodeError(message: string) {
  return encodeURIComponent(message.slice(0, 400));
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

export async function updateChurchSettings(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/settings?error=${encodeError(firstError(parsed.error))}`);
  }

  const { error } = await supabase
    .from("church_settings")
    .upsert({ id: 1, ...parsed.data }, { onConflict: "id" });

  if (error) {
    redirect(`/settings?error=${encodeError(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/settings?ok=Church settings updated");
}

export async function inviteTeamMember(formData: FormData) {
  const { profile } = await requireAdmin();
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/settings?error=${encodeError(firstError(parsed.error))}`);
  }

  if (!isServiceRoleConfigured()) {
    redirect(
      `/settings?error=${encodeError(
        "Invites need SUPABASE_SERVICE_ROLE_KEY in your environment. Add it, restart the app, then try again.",
      )}`,
    );
  }

  const admin = createAdminClient();
  const origin = await getOrigin();

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
    data: { full_name: parsed.data.full_name },
  });

  if (error) {
    redirect(`/settings?error=${encodeError(error.message)}`);
  }

  if (invited.user) {
    await admin.from("profiles").upsert(
      {
        id: invited.user.id,
        email: parsed.data.email,
        full_name: parsed.data.full_name,
        role: parsed.data.role,
      },
      { onConflict: "id" },
    );
  }

  await admin.from("audit_logs").insert({
    actor_id: profile.id,
    action: "invite",
    entity: "profile",
    entity_id: invited.user?.id ?? null,
    details: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath("/settings");
  redirect(`/settings?ok=${encodeURIComponent(`Invitation sent to ${parsed.data.email}.`)}`);
}

export async function updateTeamMember(formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const parsed = roleUpdateSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/settings?error=${encodeError(firstError(parsed.error))}`);
  }

  if (parsed.data.profile_id === profile.id && parsed.data.role !== "admin") {
    redirect(
      `/settings?error=${encodeError(
        "You cannot remove your own administrator role. Ask another administrator to do it.",
      )}`,
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role, member_id: parsed.data.member_id })
    .eq("id", parsed.data.profile_id);

  if (error) {
    redirect(`/settings?error=${encodeError(error.message)}`);
  }

  revalidatePath("/settings");
  redirect("/settings?ok=Team member updated");
}
