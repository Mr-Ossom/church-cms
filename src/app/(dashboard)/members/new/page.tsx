import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { MemberForm } from "@/components/members/member-form";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add member" };

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/members" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}>
        <ArrowLeft className="h-4 w-4" /> Back to members
      </Link>
      <PageHeader title="Add a member" description="Create a new person in the church directory." />
      <Flash error={error} />
      <MemberForm />
    </div>
  );
}
