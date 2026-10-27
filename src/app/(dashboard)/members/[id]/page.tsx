import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  HandCoins,
  Mail,
  MapPin,
  Phone,
  Pencil,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { getChurchSettings, requireStaff } from "@/lib/auth";
import type {
  AttendanceStatus,
  Donation,
  GroupType,
  Member,
  Pledge,
  UserRole,
} from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  fullName,
  titleCase,
} from "@/lib/utils";
import {
  attendanceStatusVariant,
  donationMethodLabel,
  donationTypeLabel,
  groupTypeLabel,
  roleVariant,
} from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  addFamilyMembership,
  deleteMember,
  removeFamilyMembership,
} from "../actions";
import { memberStatusVariant } from "@/lib/labels";

export const metadata: Metadata = { title: "Member profile" };

interface FamilyLink {
  id: string;
  family_id: string;
  relationship: string;
  families: { id: string; name: string; address: string | null } | null;
}

interface GroupLink {
  role: string;
  joined_at: string;
  groups: { id: string; name: string; type: GroupType } | null;
}

interface AttendanceRow {
  status: AttendanceStatus;
  checked_in_at: string;
  attendance_sessions: { title: string; session_date: string } | null;
}

interface AccountRow {
  id: string;
  email: string | null;
  role: UserRole;
  full_name: string | null;
}

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireStaff();
  const { id } = await params;
  const { ok, error } = await searchParams;
  const isAdmin = profile.role === "admin";

  const { data: memberData } = await supabase.from("members").select("*").eq("id", id).maybeSingle();
  if (!memberData) notFound();
  const member = memberData as Member;

  const [familyLinksResult, groupLinksResult, attendanceResult, familiesResult, accountResult, settings] =
    await Promise.all([
      supabase
        .from("family_members")
        .select("id, family_id, relationship, families(id, name, address)")
        .eq("member_id", id),
      supabase
        .from("group_members")
        .select("role, joined_at, groups(id, name, type)")
        .eq("member_id", id),
      supabase
        .from("attendance_records")
        .select("status, checked_in_at, attendance_sessions(title, session_date)")
        .eq("member_id", id)
        .order("checked_in_at", { ascending: false })
        .limit(12),
      isAdmin
        ? supabase.from("families").select("id, name").order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      isAdmin
        ? supabase.from("profiles").select("id, email, role, full_name").eq("member_id", id)
        : Promise.resolve({ data: [] as AccountRow[] }),
      getChurchSettings(supabase),
    ]);

  let donations: Donation[] = [];
  let pledges: Pledge[] = [];
  if (isAdmin) {
    const [donationsResult, pledgesResult] = await Promise.all([
      supabase
        .from("donations")
        .select("*")
        .eq("member_id", id)
        .order("donation_date", { ascending: false }),
      supabase
        .from("pledges")
        .select("*")
        .eq("member_id", id)
        .order("start_date", { ascending: false }),
    ]);
    donations = (donationsResult.data ?? []) as Donation[];
    pledges = (pledgesResult.data ?? []) as Pledge[];
  }

  const familyLinks = (familyLinksResult.data ?? []) as unknown as FamilyLink[];
  const groupLinks = (groupLinksResult.data ?? []) as unknown as GroupLink[];
  const attendance = (attendanceResult.data ?? []) as unknown as AttendanceRow[];
  const families = (familiesResult.data ?? []) as { id: string; name: string }[];
  const accounts = (accountResult.data ?? []) as AccountRow[];

  const totalGiven = donations.reduce((total, donation) => total + Number(donation.amount), 0);
  const paidByPledge = new Map<string, number>();
  donations.forEach((donation) => {
    if (donation.pledge_id) {
      paidByPledge.set(
        donation.pledge_id,
        (paidByPledge.get(donation.pledge_id) ?? 0) + Number(donation.amount),
      );
    }
  });

  return (
    <div>
      <Link href="/members" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}>
        <ArrowLeft className="h-4 w-4" /> Back to members
      </Link>

      <PageHeader
        title={fullName(member)}
        description={`${member.status === "visitor" ? "Visitor" : "Member"} since ${formatDate(member.joined_date)}`}
        actions={
          isAdmin ? (
            <>
              <Link
                href={`/members/${member.id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Pencil className="h-4 w-4" /> Edit
              </Link>
              <form action={deleteMember}>
                <input type="hidden" name="id" value={member.id} />
                <ConfirmButton
                  variant="danger"
                  message={`Delete ${fullName(member)}? This also removes their group and family links. Giving records stay but become anonymous.`}
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
            <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar
                firstName={member.first_name}
                lastName={member.last_name}
                src={member.photo_url}
                size="lg"
                className="h-20 w-20 text-2xl ring-4 ring-slate-50"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{fullName(member)}</h2>
                  <Badge variant={memberStatusVariant[member.status]}>{member.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" /> {member.phone ?? "No phone"}
                  </span>
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" /> {member.email ?? "No email"}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" /> {member.address ?? "No address"}
                  </span>
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" /> Joined{" "}
                    {formatDate(member.joined_date)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Household</CardTitle>
              <CardDescription>Family and household connections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {familyLinks.length ? (
                <ul className="divide-y divide-slate-100">
                  {familyLinks.map((link) => (
                    <li key={link.id} className="flex items-center justify-between gap-3 py-2 first:pt-0">
                      <div>
                        {link.families ? (
                          <Link
                            href={`/families/${link.families.id}`}
                            className="text-sm font-medium text-slate-900 hover:text-indigo-600"
                          >
                            {link.families.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-500">Unknown family</span>
                        )}
                        <p className="text-xs capitalize text-slate-500">
                          {titleCase(link.relationship)}
                        </p>
                      </div>
                      {isAdmin ? (
                        <form action={removeFamilyMembership}>
                          <input type="hidden" name="id" value={link.id} />
                          <input type="hidden" name="member_id" value={member.id} />
                          <input type="hidden" name="family_id" value={link.family_id} />
                          <ConfirmButton
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50"
                            message="Remove this person from the family?"
                          >
                            Remove
                          </ConfirmButton>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Not linked to a household yet.</p>
              )}

              {isAdmin && families.length ? (
                <form action={addFamilyMembership} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center">
                  <input type="hidden" name="member_id" value={member.id} />
                  <Select name="family_id" required className="sm:flex-1">
                    <option value="">Add to family...</option>
                    {families.map((family) => (
                      <option key={family.id} value={family.id}>
                        {family.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    name="relationship"
                    placeholder="Relationship (e.g. spouse)"
                    className="sm:w-48"
                  />
                  <SubmitButton variant="secondary" size="md" pendingLabel="Adding...">
                    Add
                  </SubmitButton>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Groups & ministries</CardTitle>
              <CardDescription>Where this member serves.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {groupLinks.length ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {groupLinks.map((link, index) => (
                    <li key={`${link.groups?.id ?? index}`} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        {link.groups ? (
                          <Link
                            href={`/groups/${link.groups.id}`}
                            className="text-sm font-medium text-slate-900 hover:text-indigo-600"
                          >
                            {link.groups.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-500">Unknown group</span>
                        )}
                        <Badge variant="neutral" className="capitalize">
                          {link.role}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {link.groups ? groupTypeLabel[link.groups.type] : ""} · joined{" "}
                        {formatDate(link.joined_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Not part of any group yet.</p>
              )}
              <Link
                href="/groups"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <UsersRound className="h-3.5 w-3.5" /> Manage groups
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance history</CardTitle>
              <CardDescription>Recent check-ins and recorded statuses.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {attendance.length ? (
                <ul className="divide-y divide-slate-100">
                  {attendance.map((record, index) => (
                    <li key={index} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {record.attendance_sessions?.title ?? "Attendance session"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(record.attendance_sessions?.session_date ?? record.checked_in_at)}
                        </p>
                      </div>
                      <Badge variant={attendanceStatusVariant[record.status]}>
                        {record.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No attendance records for this member yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Giving</CardTitle>
                <CardDescription>Recorded contributions.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Total given</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-900">
                    {formatCurrency(totalGiven, settings.currency)}
                  </p>
                  <p className="text-xs text-amber-700">{donations.length} recorded gifts</p>
                </div>

                {donations.length ? (
                  <ul className="mt-4 space-y-3">
                    {donations.slice(0, 6).map((donation) => (
                      <li key={donation.id} className="flex items-center justify-between gap-2 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">
                            {formatCurrency(Number(donation.amount), donation.currency)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {donationTypeLabel[donation.type]} · {donationMethodLabel[donation.method]}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500">{formatDate(donation.donation_date)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No giving recorded yet.</p>
                )}

                {pledges.length ? (
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pledges</p>
                    <div className="mt-3 space-y-3">
                      {pledges.map((pledge) => {
                        const paid = paidByPledge.get(pledge.id) ?? 0;
                        const percent = Math.min(100, Math.round((paid / Number(pledge.amount)) * 100));
                        return (
                          <div key={pledge.id}>
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>{formatCurrency(Number(pledge.amount), settings.currency)}</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Paid {formatCurrency(paid, settings.currency)} · through{" "}
                              {pledge.end_date ? formatDate(pledge.end_date) : "open"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <Link
                  href={`/giving?member=${member.id}`}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <HandCoins className="h-3.5 w-3.5" /> Open giving records
                </Link>
              </CardContent>
            </Card>
          ) : null}

          {isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Portal account</CardTitle>
                <CardDescription>Login linked to this member.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {accounts.length ? (
                  <ul className="space-y-3">
                    {accounts.map((account) => (
                      <li key={account.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{account.email}</p>
                          <p className="text-xs text-slate-500">{account.full_name}</p>
                        </div>
                        <Badge variant={roleVariant[account.role]}>{account.role}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    No login is linked. Invite the member from Settings → Team, then link this record.
                  </p>
                )}
                <Link
                  href="/settings"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <UserRound className="h-3.5 w-3.5" /> Manage team
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Pastoral notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <p className="whitespace-pre-line text-sm text-slate-600">
                {member.notes ?? "No notes recorded."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
