"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import { attendanceSessionSchema } from "@/lib/schemas";
import { firstError } from "@/lib/utils";

function encodeError(message: string) {
  return encodeURIComponent(message.slice(0, 300));
}

async function requireAttendanceManager() {
  const context = await getSessionContext();
  if (!context) redirect("/login");
  if (!["admin", "leader"].includes(context.profile.role)) {
    redirect("/attendance?error=You do not have permission to record attendance.");
  }
  return context;
}

async function assertSessionAccess(sessionId: string) {
  const context = await requireAttendanceManager();
  if (context.profile.role === "admin") return context;

  const { data } = await context.supabase
    .from("attendance_sessions")
    .select("id, events(group_id, groups(leader_id))")
    .eq("id", sessionId)
    .maybeSingle();

  const event = (data?.events ?? null) as
    | { group_id: string | null; groups: { leader_id: string | null } | null }
    | null;

  if (event?.groups?.leader_id !== context.profile.member_id) {
    redirect("/attendance?error=You can only record attendance for groups you lead.");
  }
  return context;
}

export async function createAttendanceSession(formData: FormData) {
  const { supabase, profile } = await requireAttendanceManager();
  const parsed = attendanceSessionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/attendance/new?error=${encodeError(firstError(parsed.error))}`);
  }

  if (parsed.data.event_id) {
    const { data: event } = await supabase
      .from("events")
      .select("id, group_id, groups(leader_id)")
      .eq("id", parsed.data.event_id)
      .maybeSingle();

    const group = (event?.groups ?? null) as { leader_id: string | null } | null;
    if (!event) {
      redirect(`/attendance/new?error=${encodeError("That event could not be found")}`);
    }
    if (profile.role === "leader" && group?.leader_id !== profile.member_id) {
      redirect(`/attendance/new?error=${encodeError("You can only record attendance for groups you lead")}`);
    }
  } else if (profile.role === "leader") {
    redirect(`/attendance/new?error=${encodeError("Choose an event for group attendance")}`);
  }

  const { data, error } = await supabase
    .from("attendance_sessions")
    .insert({
      ...parsed.data,
      recorded_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/attendance/new?error=${encodeError(error?.message ?? "Could not create session")}`);
  }

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  if (parsed.data.event_id) revalidatePath(`/events/${parsed.data.event_id}`);
  redirect(`/attendance/${data.id}?ok=Session created`);
}

export async function updateAttendanceSession(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    redirect("/attendance?error=Invalid session");
  }

  const { supabase } = await assertSessionAccess(id);
  const parsed = attendanceSessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/attendance/${id}?error=${encodeError(firstError(parsed.error))}`);
  }

  const { error } = await supabase.from("attendance_sessions").update(parsed.data).eq("id", id);
  if (error) {
    redirect(`/attendance/${id}?error=${encodeError(error.message)}`);
  }

  revalidatePath(`/attendance/${id}`);
  revalidatePath("/attendance");
  redirect(`/attendance/${id}?ok=Session updated`);
}

export async function deleteAttendanceSession(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    redirect("/attendance?error=Invalid session");
  }

  const { supabase } = await assertSessionAccess(id);
  const { error } = await supabase.from("attendance_sessions").delete().eq("id", id);
  if (error) {
    redirect(`/attendance/${id}?error=${encodeError(error.message)}`);
  }

  revalidatePath("/attendance");
  redirect("/attendance?ok=Session deleted");
}
