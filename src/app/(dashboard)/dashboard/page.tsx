import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  HandCoins,
  Megaphone,
  UserPlus,
  Users,
  UserRoundSearch,
} from "lucide-react";
import { requireTeam, getChurchSettings } from "@/lib/auth";
import type {
  AttendanceSession,
  ChurchEvent,
  Group,
  Member,
} from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime, fullName, monthLabel, monthStart } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Flash } from "@/components/ui/flash";
import { AttendanceChart } from "@/components/charts/attendance-chart";
import { eventTypeLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireTeam();
  const settings = await getChurchSettings(supabase);
  const { ok, error } = await searchParams;
  const isLeader = profile.role === "leader";

  const nowIso = new Date().toISOString();
  const monthStartIso = monthStart();

  const membersCountQuery = supabase
    .from("members")
    .select("id", { count: "exact", head: true });
  const visitorsCountQuery = supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("status", "visitor");
  const groupsCountQuery = supabase
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("active", true);
  const upcomingEventsQuery = supabase
    .from("events")
    .select("*")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(5);
  const recentMembersQuery = supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  const sessionsQuery = supabase
    .from("attendance_sessions")
    .select("*")
    .order("session_date", { ascending: true })
    .limit(8);
  const announcementsQuery = supabase
    .from("announcements")
    .select("id, title, publish_at, audience")
    .order("publish_at", { ascending: false })
    .limit(3);

  const [
    membersCount,
    visitorsCount,
    groupsCount,
    upcomingEvents,
    recentMembers,
    sessions,
    announcements,
  ] = await Promise.all([
    membersCountQuery,
    visitorsCountQuery,
    groupsCountQuery,
    upcomingEventsQuery,
    recentMembersQuery,
    sessionsQuery,
    announcementsQuery,
  ]);

  const events = (upcomingEvents.data ?? []) as ChurchEvent[];
  const members = (recentMembers.data ?? []) as Member[];
  const attendanceSessions = (sessions.data ?? []) as AttendanceSession[];
  const latestSession = attendanceSessions.at(-1);
  const attendanceData = attendanceSessions
    .slice(-6)
    .map((session) => ({
      label: monthLabel(session.session_date),
      headcount: session.headcount,
    }));

  let givingThisMonth: number | null = null;
  if (profile.role === "admin") {
    const { data } = await supabase
      .from("donations")
      .select("amount, donation_date")
      .gte("donation_date", monthStartIso);
    givingThisMonth = (data ?? []).reduce((total, row) => total + Number(row.amount ?? 0), 0);
  } else if (profile.role === "pastor") {
    const { data } = await supabase.rpc("donation_summary");
    if (data) {
      givingThisMonth = (data as { month: string; total: number }[])
        .filter((row) => row.month === monthStartIso)
        .reduce((total, row) => total + Number(row.total ?? 0), 0);
    }
  }

  let leaderGroups: Group[] = [];
  if (isLeader) {
    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("leader_id", profile.member_id ?? "00000000-0000-0000-0000-000000000000");
    leaderGroups = (data ?? []) as Group[];
  }

  const stats = isLeader
    ? [
        {
          label: "Groups I lead",
          value: leaderGroups.length,
          hint: leaderGroups.map((group) => group.name).join(", ") || "No group assigned yet",
          icon: Users,
          tone: "indigo" as const,
        },
        {
          label: "Upcoming events",
          value: events.length,
          hint: events[0] ? events[0].title : "Nothing scheduled",
          icon: CalendarDays,
          tone: "sky" as const,
        },
        {
          label: "Latest headcount",
          value: latestSession?.headcount ?? 0,
          hint: latestSession ? formatDate(latestSession.session_date) : "No sessions yet",
          icon: ClipboardCheck,
          tone: "emerald" as const,
        },
        {
          label: "Announcements",
          value: announcements.data?.length ?? 0,
          hint: "Recent notices",
          icon: Megaphone,
          tone: "amber" as const,
        },
      ]
    : [
        {
          label: "Total members",
          value: membersCount.count ?? 0,
          hint: `${visitorsCount.count ?? 0} visitors to follow up`,
          icon: Users,
          tone: "indigo" as const,
        },
        {
          label: "Active groups",
          value: groupsCount.count ?? 0,
          hint: "Ministries and departments",
          icon: UserRoundSearch,
          tone: "sky" as const,
        },
        {
          label: "Last attendance",
          value: latestSession?.headcount ?? 0,
          hint: latestSession ? formatDate(latestSession.session_date) : "No sessions yet",
          icon: ClipboardCheck,
          tone: "emerald" as const,
        },
        {
          label: "Giving this month",
          value: formatCurrency(givingThisMonth ?? 0, settings.currency),
          hint: "Tithes, offerings, pledges",
          icon: HandCoins,
          tone: "amber" as const,
        },
      ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${(profile.full_name ?? "friend").split(" ")[0]}`}
        description={`Here is what is happening at ${settings.name}.`}
        actions={
          isLeader ? (
            <Link href="/attendance/new" className={buttonVariants({ variant: "primary" })}>
              <ClipboardCheck className="h-4 w-4" /> Take attendance
            </Link>
          ) : (
            <>
              <Link href="/members/new" className={buttonVariants({ variant: "outline" })}>
                <UserPlus className="h-4 w-4" /> Add member
              </Link>
              <Link href="/giving" className={buttonVariants()}>
                <HandCoins className="h-4 w-4" /> Record giving
              </Link>
            </>
          )
        }
      />

      <Flash ok={ok} error={error} />

      {isLeader && !profile.member_id ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your login is not linked to a member record yet. Ask an administrator to link it under
          Settings → Team so your groups and check-in tools appear.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Attendance trend</CardTitle>
                <CardDescription>Headcount across recent recorded sessions.</CardDescription>
              </div>
              {!isLeader ? (
                <Link
                  href="/reports"
                  className="hidden items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 sm:inline-flex"
                >
                  View reports <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
            </CardHeader>
            <CardContent>
              {attendanceData.length > 1 ? (
                <AttendanceChart data={attendanceData} />
              ) : (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No attendance recorded yet"
                  description="Create an attendance session to start tracking headcounts over time."
                  action={
                    <Link href="/attendance/new" className={buttonVariants({ size: "sm" })}>
                      Take attendance
                    </Link>
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Upcoming events</CardTitle>
                <CardDescription>The next gatherings on the calendar.</CardDescription>
              </div>
              <Link
                href="/events"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {events.length ? (
                <ul className="divide-y divide-slate-100">
                  {events.map((event) => (
                    <li key={event.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                        <span className="text-[10px] font-semibold uppercase">
                          {new Date(event.starts_at).toLocaleString("en-GB", { month: "short" })}
                        </span>
                        <span className="text-base font-semibold leading-none">
                          {new Date(event.starts_at).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{event.title}</p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(event.starts_at)}
                          {event.location ? ` · ${event.location}` : ""}
                        </p>
                      </div>
                      <Badge variant="neutral">{eventTypeLabel[event.type]}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={CalendarPlus}
                  title="No upcoming events"
                  description="Add your services and gatherings to keep everyone aligned."
                  action={
                    <Link href="/events/new" className={buttonVariants({ size: "sm" })}>
                      Create event
                    </Link>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!isLeader ? (
            <Card>
              <CardHeader>
                <CardTitle>New members</CardTitle>
                <CardDescription>Recently added to the directory.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {members.length ? (
                  <ul className="space-y-3">
                    {members.map((member) => (
                      <li key={member.id} className="flex items-center gap-3">
                        <Avatar
                          firstName={member.first_name}
                          lastName={member.last_name}
                          src={member.photo_url}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/members/${member.id}`}
                            className="block truncate text-sm font-medium text-slate-900 hover:text-indigo-600"
                          >
                            {fullName(member)}
                          </Link>
                          <p className="text-xs text-slate-500">{formatDate(member.joined_date)}</p>
                        </div>
                        <Badge variant={member.status === "visitor" ? "info" : "success"}>
                          {member.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="No members yet"
                    description="Add your first member to get started."
                    action={
                      <Link href="/members/new" className={buttonVariants({ size: "sm" })}>
                        Add member
                      </Link>
                    }
                  />
                )}
                <Link
                  href="/members"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View directory <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Latest announcements</CardTitle>
                <CardDescription>Church-wide and group notices.</CardDescription>
              </div>
              <Link
                href="/communication"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Open <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {announcements.data?.length ? (
                <ul className="space-y-3">
                  {announcements.data.map((announcement) => (
                    <li key={announcement.id} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-sm font-medium text-slate-900">{announcement.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(announcement.publish_at)} · {announcement.audience}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={Megaphone}
                  title="No announcements"
                  description="Keep the congregation informed."
                />
              )}
            </CardContent>
          </Card>

          {isLeader && leaderGroups.length ? (
            <Card>
              <CardHeader>
                <CardTitle>My groups</CardTitle>
                <CardDescription>Rosters you are responsible for.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {leaderGroups.map((group) => (
                    <li key={group.id}>
                      <Link
                        href={`/groups/${group.id}`}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50"
                      >
                        {group.name}
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
