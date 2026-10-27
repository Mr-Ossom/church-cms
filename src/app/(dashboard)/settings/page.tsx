import type { Metadata } from "next";
import { Building2, History, MailPlus, ShieldCheck, UserCog } from "lucide-react";
import { getChurchSettings, requireAdmin } from "@/lib/auth";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import type { AuditLog, Member, Profile } from "@/lib/types";
import { roleLabel, roleVariant } from "@/lib/labels";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { updateChurchSettings, inviteTeamMember, updateTeamMember } from "./actions";

export const metadata: Metadata = { title: "Settings" };

interface AuditRow extends AuditLog {
  profiles: { full_name: string | null; email: string | null } | null;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireAdmin();
  const settings = await getChurchSettings(supabase);
  const params = await searchParams;
  const serviceRoleConfigured = isServiceRoleConfigured();

  const [profilesResult, membersResult, auditResult] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase
      .from("members")
      .select("id, first_name, last_name, status")
      .order("first_name", { ascending: true }),
    supabase
      .from("audit_logs")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const profiles = (profilesResult.data ?? []) as Profile[];
  const members = (membersResult.data ?? []) as Pick<
    Member,
    "id" | "first_name" | "last_name" | "status"
  >[];
  const logs = (auditResult.data ?? []) as unknown as AuditRow[];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Church profile, team access, and a record of important changes."
      />

      <Flash ok={params.ok} error={params.error} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" /> Church profile
            </CardTitle>
            <CardDescription>
              These details appear across the app, receipts and member communications.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form action={updateChurchSettings} className="grid gap-4 sm:grid-cols-2">
              <Field label="Church name" htmlFor="settings_name">
                <Input id="settings_name" name="name" defaultValue={settings.name} required />
              </Field>
              <Field label="Tagline" htmlFor="settings_tagline">
                <Input id="settings_tagline" name="tagline" defaultValue={settings.tagline ?? ""} />
              </Field>
              <Field label="Address" htmlFor="settings_address" className="sm:col-span-2">
                <Input id="settings_address" name="address" defaultValue={settings.address ?? ""} />
              </Field>
              <Field label="Currency" htmlFor="settings_currency" hint="ISO code, e.g. GHS or USD">
                <Input id="settings_currency" name="currency" defaultValue={settings.currency} required />
              </Field>
              <Field
                label="Country code"
                htmlFor="settings_country_code"
                hint="Used to normalise phone numbers"
              >
                <Input
                  id="settings_country_code"
                  name="country_code"
                  defaultValue={settings.country_code}
                  required
                />
              </Field>
              <Field label="Timezone" htmlFor="settings_timezone">
                <Input id="settings_timezone" name="timezone" defaultValue={settings.timezone} required />
              </Field>
              <Field label="WhatsApp number" htmlFor="settings_whatsapp">
                <Input
                  id="settings_whatsapp"
                  name="whatsapp_number"
                  defaultValue={settings.whatsapp_number ?? ""}
                  placeholder="+233..."
                />
              </Field>
              <Field label="SMS sender ID" htmlFor="settings_sender" hint="Optional alphanumeric sender">
                <Input
                  id="settings_sender"
                  name="sms_sender_id"
                  defaultValue={settings.sms_sender_id ?? ""}
                />
              </Field>
              <Field label="Logo URL" htmlFor="settings_logo">
                <Input
                  id="settings_logo"
                  name="logo_url"
                  defaultValue={settings.logo_url ?? ""}
                  placeholder="https://..."
                />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton pendingLabel="Saving...">Save settings</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailPlus className="h-4 w-4 text-indigo-600" /> Invite team member
            </CardTitle>
            <CardDescription>
              They will get an email to set a password, then appear in the team list.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {!serviceRoleConfigured ? (
              <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Invites require <code className="font-semibold">SUPABASE_SERVICE_ROLE_KEY</code> in
                your environment.
              </p>
            ) : null}
            <form action={inviteTeamMember} className="space-y-3">
              <Field label="Full name" htmlFor="invite_name">
                <Input id="invite_name" name="full_name" required />
              </Field>
              <Field label="Email" htmlFor="invite_email">
                <Input id="invite_email" name="email" type="email" required />
              </Field>
              <Field label="Role" htmlFor="invite_role">
                <Select id="invite_role" name="role" defaultValue="leader">
                  <option value="member">Member</option>
                  <option value="leader">Leader</option>
                  <option value="pastor">Pastor</option>
                  <option value="admin">Administrator</option>
                </Select>
              </Field>
              <SubmitButton
                className="w-full"
                pendingLabel="Sending invite..."
                disabled={!serviceRoleConfigured}
              >
                Send invitation
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-indigo-600" /> Team access
          </CardTitle>
          <CardDescription>
            {formatNumber(profiles.length)} login{profiles.length === 1 ? "" : "s"} · admins manage
            members, giving and settings; pastors see aggregate reports; leaders run their groups.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <ul className="divide-y divide-slate-100">
            {profiles.map((member) => {
              const nameParts = (member.full_name ?? member.email ?? "User").split(" ");
              return (
                <li key={member.id} className="px-5 py-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar firstName={nameParts[0]} lastName={nameParts[1]} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {member.full_name ?? "Unnamed user"}
                          {member.id === profile.id ? (
                            <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-slate-500">{member.email}</p>
                      </div>
                      <Badge variant={roleVariant[member.role]}>{roleLabel[member.role]}</Badge>
                      {!member.active ? <Badge variant="danger">Inactive</Badge> : null}
                    </div>

                    <form
                      action={updateTeamMember}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <input type="hidden" name="profile_id" value={member.id} />
                      <Select
                        name="role"
                        defaultValue={member.role}
                        aria-label={`Role for ${member.full_name ?? member.email}`}
                        className="sm:w-36"
                      >
                        <option value="member">Member</option>
                        <option value="leader">Leader</option>
                        <option value="pastor">Pastor</option>
                        <option value="admin">Administrator</option>
                      </Select>
                      <Select
                        name="member_id"
                        defaultValue={member.member_id ?? ""}
                        aria-label={`Linked member record for ${member.full_name ?? member.email}`}
                        className="sm:w-52"
                      >
                        <option value="">No member record</option>
                        {members.map((record) => (
                          <option key={record.id} value={record.id}>
                            {record.first_name} {record.last_name}
                          </option>
                        ))}
                      </Select>
                      <SubmitButton variant="outline" size="md" pendingLabel="Saving...">
                        Save
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" /> Recent activity
          </CardTitle>
          <CardDescription>Audit trail of record changes in the church database.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {logs.length ? (
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    <TH>When</TH>
                    <TH>Actor</TH>
                    <TH>Action</TH>
                    <TH>Entity</TH>
                    <TH>Details</TH>
                  </tr>
                </THead>
                <TBody>
                  {logs.map((log) => {
                    const details = log.details ? JSON.stringify(log.details) : "—";
                    return (
                      <TR key={log.id}>
                        <TD className="whitespace-nowrap text-xs text-slate-500">
                          {formatDateTime(log.created_at)}
                        </TD>
                        <TD className="whitespace-nowrap text-sm">
                          {log.profiles?.full_name ?? log.profiles?.email ?? "System"}
                        </TD>
                        <TD>
                          <Badge variant="neutral">{log.action}</Badge>
                        </TD>
                        <TD className="text-sm text-slate-600">{log.entity}</TD>
                        <TD className="max-w-md">
                          <p className="truncate text-xs text-slate-500" title={details}>
                            {details}
                          </p>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No activity recorded yet"
              description="Changes to members and giving will be logged here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
