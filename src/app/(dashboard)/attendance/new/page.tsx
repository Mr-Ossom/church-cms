import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireTeam } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { createAttendanceSession } from "../actions";

export const metadata: Metadata = { title: "New attendance session" };

interface EventOption {
  id: string;
  title: string;
  starts_at: string;
  groups: { name: string } | null;
}

export default async function NewAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireTeam();
  if (profile.role === "pastor") {
    redirect("/attendance?error=Only administrators and leaders can record attendance.");
  }

  const params = await searchParams;

  let eventQuery = supabase
    .from("events")
    .select("id, title, starts_at, groups(name)")
    .order("starts_at", { ascending: false })
    .limit(200);

  if (profile.role === "leader") {
    const { data: groups } = await supabase
      .from("groups")
      .select("id")
      .eq("leader_id", profile.member_id ?? "00000000-0000-0000-0000-000000000000");
    const groupIds = (groups ?? []).map((group) => group.id);
    if (groupIds.length) {
      eventQuery = eventQuery.in("group_id", groupIds);
    } else {
      eventQuery = eventQuery.eq("group_id", "00000000-0000-0000-0000-000000000000");
    }
  }

  const { data } = await eventQuery;
  const events = (data ?? []) as unknown as EventOption[];
  const selected = params.event ? events.find((event) => event.id === params.event) : undefined;
  const today = new Date().toISOString().slice(0, 10);
  const sessionDate = selected ? selected.starts_at.slice(0, 10) : today;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/attendance" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}>
        <ArrowLeft className="h-4 w-4" /> Back to attendance
      </Link>
      <PageHeader
        title="New attendance session"
        description="Track check-ins and the overall headcount for a gathering."
      />
      <Flash error={params.error} />

      <form action={createAttendanceSession}>
        <Card>
          <CardContent className="space-y-4">
            <Field
              label="Event"
              htmlFor="event_id"
              hint={
                profile.role === "leader"
                  ? "Choose one of your group's events."
                  : "Optional. Ad-hoc sessions are allowed for admins."
              }
            >
              <Select
                id="event_id"
                name="event_id"
                defaultValue={selected?.id ?? ""}
                required={profile.role === "leader"}
              >
                <option value="">Ad-hoc session (no event)</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} — {new Date(event.starts_at).toLocaleDateString("en-GB")}
                    {event.groups?.name ? ` (${event.groups.name})` : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Session title" htmlFor="title">
              <Input
                id="title"
                name="title"
                required
                defaultValue={selected?.title ?? "Sunday Celebration Service"}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Session date" htmlFor="session_date">
                <Input
                  id="session_date"
                  name="session_date"
                  type="date"
                  required
                  defaultValue={sessionDate}
                />
              </Field>
              <Field label="Headcount" htmlFor="headcount" hint="Total people present, including visitors.">
                <Input id="headcount" name="headcount" type="number" min={0} defaultValue={0} />
              </Field>
            </div>

            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" placeholder="Anything worth remembering about this session" />
            </Field>
          </CardContent>
        </Card>

        <div className="mt-5 flex justify-end">
          <SubmitButton pendingLabel="Creating session...">Create session</SubmitButton>
        </div>
      </form>
    </div>
  );
}
