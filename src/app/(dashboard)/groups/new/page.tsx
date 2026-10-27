import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { GroupForm } from "@/components/groups/group-form";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "New group" };

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { error } = await searchParams;

  const { data } = await supabase
    .from("members")
    .select("id, first_name, last_name")
    .order("first_name", { ascending: true });

  const leaders = (data ?? []) as { id: string; first_name: string; last_name: string }[];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/groups" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}>
        <ArrowLeft className="h-4 w-4" /> Back to groups
      </Link>
      <PageHeader title="Create a group" description="Add a ministry, department, or small group." />
      <Flash error={error} />
      <GroupForm leaders={leaders} canAssignLeader />
    </div>
  );
}
