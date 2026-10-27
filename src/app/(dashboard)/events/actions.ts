"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import { eventSchema } from "@/lib/schemas";
import { firstError } from "@/lib/utils";

function encodeError(message: string) {
  return encodeURIComponent(message.slice(0, 300));
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function requireEventCreator() {
  const context = await getSessionContext();
  if (!context) redirect("/login");
  if (!["admin", "leader"].includes(context.profile.role)) {
    redirect("/events?error=You do not have permission to manage events.");
  }
  return context;
}

async function assertCanEditEvent(eventId: string) {
  const context = await requireEventCreator();
  if (context.profile.role === "admin") return context;

  const { data: event } = await context.supabase
    .from("events")
    .select("group_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!event?.group_id) {
    redirect("/events?error=You can only manage events for groups you lead.");
  }

  const { data: group } = await context.supabase
    .from("groups")
    .select("leader_id")
    .eq("id", event.group_id)
    .maybeSingle();

  if (group?.leader_id !== context.profile.member_id) {
    redirect("/events?error=You can only manage events for groups you lead.");
  }

  return context;
}

export async function createEvent(formData: FormData) {
  const { supabase, profile } = await requireEventCreator();
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/events/new?error=${encodeError(firstError(parsed.error))}`);
  }

  if (profile.role === "leader") {
    if (!parsed.data.group_id) {
      redirect(`/events/new?error=${encodeError("Choose one of your groups for this event")}`);
    }
    const { data: group } = await supabase
      .from("groups")
      .select("leader_id")
      .eq("id", parsed.data.group_id)
      .maybeSingle();
    if (group?.leader_id !== profile.member_id) {
      redirect(`/events/new?error=${encodeError("You can only create events for groups you lead")}`);
    }
  }

  const startsAt = parseDate(parsed.data.starts_at);
  const endsAt = parseDate(parsed.data.ends_at ?? null);
  if (!startsAt) {
    redirect(`/events/new?error=${encodeError("Enter a valid start date and time")}`);
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      ...parsed.data,
      starts_at: startsAt,
      ends_at: endsAt,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/events/new?error=${encodeError(error?.message ?? "Could not create event")}`);
  }

  revalidatePath("/events");
  revalidatePath("/dashboard");
  redirect(`/events/${data.id}?ok=Event created`);
}

export async function updateEvent(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    redirect("/events?error=Invalid event");
  }

  const { supabase } = await assertCanEditEvent(id);
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/events/${id}/edit?error=${encodeError(firstError(parsed.error))}`);
  }

  const startsAt = parseDate(parsed.data.starts_at);
  const endsAt = parseDate(parsed.data.ends_at ?? null);
  if (!startsAt) {
    redirect(`/events/${id}/edit?error=${encodeError("Enter a valid start date and time")}`);
  }

  const { error } = await supabase
    .from("events")
    .update({ ...parsed.data, starts_at: startsAt, ends_at: endsAt })
    .eq("id", id);

  if (error) {
    redirect(`/events/${id}/edit?error=${encodeError(error.message)}`);
  }

  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  revalidatePath("/dashboard");
  redirect(`/events/${id}?ok=Event updated`);
}

export async function deleteEvent(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    redirect("/events?error=Invalid event");
  }

  const { supabase } = await assertCanEditEvent(id);
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    redirect(`/events/${id}?error=${encodeError(error.message)}`);
  }

  revalidatePath("/events");
  revalidatePath("/dashboard");
  redirect("/events?ok=Event removed");
}
