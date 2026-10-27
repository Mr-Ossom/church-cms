"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionContext, requireAdmin } from "@/lib/auth";
import { groupSchema } from "@/lib/schemas";
import { firstError } from "@/lib/utils";

function encodeError(message: string) {
  return encodeURIComponent(message.slice(0, 300));
}

async function requireGroupEditor(groupId?: string) {
  const context = await getSessionContext();
  if (!context) redirect("/login");
  const { profile, supabase } = context;

  if (profile.role === "admin") return context;

  if (profile.role === "leader" && groupId) {
    const { data: group } = await supabase
      .from("groups")
      .select("leader_id")
      .eq("id", groupId)
      .maybeSingle();
    if (group?.leader_id && group.leader_id === profile.member_id) {
      return context;
    }
  }

  redirect("/groups?error=You do not have permission to manage that group.");
}

export async function createGroup(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = groupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/groups/new?error=${encodeError(firstError(parsed.error))}`);
  }

  const { data, error } = await supabase.from("groups").insert(parsed.data).select("id").single();
  if (error || !data) {
    redirect(`/groups/new?error=${encodeError(error?.message ?? "Could not create group")}`);
  }

  revalidatePath("/groups");
  redirect(`/groups/${data.id}?ok=Group created`);
}

export async function updateGroup(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    redirect("/groups?error=Invalid group");
  }

  const { supabase, profile } = await requireGroupEditor(id);
  const parsed = groupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/groups/${id}?error=${encodeError(firstError(parsed.error))}`);
  }

  const payload = { ...parsed.data };
  if (profile.role !== "admin") {
    delete (payload as Partial<typeof payload>).leader_id;
  }

  const { error } = await supabase.from("groups").update(payload).eq("id", id);
  if (error) {
    redirect(`/groups/${id}?error=${encodeError(error.message)}`);
  }

  revalidatePath(`/groups/${id}`);
  revalidatePath("/groups");
  redirect(`/groups/${id}?ok=Group updated`);
}

export async function deleteGroup(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    redirect("/groups?error=Invalid group");
  }

  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) {
    redirect(`/groups/${id}?error=${encodeError(error.message)}`);
  }

  revalidatePath("/groups");
  redirect("/groups?ok=Group removed");
}

export async function addGroupMember(formData: FormData) {
  const { supabase } = await requireAdmin();
  const groupId = String(formData.get("group_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const role = String(formData.get("role") ?? "member").trim() || "member";

  if (!z.string().uuid().safeParse(groupId).success || !z.string().uuid().safeParse(memberId).success) {
    redirect(`/groups/${groupId}?error=Select a member to add`);
  }

  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    member_id: memberId,
    role,
  });

  if (error) {
    redirect(`/groups/${groupId}?error=${encodeError(error.message)}`);
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  redirect(`/groups/${groupId}?ok=Member added to group`);
}

export async function removeGroupMember(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const groupId = String(formData.get("group_id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    redirect(`/groups/${groupId}?error=Invalid roster entry`);
  }

  const { error } = await supabase.from("group_members").delete().eq("id", id);
  if (error) {
    redirect(`/groups/${groupId}?error=${encodeError(error.message)}`);
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  redirect(`/groups/${groupId}?ok=Member removed from group`);
}
