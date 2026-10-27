"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { memberSchema } from "@/lib/schemas";
import { firstError } from "@/lib/utils";

function encodeError(message: string) {
  return encodeURIComponent(message.slice(0, 300));
}

export async function createMember(formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/members/new?error=${encodeError(firstError(parsed.error))}`);
  }

  const { error } = await supabase.from("members").insert({
    ...parsed.data,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/members/new?error=${encodeError(error.message)}`);
  }

  revalidatePath("/members");
  revalidatePath("/dashboard");
  redirect("/members?ok=Member added to the directory");
}

export async function updateMember(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));

  if (!z.string().uuid().safeParse(id).success) {
    redirect("/members?error=Invalid member");
  }
  if (!parsed.success) {
    redirect(`/members/${id}/edit?error=${encodeError(firstError(parsed.error))}`);
  }

  const { error } = await supabase.from("members").update(parsed.data).eq("id", id);
  if (error) {
    redirect(`/members/${id}/edit?error=${encodeError(error.message)}`);
  }

  revalidatePath(`/members/${id}`);
  revalidatePath("/members");
  redirect(`/members/${id}?ok=Member updated`);
}

export async function deleteMember(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    redirect("/members?error=Invalid member");
  }

  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) {
    redirect(`/members/${id}?error=${encodeError(error.message)}`);
  }

  revalidatePath("/members");
  redirect("/members?ok=Member removed");
}

export async function importMembers(formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/members/import?error=Choose a CSV file first");
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    redirect("/members/import?error=The CSV needs a header row and at least one member");
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const required = ["first_name", "last_name"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) {
    redirect(`/members/import?error=${encodeError(`Missing columns: ${missing.join(", ")}`)}`);
  }

  const valid: Record<string, unknown>[] = [];
  const failures: string[] = [];

  rows.slice(1).forEach((row, index) => {
    const record: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      record[header] = row[columnIndex]?.trim() ?? "";
    });

    const candidate = {
      first_name: record.first_name ?? "",
      last_name: record.last_name ?? "",
      other_names: record.other_names ?? "",
      gender: record.gender ?? "",
      date_of_birth: record.date_of_birth ?? "",
      marital_status: record.marital_status ?? "",
      phone: record.phone ?? "",
      email: record.email ?? "",
      address: record.address ?? "",
      joined_date: record.joined_date || new Date().toISOString().slice(0, 10),
      status: record.status || "active",
      notes: record.notes ?? "",
      photo_url: "",
    };

    const parsed = memberSchema.safeParse(candidate);
    if (parsed.success) {
      valid.push({ ...parsed.data, created_by: profile.id });
    } else {
      failures.push(`Row ${index + 2}: ${firstError(parsed.error)}`);
    }
  });

  if (!valid.length) {
    redirect(`/members/import?error=${encodeError(failures[0] ?? "No valid rows found")}`);
  }

  const { error } = await supabase.from("members").insert(valid);
  if (error) {
    redirect(`/members/import?error=${encodeError(error.message)}`);
  }

  revalidatePath("/members");
  revalidatePath("/dashboard");
  const skipped = failures.length ? ` (${failures.length} skipped: ${failures[0]})` : "";
  redirect(`/members?ok=${encodeURIComponent(`Imported ${valid.length} members${skipped}`)}`);
}

export async function addFamilyMembership(formData: FormData) {
  const { supabase } = await requireAdmin();
  const memberId = String(formData.get("member_id") ?? "");
  const familyId = String(formData.get("family_id") ?? "");
  const relationship = String(formData.get("relationship") ?? "member").trim() || "member";

  if (!z.string().uuid().safeParse(memberId).success || !z.string().uuid().safeParse(familyId).success) {
    redirect(`/members/${memberId}?error=Select a valid family`);
  }

  const { error } = await supabase.from("family_members").insert({
    member_id: memberId,
    family_id: familyId,
    relationship,
  });

  if (error) {
    redirect(`/members/${memberId}?error=${encodeError(error.message)}`);
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/families/${familyId}`);
  revalidatePath("/families");
  redirect(`/members/${memberId}?ok=Family updated`);
}

export async function removeFamilyMembership(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const familyId = String(formData.get("family_id") ?? "");

  if (!z.string().uuid().safeParse(id).success) {
    redirect(`/members/${memberId}?error=Invalid family link`);
  }

  const { error } = await supabase.from("family_members").delete().eq("id", id);
  if (error) {
    redirect(`/members/${memberId}?error=${encodeError(error.message)}`);
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/families/${familyId}`);
  redirect(`/members/${memberId}?ok=Removed from family`);
}
