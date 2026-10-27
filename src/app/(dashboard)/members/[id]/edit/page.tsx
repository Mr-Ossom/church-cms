import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import type { Member } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { MemberForm } from "@/components/members/member-form";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit member" };

export default async function EditMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;

  const { data } = await supabase.from("members").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const member = data as Member;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/members/${member.id}`}
        className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}
      >
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Link>
      <PageHeader
        title={`Edit ${member.first_name} ${member.last_name}`}
        description="Keep this record accurate for pastoral care and reporting."
      />
      <Flash error={error} />
      <MemberForm member={member} />
    </div>
  );
}
