import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UsersRound,
} from "lucide-react";
import { requireTeam } from "@/lib/auth";
import type { AttendanceSession, ChurchEvent } from "@/lib/types";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils";
import { eventTypeLabel, eventVisibilityLabel } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteEvent } from "../actions";

export const metadata: Metadata = { title: "Event" };

interface EventWithGroup extends ChurchEvent {
  groups: { id: string; name: string; leader_id: string | null } | null;
}

export default async function EventDetailPage({
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
    .from("events")
    .select("*, groups(id, name, leader_id)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const event = data as EventWithGroup;

  const canEdit =
    profile.role === "admin" ||
    (profile.role === "leader" && event.groups?.leader_id === profile.member_id);

  const { data: sessionData } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("event_id", event.id)
    .order("session_date", { ascending: false })
    .limit(20);
  const sessions = (sessionData ?? []) as AttendanceSession[];

  return (
    <div>
      <Link href="/events" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}>
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      <PageHeader
        title={event.title}
        description={formatDateTime(event.starts_at)}
        actions={
          canEdit ? (
            <>
              <Link href={`/events/${event.id}/edit`} className={buttonVariants({ variant: "outline" })}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
              <form action={deleteEvent}>
                <input type="hidden" name="id" value={event.id} />
                <ConfirmButton
                  variant="danger"
                  message="Delete this event? Attendance sessions attached to it will also be deleted."
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </ConfirmButton>
              </form>
            </>
          ) : undefined
        }
      />

      <Flash ok={ok} error={error} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand">{eventTypeLabel[event.type]}</Badge>
                <Badge variant="neutral">{eventVisibilityLabel[event.visibility]}</Badge>
                {event.is_recurring ? <Badge variant="info">Recurring</Badge> : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-indigo-600" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Date</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(event.starts_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <Clock className="mt-0.5 h-4 w-4 text-indigo-600" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Time</p>
                    <p className="text-sm font-medium text-slate-900">
                      {formatTime(event.starts_at)}
                      {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-indigo-600" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Location</p>
                    <p className="text-sm font-medium text-slate-900">{event.location ?? "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <UsersRound className="mt-0.5 h-4 w-4 text-indigo-600" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Group</p>
                    <p className="text-sm font-medium text-slate-900">
                      {event.groups ? (
                        <Link href={`/groups/${event.groups.id}`} className="hover:text-indigo-600">
                          {event.groups.name}
                        </Link>
                      ) : (
                        "Church-wide"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Description</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {event.description ?? "No description provided."}
                </p>
              </div>

              {event.recurrence_rule ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-indigo-800">
                  <span className="font-medium">Recurrence:</span> {event.recurrence_rule}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Attendance sessions</CardTitle>
                <CardDescription>Check-ins recorded for this event.</CardDescription>
              </div>
              {canEdit ? (
                <Link
                  href={`/attendance/new?event=${event.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Plus className="h-3.5 w-3.5" /> New session
                </Link>
              ) : null}
            </CardHeader>
            <CardContent className="pt-4">
              {sessions.length ? (
                <ul className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div>
                        <Link
                          href={`/attendance/${session.id}`}
                          className="text-sm font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {session.title}
                        </Link>
                        <p className="text-xs text-slate-500">{formatDate(session.session_date)}</p>
                      </div>
                      <Badge variant="success">
                        <ClipboardCheck className="h-3 w-3" /> {session.headcount} present
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No attendance recorded"
                  description="Create a session to start checking people in."
                  action={
                    canEdit ? (
                      <Link
                        href={`/attendance/new?event=${event.id}`}
                        className={buttonVariants({ size: "sm" })}
                      >
                        New session
                      </Link>
                    ) : undefined
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>At a glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <Badge variant={event.starts_at >= new Date().toISOString() ? "success" : "neutral"}>
                {event.starts_at >= new Date().toISOString() ? "Upcoming" : "Past"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Sessions</span>
              <span className="font-medium text-slate-900">{sessions.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Last headcount</span>
              <span className="font-medium text-slate-900">{sessions[0]?.headcount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Created</span>
              <span className="font-medium text-slate-900">{formatDate(event.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
