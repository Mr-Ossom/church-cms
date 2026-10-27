import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardCheck,
  Download,
  HandCoins,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { getChurchSettings, requireStaff } from "@/lib/auth";
import type { DonationMethod, DonationType, MemberStatus } from "@/lib/types";
import { donationTypeLabel, memberStatusVariant } from "@/lib/labels";
import { formatCurrency, formatDate, formatNumber, monthLabel } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { TrendChart } from "@/components/charts/trend-chart";

export const metadata: Metadata = { title: "Reports" };

interface SummaryRow {
  month: string;
  donation_type: DonationType;
  method: DonationMethod;
  total: number;
  donations: number;
}

interface SessionRow {
  session_date: string;
  headcount: number;
  events: {
    title: string;
    group_id: string | null;
    groups: { id: string; name: string } | null;
  } | null;
}

const statusOrder: MemberStatus[] = ["active", "visitor", "inactive", "transferred"];
const statusLabel: Record<MemberStatus, string> = {
  active: "Active",
  visitor: "Visitors",
  inactive: "Inactive",
  transferred: "Transferred",
};

export default async function ReportsPage() {
  const { supabase, profile } = await requireStaff();
  const settings = await getChurchSettings(supabase);
  const isAdmin = profile.role === "admin";

  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: monthLabel(date),
    };
  });
  const firstMonthKey = months[0].key;
  const currentMonthKey = months[months.length - 1].key;

  const [membersResult, sessionsResult, summaryResult] = await Promise.all([
    supabase.from("members").select("joined_date, status").order("joined_date", { ascending: true }),
    supabase
      .from("attendance_sessions")
      .select("session_date, headcount, events(title, group_id, groups(id, name))")
      .order("session_date", { ascending: true })
      .limit(500),
    supabase.rpc("donation_summary"),
  ]);

  const memberRows = (membersResult.data ?? []) as { joined_date: string; status: MemberStatus }[];
  const sessions = (sessionsResult.data ?? []) as unknown as SessionRow[];
  const summary = ((summaryResult.data ?? []) as SummaryRow[]).map((row) => ({
    ...row,
    total: Number(row.total),
    donations: Number(row.donations),
  }));

  const statusCounts = statusOrder.reduce(
    (counts, status) => {
      counts[status] = memberRows.filter((member) => member.status === status).length;
      return counts;
    },
    {} as Record<MemberStatus, number>,
  );
  const totalMembers = memberRows.length;
  const activeMembers = statusCounts.active;
  const newThisMonth = memberRows.filter(
    (member) => member.joined_date.slice(0, 7) === currentMonthKey,
  ).length;

  const membershipSeries = months.map((month) => ({
    label: month.label,
    value: memberRows.filter((member) => member.joined_date.slice(0, 7) <= month.key).length,
  }));

  const recentSessions = sessions.slice(-8);
  const averageAttendance = recentSessions.length
    ? Math.round(
        recentSessions.reduce((total, session) => total + session.headcount, 0) /
          recentSessions.length,
      )
    : 0;

  const attendanceByMonth = new Map<string, { total: number; sessions: number }>();
  const attendanceByGroup = new Map<string, { total: number; sessions: number }>();
  sessions.forEach((session) => {
    const key = session.session_date.slice(0, 7);
    const month = attendanceByMonth.get(key) ?? { total: 0, sessions: 0 };
    month.total += session.headcount;
    month.sessions += 1;
    attendanceByMonth.set(key, month);

    const groupName = session.events?.groups?.name ?? "Church-wide";
    const group = attendanceByGroup.get(groupName) ?? { total: 0, sessions: 0 };
    group.total += session.headcount;
    group.sessions += 1;
    attendanceByGroup.set(groupName, group);
  });

  const attendanceSeries = months.map((month) => {
    const entry = attendanceByMonth.get(month.key);
    return {
      label: month.label,
      value: entry ? Math.round(entry.total / entry.sessions) : 0,
    };
  });

  const groupRows = Array.from(attendanceByGroup)
    .map(([name, stats]) => ({
      name,
      sessions: stats.sessions,
      total: stats.total,
      average: Math.round(stats.total / stats.sessions),
    }))
    .sort((a, b) => b.total - a.total);

  const givingByMonth = new Map<string, number>();
  summary.forEach((row) => {
    givingByMonth.set(row.month, (givingByMonth.get(row.month) ?? 0) + row.total);
  });
  const givingSeries = months.map((month) => ({
    label: month.label,
    value: givingByMonth.get(month.key) ?? 0,
  }));
  const givingThisMonth = givingByMonth.get(currentMonthKey) ?? 0;
  const hasGiving = summary.length > 0;

  const givingByType = new Map<DonationType, number>();
  summary
    .filter((row) => row.month >= firstMonthKey)
    .forEach((row) => {
      givingByType.set(row.donation_type, (givingByType.get(row.donation_type) ?? 0) + row.total);
    });
  const givingTypeRows = Array.from(givingByType).sort((a, b) => b[1] - a[1]);
  const givingTypeTotal = givingTypeRows.reduce((total, [, amount]) => total + amount, 0);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Membership, attendance and giving trends for the last 12 months."
        actions={
          <>
            <Link
              href="/api/reports/attendance/export"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Download className="h-3.5 w-3.5" /> Attendance CSV
            </Link>
            {isAdmin ? (
              <Link
                href="/api/reports/giving/export"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Download className="h-3.5 w-3.5" /> Giving CSV
              </Link>
            ) : null}
            <Link
              href="/api/members/export"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Download className="h-3.5 w-3.5" /> Members CSV
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active members"
          value={formatNumber(activeMembers)}
          hint={`${formatNumber(totalMembers)} people on record`}
          icon={Users}
          tone="indigo"
        />
        <StatCard
          label="New this month"
          value={formatNumber(newThisMonth)}
          hint={`${formatNumber(statusCounts.visitor)} visitors to follow up`}
          icon={UserPlus}
          tone="sky"
        />
        <StatCard
          label="Avg attendance"
          value={formatNumber(averageAttendance)}
          hint="Across the last 8 sessions"
          icon={ClipboardCheck}
          tone="emerald"
        />
        <StatCard
          label="Giving this month"
          value={formatCurrency(givingThisMonth, settings.currency)}
          hint="All contribution types"
          icon={HandCoins}
          tone="amber"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Membership growth</CardTitle>
            <CardDescription>Cumulative member records by month.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <TrendChart data={membershipSeries} color="#4f46e5" valueLabel="Members" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership breakdown</CardTitle>
            <CardDescription>How the directory is distributed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {statusOrder.map((status) => {
              const count = statusCounts[status];
              const percent = totalMembers ? Math.round((count / totalMembers) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{statusLabel[status]}</span>
                    <span className="font-medium text-slate-900">
                      {formatNumber(count)} · {percent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="border-t border-slate-100 pt-4">
              <Badge variant={memberStatusVariant.active}>
                {formatNumber(statusCounts.active)} active members
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Average attendance</CardTitle>
            <CardDescription>Mean headcount per recorded session, by month.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {sessions.length ? (
              <TrendChart data={attendanceSeries} color="#059669" valueLabel="Avg headcount" />
            ) : (
              <EmptyState
                icon={ClipboardCheck}
                title="No attendance recorded yet"
                description="Record a session to see attendance trends here."
              />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Attendance by group</CardTitle>
            <CardDescription>All-time recorded headcounts.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            {groupRows.length ? (
              <TableWrap>
                <Table>
                  <THead>
                    <tr>
                      <TH>Group</TH>
                      <TH className="text-right">Sessions</TH>
                      <TH className="text-right">Avg</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {groupRows.map((group) => (
                      <TR key={group.name}>
                        <TD className="text-sm font-medium text-slate-900">{group.name}</TD>
                        <TD className="text-right text-sm text-slate-500">{group.sessions}</TD>
                        <TD className="text-right text-sm font-medium text-slate-900">
                          {formatNumber(group.average)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            ) : (
              <p className="px-5 pb-5 text-sm text-slate-500">No attendance data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Giving trend</CardTitle>
            <CardDescription>Aggregated contributions over the last 12 months.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {hasGiving ? (
              <TrendChart
                data={givingSeries}
                color="#d97706"
                valueLabel="Total giving"
                format="currency"
                currency={settings.currency}
              />
            ) : (
              <EmptyState
                icon={HandCoins}
                title="No giving recorded yet"
                description="Contributions will start appearing here once recorded."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Giving by type</CardTitle>
            <CardDescription>Last 12 months, all methods.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {givingTypeRows.length ? (
              givingTypeRows.map(([type, amount]) => {
                const percent = givingTypeTotal
                  ? Math.round((amount / givingTypeTotal) * 100)
                  : 0;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{donationTypeLabel[type]}</span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(amount, settings.currency)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No giving recorded in this period.</p>
            )}
            {hasGiving ? (
              <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                Total: {formatCurrency(givingTypeTotal, settings.currency)} · Last recorded{" "}
                {formatDate(
                  summary.reduce(
                    (latest, row) => (row.month > latest ? row.month : latest),
                    summary[0]?.month ?? "",
                  ) + "-01",
                )}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <TrendingUp className="h-3.5 w-3.5" />
        {isAdmin
          ? "As an administrator you can download the full individual giving records."
          : "Individual giving records are restricted to administrators; totals are aggregate only."}
      </div>
    </div>
  );
}
