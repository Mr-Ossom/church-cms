"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { startThreadSchema, threadMessageSchema } from "@/lib/schemas";
import type { Facilitator } from "@/lib/types";
import { firstError } from "@/lib/utils";

function encodeError(message: string) {
  return encodeURIComponent(message.slice(0, 300));
}

function messagesBase(origin: string) {
  return origin === "dashboard" ? "/messages" : "/portal/messages";
}

export async function startThread(formData: FormData) {
  const { supabase, profile } = await requireUser();
  const parsed = startThreadSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/portal/messages?error=${encodeError(firstError(parsed.error))}`);
  }

  const { facilitator_profile_id, body } = parsed.data;

  const { data: facilitatorData } = await supabase.rpc("list_facilitators");
  const facilitators = (facilitatorData ?? []) as Facilitator[];
  if (!facilitators.some((facilitator) => facilitator.id === facilitator_profile_id)) {
    redirect(`/portal/messages?error=${encodeError("Choose an active facilitator")}`);
  }

  const { data: existing } = await supabase
    .from("message_threads")
    .select("id")
    .eq("member_profile_id", profile.id)
    .eq("facilitator_profile_id", facilitator_profile_id)
    .maybeSingle();

  let threadId = existing?.id as string | undefined;

  if (!threadId) {
    const { data: created, error } = await supabase
      .from("message_threads")
      .insert({
        member_profile_id: profile.id,
        facilitator_profile_id,
      })
      .select("id")
      .single();

    if (error || !created) {
      redirect(
        `/portal/messages?error=${encodeError(error?.message ?? "Could not start that conversation")}`,
      );
    }
    threadId = created.id as string;
  }

  const { error: messageError } = await supabase.from("thread_messages").insert({
    thread_id: threadId,
    sender_profile_id: profile.id,
    body,
  });

  if (messageError) {
    redirect(`/portal/messages?error=${encodeError(messageError.message)}`);
  }

  revalidatePath("/portal/messages");
  revalidatePath(`/portal/messages/${threadId}`);
  revalidatePath("/messages");
  revalidatePath(`/messages/${threadId}`);
  redirect(`/portal/messages/${threadId}?ok=Message sent`);
}

export async function sendThreadMessage(formData: FormData) {
  const { supabase, profile } = await requireUser();
  const origin = String(formData.get("origin") ?? "portal");
  const base = messagesBase(origin);

  const parsed = threadMessageSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const threadId = String(formData.get("thread_id") ?? "");
    redirect(`${base}/${threadId}?error=${encodeError(firstError(parsed.error))}`);
  }

  const { data: thread } = await supabase
    .from("message_threads")
    .select("id")
    .eq("id", parsed.data.thread_id)
    .maybeSingle();

  if (!thread) {
    redirect(`${base}?error=${encodeError("Conversation not found")}`);
  }

  const { error } = await supabase.from("thread_messages").insert({
    thread_id: parsed.data.thread_id,
    sender_profile_id: profile.id,
    body: parsed.data.body,
  });

  if (error) {
    redirect(`${base}/${parsed.data.thread_id}?error=${encodeError(error.message)}`);
  }

  revalidatePath(base);
  revalidatePath(`${base}/${parsed.data.thread_id}`);
  revalidatePath("/messages");
  revalidatePath("/portal/messages");
  redirect(`${base}/${parsed.data.thread_id}?ok=Message sent`);
}

export async function markThreadRead(threadId: string) {
  const { supabase } = await requireUser();
  await supabase.rpc("mark_thread_read", { p_thread_id: threadId });
}
