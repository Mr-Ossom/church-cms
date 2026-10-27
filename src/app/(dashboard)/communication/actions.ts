"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getChurchSettings, getSessionContext, requireStaff } from "@/lib/auth";
import { announcementSchema, smsSchema } from "@/lib/schemas";
import { isSmsConfigured, sendSms } from "@/lib/sms";
import { firstError, normalizePhone } from "@/lib/utils";

function encodeError(message: string) {
  return encodeURIComponent(message.slice(0, 400));
}

async function requireCommunicator() {
  const context = await getSessionContext();
  if (!context) redirect("/login");
  if (!["admin", "pastor", "leader"].includes(context.profile.role)) {
    redirect("/dashboard?error=You do not have permission to manage communication.");
  }
  return context;
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function createAnnouncement(formData: FormData) {
  const { supabase, profile } = await requireCommunicator();
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/communication?error=${encodeError(firstError(parsed.error))}`);
  }

  let { audience } = parsed.data;
  const { group_id } = parsed.data;

  if (profile.role === "leader") {
    audience = "group";
    if (!group_id) {
      redirect(`/communication?error=${encodeError("Choose one of your groups for this announcement")}`);
    }
    const { data: group } = await supabase
      .from("groups")
      .select("leader_id")
      .eq("id", group_id)
      .maybeSingle();
    if (group?.leader_id !== profile.member_id) {
      redirect(`/communication?error=${encodeError("You can only post announcements to groups you lead")}`);
    }
  }

  if (audience === "group" && !group_id) {
    redirect(`/communication?error=${encodeError("Choose a group for a group announcement")}`);
  }

  const publishAt = parsed.data.publish_at
    ? parseOptionalDate(parsed.data.publish_at)
    : new Date().toISOString();
  const expiresAt = parseOptionalDate(parsed.data.expires_at);

  const { error } = await supabase.from("announcements").insert({
    title: parsed.data.title,
    body: parsed.data.body,
    audience,
    group_id: audience === "group" ? group_id : null,
    publish_at: publishAt ?? new Date().toISOString(),
    expires_at: expiresAt,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/communication?error=${encodeError(error.message)}`);
  }

  revalidatePath("/communication");
  revalidatePath("/portal");
  revalidatePath("/portal/announcements");
  revalidatePath("/dashboard");
  redirect("/communication?ok=Announcement published");
}

export async function deleteAnnouncement(formData: FormData) {
  const { supabase, profile } = await requireCommunicator();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    redirect("/communication?error=Invalid announcement");
  }

  const { data: announcement } = await supabase
    .from("announcements")
    .select("created_by")
    .eq("id", id)
    .maybeSingle();

  const isStaff = profile.role === "admin" || profile.role === "pastor";
  if (!isStaff && announcement?.created_by !== profile.id) {
    redirect("/communication?error=You can only delete announcements you created");
  }

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) {
    redirect(`/communication?error=${encodeError(error.message)}`);
  }

  revalidatePath("/communication");
  revalidatePath("/portal");
  revalidatePath("/portal/announcements");
  redirect("/communication?ok=Announcement removed");
}

export async function sendSmsBroadcast(formData: FormData) {
  const { supabase, profile } = await requireStaff();
  const parsed = smsSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/communication?error=${encodeError(firstError(parsed.error))}`);
  }

  const settings = await getChurchSettings(supabase);
  let phones: (string | null)[] = [];

  if (parsed.data.audience === "group") {
    if (!parsed.data.group_id) {
      redirect(`/communication?error=${encodeError("Choose a group for the SMS")}`);
    }
    const { data } = await supabase
      .from("group_members")
      .select("members(phone)")
      .eq("group_id", parsed.data.group_id);
    phones = ((data ?? []) as unknown as { members: { phone: string | null } | null }[]).map(
      (row) => row.members?.phone ?? null,
    );
  } else {
    const { data } = await supabase
      .from("members")
      .select("phone")
      .in("status", ["active", "visitor"])
      .not("phone", "is", null);
    phones = ((data ?? []) as { phone: string | null }[]).map((row) => row.phone);
  }

  const recipients = Array.from(
    new Set(
      phones
        .map((phone) => normalizePhone(phone, settings.country_code))
        .filter((phone): phone is string => Boolean(phone)),
    ),
  );

  if (!recipients.length) {
    redirect(`/communication?error=${encodeError("No phone numbers found for that audience")}`);
  }

  if (!isSmsConfigured()) {
    redirect(
      `/communication?error=${encodeError(
        "SMS is not configured. Add Africa's Talking or Twilio credentials to .env.local first.",
      )}`,
    );
  }

  let results: Awaited<ReturnType<typeof sendSms>>;
  try {
    results = await sendSms(recipients, parsed.data.message, {
      senderId: settings.sms_sender_id,
    });
  } catch (error) {
    redirect(
      `/communication?error=${encodeError(
        error instanceof Error ? error.message : "SMS sending failed",
      )}`,
    );
  }

  await supabase.from("message_logs").insert(
    results.map((result) => ({
      channel: "sms",
      recipient: result.recipient,
      body: parsed.data.message,
      status: result.status,
      provider_id: result.providerId ?? null,
      error: result.error ?? null,
      sent_by: profile.id,
    })),
  );

  revalidatePath("/communication");
  const sent = results.filter((result) => result.status === "sent").length;
  const failed = results.length - sent;
  redirect(
    `/communication?ok=${encodeURIComponent(
      `SMS sent to ${sent} recipient${sent === 1 ? "" : "s"}${failed ? `, ${failed} failed` : ""}`,
    )}`,
  );
}
