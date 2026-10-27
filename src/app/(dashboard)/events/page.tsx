import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarPlus, MapPin } from "lucide-react";
import { requireTeam } from "@/lib/auth";
import type { ChurchEvent } from "@/lib/types";
import { formatDateTime, formatTime } from "@/lib/utils";
import { eventTypeLabel, eventVisibilityLabel } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Events" };

const tabs = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
] as const;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; type?: string; ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireTeam();
  const params = await searchParams;
  const view = ["upcoming", "past", "all"].includes(params.view ?? "") ? params.view! : "upcoming";
  const type = params.type ?? "";
  const canCreate = profile.role === "admin" || profile.role === "leader";
  const now = new Date().toISOString();

  let query = supabase
    .from("events")
    .select("*, group:groups(id, name)")
    .order("starts_at", { ascending: view === "upcoming" });

  if (view === "upcoming") query = query.gte("starts_at", now).limit(100);
  else if (view === "past") query = query.lt("starts_at", now).limit(100);
  else query = query.limit(100);

  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  const events = (data ?? []) as ChurchEvent[];

  return (
    <div>
      <PageHeader
        title="Events"
        description="Services, meetings and special gatherings."
        actions={
          canCreate ? (
            <Link href="/events/new" className={buttonVariants()}>
              <CalendarPlus className="h-4 w-4" /> New event
            </Link>
          ) : undefined
        }
      />

      <Flash ok={params.ok} error={params.error ?? error?.message} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={`/events?view=${tab.value}${type ? `&type=${type}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                view === tab.value
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/events?view=${view}`}
            className={`rounded-lg px-2.5 py-1.5 ${
              !type ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All types
          </Link>
          {(["service", "event", "meeting"] as const).map((value) => (
            <Link
              key={value}
              href={`/events?view=${view}&type=${value}`}
              className={`rounded-lg px-2.5 py-1.5 capitalize ${
                type === value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {value}
            </Link>
          ))}
        </div>
      </div>

      {events.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {events.map((event) => {
              const start = new Date(event.starts_at);
              return (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:px-5"
                  >
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                      <span className="text-[10px] font-semibold uppercase">
                        {start.toLocaleString("en-GB", { month: "short" })}
                      </span>
                      <span className="text-xl font-semibold leading-none">{start.getDate()}</span>
                      <span className="mt-0.5 text-[10px] font-medium">{formatTime(start)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{event.title}</p>
                        <Badge variant="neutral">{eventTypeLabel[event.type]}</Badge>
                        {event.visibility !== "all" ? (
                          <Badge variant="warning">{eventVisibilityLabel[event.visibility]}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(event.starts_at)}
                        {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {event.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {event.location}
                          </span>
                        ) : null}
                        {event.group?.name ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" /> {event.group.name}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <span className="hidden text-xs font-medium text-indigo-600 sm:inline">Open</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title={view === "past" ? "No past events" : "No events scheduled"}
            description={
              canCreate
                ? "Create a service, meeting or special gathering."
                : "Events will appear here once they are scheduled."
            }
            action={
              canCreate ? (
                <Link href="/events/new" className={buttonVariants({ size: "sm" })}>
                  New event
                </Link>
              ) : undefined
            }
          />
        </Card>
      )}
    </div>
  );
}
