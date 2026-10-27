import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, Plus, Search, UsersRound } from "lucide-react";
import { requireTeam } from "@/lib/auth";
import type { GroupType } from "@/lib/types";
import { groupTypeLabel } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Groups & ministries" };

interface GroupCard {
  id: string;
  name: string;
  type: GroupType;
  description: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  location: string | null;
  leader: { first_name: string; last_name: string } | null;
  group_members: { count: number }[];
}

const typeTone: Record<GroupType, "brand" | "info" | "success"> = {
  ministry: "brand",
  department: "info",
  small_group: "success",
};

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireTeam();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const type = params.type ?? "";

  let query = supabase
    .from("groups")
    .select(
      "id, name, type, description, meeting_day, meeting_time, location, leader:members!groups_leader_id_fkey(first_name, last_name), group_members(count)",
    )
    .order("name", { ascending: true });

  if (q) query = query.ilike("name", `%${q.replace(/[%,()]/g, " ")}%`);
  if (type) query = query.eq("type", type);
  if (profile.role === "leader") {
    query = query.eq("leader_id", profile.member_id ?? "00000000-0000-0000-0000-000000000000");
  }

  const { data, error } = await query;
  const groups = (data ?? []) as unknown as GroupCard[];

  return (
    <div>
      <PageHeader
        title="Groups & ministries"
        description="Departments, ministries and small groups — the places where community happens."
        actions={
          profile.role === "admin" ? (
            <Link href="/groups/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" /> New group
            </Link>
          ) : undefined
        }
      />

      <Flash ok={params.ok} error={params.error ?? error?.message} />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <form className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center" method="get">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input name="q" defaultValue={q} placeholder="Search groups" className="pl-9" />
            </div>
            <Select name="type" defaultValue={type} className="sm:w-48">
              <option value="">All types</option>
              <option value="ministry">Ministries</option>
              <option value="department">Departments</option>
              <option value="small_group">Small groups</option>
            </Select>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
            {q || type ? (
              <Link href="/groups" className={buttonVariants({ variant: "ghost" })}>
                Clear
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {groups.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const memberCount = group.group_members?.[0]?.count ?? 0;
            return (
              <Link key={group.id} href={`/groups/${group.id}`} className="group block">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                        <UsersRound className="h-5 w-5" />
                      </span>
                      <Badge variant={typeTone[group.type]}>{groupTypeLabel[group.type]}</Badge>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-slate-900 group-hover:text-indigo-600">
                      {group.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">
                      {group.description ?? "No description yet."}
                    </p>
                    <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                      <p>
                        <span className="font-medium text-slate-700">Leader:</span>{" "}
                        {group.leader ? `${group.leader.first_name} ${group.leader.last_name}` : "Unassigned"}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {group.meeting_day
                          ? `${group.meeting_day}${group.meeting_time ? ` · ${group.meeting_time}` : ""}`
                          : "No meeting schedule"}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                      <span className="font-medium text-slate-700">
                        {memberCount} {memberCount === 1 ? "member" : "members"}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-indigo-600">
                        Open <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={UsersRound}
            title={
              q || type
                ? "No groups match your filters"
                : profile.role === "leader"
                  ? "No groups assigned to you yet"
                  : "No groups yet"
            }
            description={
              q || type
                ? "Try another search or clear the filters."
                : profile.role === "leader"
                  ? "An administrator can assign you as a group leader."
                  : "Create your first ministry, department or small group."
            }
            action={
              profile.role === "admin" ? (
                <Link href="/groups/new" className={buttonVariants({ size: "sm" })}>
                  New group
                </Link>
              ) : undefined
            }
          />
        </Card>
      )}
    </div>
  );
}
