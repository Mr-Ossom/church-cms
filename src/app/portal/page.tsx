import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  HandCoins,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { getChurchSettings, requireUser } from "@/lib/auth";
import type { Announcement, ChurchEvent, Member } from "@/lib/types";
import { formatCurrency, formatDate, formatNumber, formatTime } from "@/lib/utils";
import { eventTypeLabel } from "@/lib/labels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Member portal" };

interface AnnouncementRow extends Announcement {
  groups: { name: string } | null;
}

export default async function PortalHomePage() {
  const { supabase, profile } = await requireUser();
  const settings = await getChurchSettings(supabase);
  const nowIso = new Date().toISOString();
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [eventsResult, eventsCountResult, announcementsResult] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, type, starts_at, ends_at, location")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(3),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", nowIso),
    supabase
      .from("announcements")
      .select("id, title, body, publish_at, expires_at, audience, groups(name)")
      .order("publish_at", { ascending: false })
      .limit(6),
  ]);

  const events = (eventsResult.data ?? []) as Pick<
    ChurchEvent,
    "id" | "title" | "type" | "starts_at" | "ends_at" | "location"
  >[];
  const announcements = ((announcementsResult.data ?? []) as unknown as AnnouncementRow[]).filter(
    (announcement) =>
      announcement.publish_at <= nowIso &&
      (!announcement.expires_at || announcement.expires_at > nowIso),
  );

  let member: Member | null = null;
  let givingThisYear = 0;
  let attendanceRate: number | null = null;
  let presentCount = 0;
  let attendanceTotal = 0;

  if (profile.member_id) {
    const [memberResult, donationsResult, attendanceResult] = await Promise.all([
      supabase.from("members").select("*").eq("id", profile.member_id).maybeSingle(),
      supabase
        .from("donations")
        .select("amount")
        .eq("member_id", profile.member_id)
        .gte("donation_date", yearStart),
      supabase
        .from("attendance_records")
        .select("status")
        .eq("member_id", profile.member_id)
        .limit(500),
    ]);

    member = (memberResult.data as Member | null) ?? null;
    givingThisYear = ((donationsResult.data ?? []) as { amount: number }[]).reduce(
      (total, row) => total + Number(row.amount),
      0,
    );
    const records = (attendanceResult.data ?? []) as { status: string }[];
    attendanceTotal = records.length;
    presentCount = records.filter((record) => record.status === "present").length;
    attendanceRate = attendanceTotal ? Math.round((presentCount / attendanceTotal) * 100) : null;
  }

  const firstName =
    (profile.full_name ?? member?.first_name ?? "friend").split(" ")[0] || "friend";
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-indigo-900/20 sm:p-8">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 right-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-indigo-100">
            <Sparkles className="h-3.5 w-3.5" /> Member portal
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Hello, {firstName}
          </h1>
          <p className="mt-1 max-w-md text-sm text-indigo-100">
            {settings.tagline ?? `Welcome to ${settings.name}. Here is what is happening this week.`}
          </p>
          <p className="mt-4 text-xs font-medium text-indigo-200">{todayLabel}</p>
        </div>
      </section>

      {!profile.member_id ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your login is not linked to a member record yet. Ask the church office to link your account
          so your giving and attendance appear here.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Giving this year"
          value={profile.member_id ? formatCurrency(givingThisYear, settings.currency) : "—"}
          hint={profile.member_id ? "Thank you for your generosity" : "Link your member record"}
          icon={HandCoins}
          tone="amber"
        />
        <StatCard
          label="My attendance"
          value={attendanceRate === null ? "—" : `${attendanceRate}%`}
          hint={
            attendanceTotal
              ? `${formatNumber(presentCount)} of ${formatNumber(attendanceTotal)} check-ins`
              : "No attendance records yet"
          }
          icon={ClipboardCheck}
          tone="emerald"
        />
        <StatCard
          label="Upcoming events"
          value={formatNumber(eventsCountResult.count ?? events.length)}
          hint={events[0] ? formatDate(events[0].starts_at) : "Nothing scheduled"}
          icon={CalendarDays}
          tone="indigo"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Next up</CardTitle>
              <CardDescription>Gatherings on the church calendar.</CardDescription>
            </div>
            <Link
              href="/portal/events"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              All events <ArrowRight className="h-3 w-3" />
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
                      <p className="truncate text-xs text-slate-500">
                        {formatTime(event.starts_at)}
                        {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <Badge variant="neutral">{eventTypeLabel[event.type]}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming events"
                description="Check back soon for services and gatherings."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>News from the church family.</CardDescription>
            </div>
            <Link
              href="/portal/announcements"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {announcements.length ? (
              <ul className="space-y-3">
                {announcements.slice(0, 3).map((announcement) => (
                  <li key={announcement.id} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                      <p className="truncate text-sm font-medium text-slate-900">
                        {announcement.title}
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{announcement.body}</p>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {formatDate(announcement.publish_at)}
                      {announcement.groups ? ` · ${announcement.groups.name}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Megaphone}
                title="No announcements"
                description="Church news will appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/portal/giving"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          My giving history
        </Link>
        <Link
          href="/portal/profile"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          My profile
        </Link>
        <Link
          href="/portal/events"
          className={buttonVariants({ variant: "subtle", size: "sm" })}
        >
          Upcoming events <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
