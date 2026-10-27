import type { Metadata } from "next";
import { CalendarDays, CalendarPlus, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import type { EventType } from "@/lib/types";
import { eventTypeLabel } from "@/lib/labels";
import { formatDate, formatTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Events" };

interface PortalEvent {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  groups: { name: string } | null;
}

function EventRow({ event, past = false }: { event: PortalEvent; past?: boolean }) {
  return (
    <li className={`flex gap-3 px-5 py-4 ${past ? "opacity-75" : ""}`}>
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
        <span className="text-[10px] font-semibold uppercase">
          {new Date(event.starts_at).toLocaleString("en-GB", { month: "short" })}
        </span>
        <span className="text-base font-semibold leading-none">
          {new Date(event.starts_at).getDate()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{event.title}</p>
          <Badge variant="neutral">{eventTypeLabel[event.type]}</Badge>
          {event.groups ? <Badge variant="info">{event.groups.name}</Badge> : null}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
          {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}
        </p>
        {event.location ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3 w-3" /> {event.location}
          </p>
        ) : null}
        {event.description ? (
          <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-slate-600">
            {event.description}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export default async function PortalEventsPage() {
  const { supabase } = await requireUser();
  const nowIso = new Date().toISOString();

  const [upcomingResult, pastResult] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, description, type, starts_at, ends_at, location, groups(name)")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(10),
    supabase
      .from("events")
      .select("id, title, description, type, starts_at, ends_at, location, groups(name)")
      .lt("starts_at", nowIso)
      .order("starts_at", { ascending: false })
      .limit(6),
  ]);

  const upcoming = (upcomingResult.data ?? []) as unknown as PortalEvent[];
  const past = (pastResult.data ?? []) as unknown as PortalEvent[];

  return (
    <div>
      <PageHeader
        title="Events"
        description="Services, meetings and gatherings coming up."
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {upcoming.length ? (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarPlus}
              title="No upcoming events"
              description="Check back soon — the calendar will fill up here."
            />
          )}
        </CardContent>
      </Card>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Recently held
      </h2>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {past.length ? (
            <ul className="divide-y divide-slate-100">
              {past.map((event) => (
                <EventRow key={event.id} event={event} past />
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarDays} title="No past events yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
