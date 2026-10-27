"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getChurchSettings, requireAdmin } from "@/lib/auth";
import { donationSchema, pledgeSchema } from "@/lib/schemas";
import { firstError } from "@/lib/utils";

function encodeError(message: string) {
  return encodeURIComponent(message.slice(0, 300));
}

export async function createDonation(formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const parsed = donationSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/giving?error=${encodeError(firstError(parsed.error))}`);
  }

  const settings = await getChurchSettings(supabase);
  const { error } = await supabase.from("donations").insert({
    ...parsed.data,
    currency: settings.currency,
    recorded_by: profile.id,
  });

  if (error) {
    redirect(`/giving?error=${encodeError(error.message)}`);
  }

  revalidatePath("/giving");
  revalidatePath("/dashboard");
  if (parsed.data.member_id) revalidatePath(`/members/${parsed.data.member_id}`);
  redirect("/giving?ok=Contribution recorded");
}

export async function deleteDonation(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    redirect("/giving?error=Invalid donation");
  }

  const { data: donation } = await supabase
    .from("donations")
    .select("member_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("donations").delete().eq("id", id);
  if (error) {
    redirect(`/giving?error=${encodeError(error.message)}`);
  }

  revalidatePath("/giving");
  revalidatePath("/dashboard");
  if (donation?.member_id) revalidatePath(`/members/${donation.member_id}`);
  redirect("/giving?ok=Contribution removed");
}

export async function createPledge(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = pledgeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/giving?error=${encodeError(firstError(parsed.error))}`);
  }

  const { error } = await supabase.from("pledges").insert(parsed.data);
  if (error) {
    redirect(`/giving?error=${encodeError(error.message)}`);
  }

  revalidatePath("/giving");
  if (parsed.data.member_id) revalidatePath(`/members/${parsed.data.member_id}`);
  redirect("/giving?ok=Pledge created");
}

export async function deletePledge(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    redirect("/giving?error=Invalid pledge");
  }

  const { error } = await supabase.from("pledges").delete().eq("id", id);
  if (error) {
    redirect(`/giving?error=${encodeError(error.message)}`);
  }

  revalidatePath("/giving");
  redirect("/giving?ok=Pledge removed");
}
