import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Trash2 } from "lucide-react";
import { requireTeam } from "@/lib/auth";
import type { AttendanceStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { CheckInBoard } from "@/components/attendance/check-in-board";
import {
  deleteAttendanceSession,
  updateAttendanceSession,
} from "../actions";

export const metadata: Metadata = { title: "Attendance session" };

interface SessionWithEvent {
  id: string;
  event_id: string | null;
  title: string;
  session_date: string;
  headcount: number;
  notes: string | null;
  events: {
    id: string;
    title: string;
    groups: { leader_id: string | null } | null;
  } | null;
}

interface RecordRow {
  member_id: string;
  status: AttendanceStatus;
}

interface CheckInMember {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  status: string;
}

export default async function AttendanceSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireTeam();
  const { id } = await params;
  const { ok, error } = await searchParams;

  const { data } = await supabase
    .from("attendance_sessions")
    .select("id, event_id, title, session_date, headcount, notes, events(id, title, groups(leader_id))")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const session = data as unknown as SessionWithEvent;

  const canEdit =
    profile.role === "admin" ||
    (profile.role === "leader" && session.events?.groups?.leader_id === profile.member_id);

  const [recordsResult, membersResult] = await Promise.all([
    supabase.from("attendance_records").select("member_id, status").eq("session_id", id),
    supabase
      .from("members")
      .select("id, first_name, last_name, photo_url, status")
      .in("status", ["active", "visitor"])
      .order("first_name", { ascending: true })
      .limit(500),
  ]);

  const records = (recordsResult.data ?? []) as RecordRow[];
  const members = (membersResult.data ?? []) as CheckInMember[];
  const initialRecords: Record<string, AttendanceStatus> = {};
  records.forEach((record) => {
    initialRecords[record.member_id] = record.status;
  });

  return (
    <div>
      <Link href="/attendance" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}>
        <ArrowLeft className="h-4 w-4" /> Back to attendance
      </Link>

      <PageHeader
        title={session.title}
        description={`${formatDate(session.session_date)}${
          session.events ? ` · ${session.events.title}` : " · Ad-hoc session"
        }`}
        actions={
          canEdit ? (
            <form action={deleteAttendanceSession}>
              <input type="hidden" name="id" value={session.id} />
              <ConfirmButton
                variant="danger"
                message="Delete this session? All check-in records attached to it will be removed."
              >
                <Trash2 className="h-4 w-4" /> Delete session
              </ConfirmButton>
            </form>
          ) : undefined
        }
      />

      <Flash ok={ok} error={error} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Check-in</CardTitle>
            <CardDescription>
              {canEdit
                ? "Tap a status for each person. Changes save as you go."
                : "Read-only view of this session."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <CheckInBoard
              sessionId={session.id}
              members={members}
              initialRecords={initialRecords}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session details</CardTitle>
              <CardDescription>
                {canEdit ? "Update the headcount and notes." : "Summary for this session."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {canEdit ? (
                <form action={updateAttendanceSession} className="space-y-4">
                  <input type="hidden" name="id" value={session.id} />
                  <input type="hidden" name="event_id" value={session.event_id ?? ""} />
                  <Field label="Session title" htmlFor="title">
                    <Input id="title" name="title" defaultValue={session.title} required />
                  </Field>
                  <Field label="Session date" htmlFor="session_date">
                    <Input
                      id="session_date"
                      name="session_date"
                      type="date"
                      defaultValue={session.session_date}
                      required
                    />
                  </Field>
                  <Field label="Headcount" htmlFor="headcount">
                    <Input
                      id="headcount"
                      name="headcount"
                      type="number"
                      min={0}
                      defaultValue={session.headcount}
                    />
                  </Field>
                  <Field label="Notes" htmlFor="notes">
                    <Textarea id="notes" name="notes" defaultValue={session.notes ?? ""} />
                  </Field>
                  <SubmitButton className="w-full" pendingLabel="Saving...">
                    Save session
                  </SubmitButton>
                </form>
              ) : (
                <div className="space-y-3 text-sm text-slate-600">
                  <p>
                    <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Headcount
                    </span>
                    {session.headcount}
                  </p>
                  <p>
                    <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Notes
                    </span>
                    {session.notes ?? "—"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Linked event</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {session.events ? (
                <Link
                  href={`/events/${session.events.id}`}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50"
                >
                  <CalendarDays className="h-4 w-4 text-indigo-600" />
                  {session.events.title}
                </Link>
              ) : (
                <p className="text-sm text-slate-500">This session is not linked to an event.</p>
              )}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">Total recorded</span>
                <Badge variant="info">{records.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
