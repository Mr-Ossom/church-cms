import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ClipboardCheck, Plus } from "lucide-react";
import { requireTeam } from "@/lib/auth";
import type { AttendanceSession } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Attendance" };

interface SessionRow extends AttendanceSession {
  attendance_records: { count: number }[];
  events: { id: string; title: string } | null;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireTeam();
  const params = await searchParams;
  const canRecord = profile.role === "admin" || profile.role === "leader";

  const { data, error } = await supabase
    .from("attendance_sessions")
    .select("*, attendance_records(count), events(id, title)")
    .order("session_date", { ascending: false })
    .limit(100);

  const sessions = (data ?? []) as unknown as SessionRow[];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthSessions = sessions.filter((session) => session.session_date.startsWith(thisMonth));
  const monthHeadcount = monthSessions.reduce((total, session) => total + session.headcount, 0);
  const totalRecords = sessions.reduce(
    (total, session) => total + (session.attendance_records?.[0]?.count ?? 0),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Record who showed up, service by service."
        actions={
          canRecord ? (
            <Link href="/attendance/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" /> New session
            </Link>
          ) : undefined
        }
      />

      <Flash ok={params.ok} error={params.error ?? error?.message} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sessions this month</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{monthSessions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Headcount this month</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{monthHeadcount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Individual check-ins</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalRecords}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {sessions.length ? (
          <TableWrap>
            <Table>
              <THead>
                <tr>
                  <TH>Session</TH>
                  <TH>Event</TH>
                  <TH>Date</TH>
                  <TH>Check-ins</TH>
                  <TH>Headcount</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {sessions.map((session) => (
                  <TR key={session.id}>
                    <TD>
                      <Link
                        href={`/attendance/${session.id}`}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {session.title}
                      </Link>
                    </TD>
                    <TD className="text-sm text-slate-500">
                      {session.events ? (
                        <Link href={`/events/${session.events.id}`} className="hover:text-indigo-600">
                          {session.events.title}
                        </Link>
                      ) : (
                        "Ad-hoc session"
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-sm">{formatDate(session.session_date)}</TD>
                    <TD>
                      <Badge variant="info">
                        {session.attendance_records?.[0]?.count ?? 0} recorded
                      </Badge>
                    </TD>
                    <TD className="font-medium text-slate-900">{session.headcount}</TD>
                    <TD className="text-right">
                      <Link
                        href={`/attendance/${session.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {canRecord ? "Check-in" : "View"}
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        ) : (
          <EmptyState
            icon={ClipboardCheck}
            title="No attendance sessions yet"
            description={
              canRecord
                ? "Create a session for a service or event, then check people in."
                : "Attendance recorded by your leaders will appear here."
            }
            action={
              canRecord ? (
                <Link href="/attendance/new" className={buttonVariants({ size: "sm" })}>
                  New session
                </Link>
              ) : undefined
            }
          />
        )}
      </Card>

      {canRecord ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          Tip: open a session on your phone and use it at the door — offline check-ins sync later.
        </p>
      ) : null}
    </div>
  );
}
