import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardCheck, Trash2, UserPlus, UsersRound } from "lucide-react";
import { requireTeam } from "@/lib/auth";
import type { AttendanceSession, ChurchEvent, Group, MemberStatus } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  attendanceStatusVariant,
  eventTypeLabel,
  groupTypeLabel,
  memberStatusVariant,
} from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupForm } from "@/components/groups/group-form";
import {
  addGroupMember,
  deleteGroup,
  removeGroupMember,
} from "../actions";

export const metadata: Metadata = { title: "Group" };

interface RosterRow {
  id: string;
  role: string;
  joined_at: string;
  members: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    status: MemberStatus;
    photo_url: string | null;
  } | null;
}

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireTeam();
  const { id } = await params;
  const { ok, error } = await searchParams;

  const { data: groupData } = await supabase
    .from("groups")
    .select("*, leader:members!groups_leader_id_fkey(id, first_name, last_name)")
    .eq("id", id)
    .maybeSingle();

  if (!groupData) notFound();
  const group = groupData as unknown as Group & {
    leader: { id: string; first_name: string; last_name: string } | null;
  };

  if (profile.role === "leader" && group.leader_id !== profile.member_id) {
    redirect("/groups?error=You can only view groups you lead.");
  }

  const isAdmin = profile.role === "admin";
  const canEdit = isAdmin || (profile.role === "leader" && group.leader_id === profile.member_id);

  const [rosterResult, eventsResult, candidatesResult, leadersResult] = await Promise.all([
    supabase
      .from("group_members")
      .select(
        "id, role, joined_at, members(id, first_name, last_name, phone, email, status, photo_url)",
      )
      .eq("group_id", id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .eq("group_id", id)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),
    isAdmin
      ? supabase.from("members").select("id, first_name, last_name").order("first_name")
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
    isAdmin
      ? supabase.from("members").select("id, first_name, last_name").order("first_name")
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
  ]);

  const roster = (rosterResult.data ?? []) as unknown as RosterRow[];
  const events = (eventsResult.data ?? []) as ChurchEvent[];
  const rosterIds = new Set(roster.map((row) => row.members?.id).filter(Boolean));
  const candidates = ((candidatesResult.data ?? []) as { id: string; first_name: string; last_name: string }[]).filter(
    (member) => !rosterIds.has(member.id),
  );
  const leaders = (leadersResult.data ?? []) as { id: string; first_name: string; last_name: string }[];

  const eventIds = events.map((event) => event.id);
  let sessions: AttendanceSession[] = [];
  if (eventIds.length) {
    const { data: sessionData } = await supabase
      .from("attendance_sessions")
      .select("*")
      .in("event_id", eventIds)
      .order("session_date", { ascending: false })
      .limit(5);
    sessions = (sessionData ?? []) as AttendanceSession[];
  }

  return (
    <div>
      <Link href="/groups" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}>
        <ArrowLeft className="h-4 w-4" /> Back to groups
      </Link>

      <PageHeader
        title={group.name}
        description={`${groupTypeLabel[group.type]} · ${roster.length} ${
          roster.length === 1 ? "member" : "members"
        }`}
        actions={
          isAdmin ? (
            <form action={deleteGroup}>
              <input type="hidden" name="id" value={group.id} />
              <ConfirmButton
                variant="danger"
                message="Delete this group? Event links and the roster will be removed. Members stay in the directory."
              >
                <Trash2 className="h-4 w-4" /> Delete group
              </ConfirmButton>
            </form>
          ) : undefined
        }
      />

      <Flash ok={ok} error={error} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Roster</CardTitle>
              <CardDescription>People serving in this group.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {roster.length ? (
                <ul className="divide-y divide-slate-100">
                  {roster.map((row) => (
                    <li key={row.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <Avatar
                        firstName={row.members?.first_name}
                        lastName={row.members?.last_name}
                        src={row.members?.photo_url}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        {row.members ? (
                          <Link
                            href={`/members/${row.members.id}`}
                            className="block truncate text-sm font-medium text-slate-900 hover:text-indigo-600"
                          >
                            {row.members.first_name} {row.members.last_name}
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-500">Unknown member</span>
                        )}
                        <p className="text-xs text-slate-500">
                          {row.members?.phone ?? row.members?.email ?? "No contact"} · joined{" "}
                          {formatDate(row.joined_at)}
                        </p>
                      </div>
                      {row.members ? (
                        <Badge variant={memberStatusVariant[row.members.status]}>
                          {row.members.status}
                        </Badge>
                      ) : null}
                      <Badge variant="neutral" className="capitalize">
                        {row.role}
                      </Badge>
                      {isAdmin ? (
                        <form action={removeGroupMember}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="group_id" value={group.id} />
                          <ConfirmButton
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50"
                            message="Remove this member from the group?"
                          >
                            Remove
                          </ConfirmButton>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={UsersRound}
                  title="No members yet"
                  description="Add people to this group to see them here."
                />
              )}

              {isAdmin && candidates.length ? (
                <form
                  action={addGroupMember}
                  className="mt-5 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center"
                >
                  <input type="hidden" name="group_id" value={group.id} />
                  <Select name="member_id" required className="sm:flex-1">
                    <option value="">Choose a member...</option>
                    {candidates.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </Select>
                  <Select name="role" defaultValue="member" className="sm:w-36">
                    <option value="member">Member</option>
                    <option value="leader">Leader</option>
                    <option value="assistant">Assistant</option>
                  </Select>
                  <SubmitButton variant="secondary" pendingLabel="Adding...">
                    <UserPlus className="h-4 w-4" /> Add
                  </SubmitButton>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Upcoming group events</CardTitle>
                <CardDescription>Gatherings linked to this group.</CardDescription>
              </div>
              {canEdit ? (
                <Link
                  href={`/events/new?group=${group.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <CalendarDays className="h-3.5 w-3.5" /> New event
                </Link>
              ) : null}
            </CardHeader>
            <CardContent className="pt-4">
              {events.length ? (
                <ul className="divide-y divide-slate-100">
                  {events.map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <Link
                          href={`/events/${event.id}`}
                          className="truncate text-sm font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {event.title}
                        </Link>
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
                  icon={CalendarDays}
                  title="No upcoming events"
                  description="Schedule a meeting or rehearsal for this group."
                />
              )}
            </CardContent>
          </Card>

          {sessions.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent attendance</CardTitle>
                <CardDescription>Latest recorded sessions for group events.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <div>
                        <Link
                          href={`/attendance/${session.id}`}
                          className="text-sm font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {session.title}
                        </Link>
                        <p className="text-xs text-slate-500">{formatDate(session.session_date)}</p>
                      </div>
                      <Badge variant={attendanceStatusVariant.present}>
                        <ClipboardCheck className="h-3 w-3" /> {session.headcount}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Group details</CardTitle>
              <CardDescription>
                {group.leader
                  ? `Led by ${group.leader.first_name} ${group.leader.last_name}`
                  : "No leader assigned"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {canEdit ? (
                <GroupForm group={group} leaders={leaders} canAssignLeader={isAdmin} />
              ) : (
                <div className="space-y-3 text-sm text-slate-600">
                  <p>
                    <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Description
                    </span>
                    {group.description ?? "—"}
                  </p>
                  <p>
                    <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Meeting
                    </span>
                    {group.meeting_day ?? "—"}
                    {group.meeting_time ? ` · ${group.meeting_time}` : ""}
                  </p>
                  <p>
                    <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Location
                    </span>
                    {group.location ?? "—"}
                  </p>
                  <Badge variant={group.active ? "success" : "neutral"}>
                    {group.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
