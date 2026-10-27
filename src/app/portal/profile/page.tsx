import type { Metadata } from "next";
import {
  Home,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { getChurchSettings, requireUser } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import type { GroupType, Member } from "@/lib/types";
import { groupTypeLabel, memberStatusVariant, roleLabel } from "@/lib/labels";
import { formatDate, titleCase } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "My profile" };

interface MembershipRow {
  role: string;
  joined_at: string;
  groups: {
    name: string;
    type: GroupType;
    meeting_day: string | null;
    meeting_time: string | null;
    location: string | null;
  } | null;
}

interface HouseholdRow {
  relationship: string;
  families: { name: string; address: string | null } | null;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value || "Not provided"}</dd>
    </div>
  );
}

export default async function PortalProfilePage() {
  const { supabase, profile } = await requireUser();
  const settings = await getChurchSettings(supabase);

  let member: Member | null = null;
  let memberships: MembershipRow[] = [];
  let household: HouseholdRow[] = [];

  if (profile.member_id) {
    const [memberResult, membershipsResult, householdResult] = await Promise.all([
      supabase.from("members").select("*").eq("id", profile.member_id).maybeSingle(),
      supabase
        .from("group_members")
        .select("role, joined_at, groups(name, type, meeting_day, meeting_time, location)")
        .eq("member_id", profile.member_id),
      supabase
        .from("family_members")
        .select("relationship, families(name, address)")
        .eq("member_id", profile.member_id),
    ]);
    member = (memberResult.data as Member | null) ?? null;
    memberships = (membershipsResult.data ?? []) as unknown as MembershipRow[];
    household = (householdResult.data ?? []) as unknown as HouseholdRow[];
  }

  return (
    <div>
      <PageHeader title="My profile" description="Your details as held by the church." />

      {member ? (
        <>
          <Card className="mb-6">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
              <Avatar
                firstName={member.first_name}
                lastName={member.last_name}
                src={member.photo_url}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  {member.first_name} {member.other_names ? `${member.other_names} ` : ""}
                  {member.last_name}
                </h2>
                <p className="text-sm text-slate-500">
                  Member since {formatDate(member.joined_date)}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Badge variant={memberStatusVariant[member.status]}>{member.status}</Badge>
                  <Badge variant="neutral">{roleLabel[profile.role]}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
                <CardDescription>How the church can reach you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <p className="flex items-center gap-2 text-sm text-slate-700">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {member.phone ?? "No phone number on file"}
                </p>
                <p className="flex items-center gap-2 text-sm text-slate-700">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {member.email ?? "No email on file"}
                </p>
                <p className="flex items-start gap-2 text-sm text-slate-700">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {member.address ?? "No address on file"}
                </p>
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  To update any of these details, please contact the church office.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Personal details</CardTitle>
                <CardDescription>Church records for you.</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <dl>
                  <DetailRow label="Date of birth" value={member.date_of_birth ? formatDate(member.date_of_birth) : null} />
                  <DetailRow label="Gender" value={member.gender ? titleCase(member.gender) : null} />
                  <DetailRow
                    label="Marital status"
                    value={member.marital_status ? titleCase(member.marital_status) : null}
                  />
                  <DetailRow label="Phone" value={member.phone} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-indigo-600" /> My groups
                </CardTitle>
                <CardDescription>Ministries and small groups you belong to.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {memberships.length ? (
                  <ul className="space-y-2">
                    {memberships.map((membership, index) => (
                      <li
                        key={`${membership.groups?.name ?? "group"}-${index}`}
                        className="rounded-xl border border-slate-200 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {membership.groups?.name ?? "Group"}
                          </p>
                          {membership.groups ? (
                            <Badge variant="neutral">
                              {groupTypeLabel[membership.groups.type]}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {[
                            membership.groups?.meeting_day,
                            membership.groups?.meeting_time,
                            membership.groups?.location,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "No meeting details"}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    You are not in any groups yet. Speak to the church office to get connected.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-indigo-600" /> My household
                </CardTitle>
                <CardDescription>Family records linked to you.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {household.length ? (
                  <ul className="space-y-2">
                    {household.map((row, index) => (
                      <li
                        key={`${row.families?.name ?? "family"}-${index}`}
                        className="rounded-xl border border-slate-200 px-3 py-2.5"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {row.families?.name ?? "Family"}
                        </p>
                        <p className="text-xs capitalize text-slate-500">{row.relationship}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No household linked to your record.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="mb-6">
          <EmptyState
            icon={UserRound}
            title="Your account is not linked to a member record"
            description="Ask the church office to link your login so your member details, groups and household appear here."
          />
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" /> Account
          </CardTitle>
          <CardDescription>
            {settings.name} · Member portal
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <dl>
            <DetailRow label="Login email" value={profile.email} />
            <DetailRow label="Role" value={roleLabel[profile.role]} />
            <DetailRow label="Church" value={settings.name} />
          </dl>
          <form action={signOut} className="mt-4">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
