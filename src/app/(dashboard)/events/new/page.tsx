import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { EventForm } from "@/components/events/event-form";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireTeam();
  if (profile.role === "pastor") {
    redirect("/events?error=Only administrators and leaders can create events.");
  }

  const params = await searchParams;
  const leaderMode = profile.role === "leader";

  let query = supabase.from("groups").select("id, name").eq("active", true).order("name");
  if (leaderMode) {
    query = query.eq("leader_id", profile.member_id ?? "00000000-0000-0000-0000-000000000000");
  }
  const { data } = await query;
  const groups = (data ?? []) as { id: string; name: string }[];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/events" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}>
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>
      <PageHeader title="Create an event" description="Add a service, meeting or special gathering." />
      <Flash error={params.error} />
      <EventForm groups={groups} leaderMode={leaderMode} defaultGroupId={params.group} />
    </div>
  );
}
