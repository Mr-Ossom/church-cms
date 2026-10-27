"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { familySchema } from "@/lib/schemas";
import { firstError } from "@/lib/utils";

function encodeError(message: string) {
  return encodeURIComponent(message.slice(0, 300));
}

export async function createFamily(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = familySchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/families/new?error=${encodeError(firstError(parsed.error))}`);
  }

  const { data, error } = await supabase
    .from("families")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/families/new?error=${encodeError(error?.message ?? "Could not create family")}`);
  }

  revalidatePath("/families");
  redirect(`/families/${data.id}?ok=Family created`);
}

export async function updateFamily(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = familySchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });

  if (!z.string().uuid().safeParse(id).success) {
    redirect("/families?error=Invalid family");
  }
  if (!parsed.success) {
    redirect(`/families/${id}?error=${encodeError(firstError(parsed.error))}`);
  }

  const { error } = await supabase.from("families").update(parsed.data).eq("id", id);
  if (error) {
    redirect(`/families/${id}?error=${encodeError(error.message)}`);
  }

  revalidatePath(`/families/${id}`);
  revalidatePath("/families");
  redirect(`/families/${id}?ok=Family updated`);
}

export async function deleteFamily(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    redirect("/families?error=Invalid family");
  }

  const { error } = await supabase.from("families").delete().eq("id", id);
  if (error) {
    redirect(`/families/${id}?error=${encodeError(error.message)}`);
  }

  revalidatePath("/families");
  redirect("/families?ok=Family removed");
}

export async function addFamilyMember(formData: FormData) {
  const { supabase } = await requireAdmin();
  const familyId = String(formData.get("family_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const relationship = String(formData.get("relationship") ?? "member").trim() || "member";

  if (!z.string().uuid().safeParse(familyId).success || !z.string().uuid().safeParse(memberId).success) {
    redirect(`/families/${familyId}?error=Select a member to add`);
  }

  const { error } = await supabase.from("family_members").insert({
    family_id: familyId,
    member_id: memberId,
    relationship,
  });

  if (error) {
    redirect(`/families/${familyId}?error=${encodeError(error.message)}`);
  }

  revalidatePath(`/families/${familyId}`);
  revalidatePath("/families");
  redirect(`/families/${familyId}?ok=Member added to family`);
}

export async function removeFamilyMember(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const familyId = String(formData.get("family_id") ?? "");

  if (!z.string().uuid().safeParse(id).success) {
    redirect(`/families/${familyId}?error=Invalid family link`);
  }

  const { error } = await supabase.from("family_members").delete().eq("id", id);
  if (error) {
    redirect(`/families/${familyId}?error=${encodeError(error.message)}`);
  }

  revalidatePath(`/families/${familyId}`);
  redirect(`/families/${familyId}?ok=Member removed from family`);
}
