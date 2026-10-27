import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireTeam } from "@/lib/auth";
import type { ChurchEvent } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { EventForm } from "@/components/events/event-form";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, profile } = await requireTeam();
  if (profile.role === "pastor") {
    redirect("/events?error=Only administrators and leaders can manage events.");
  }

  const { id } = await params;
  const { error } = await searchParams;

  const { data } = await supabase
    .from("events")
    .select("*, groups(id, name, leader_id)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const event = data as ChurchEvent & {
    groups: { id: string; name: string; leader_id: string | null } | null;
  };

  if (profile.role === "leader" && event.groups?.leader_id !== profile.member_id) {
    redirect("/events?error=You can only edit events for groups you lead.");
  }

  let query = supabase.from("groups").select("id, name").eq("active", true).order("name");
  if (profile.role === "leader") {
    query = query.eq("leader_id", profile.member_id ?? "00000000-0000-0000-0000-000000000000");
  }
  const { data: groupData } = await query;
  const groups = (groupData ?? []) as { id: string; name: string }[];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/events/${event.id}`}
        className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}
      >
        <ArrowLeft className="h-4 w-4" /> Back to event
      </Link>
      <PageHeader title="Edit event" description={event.title} />
      <Flash error={error} />
      <EventForm event={event} groups={groups} leaderMode={profile.role === "leader"} />
    </div>
  );
}
