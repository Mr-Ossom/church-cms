import type { Metadata } from "next";
import { Clock, Inbox, Megaphone, MessageCircle, Send, Smartphone, Trash2 } from "lucide-react";
import { getChurchSettings, requireTeam } from "@/lib/auth";
import { isSmsConfigured } from "@/lib/sms";
import type { Announcement, MessageLog } from "@/lib/types";
import { audienceLabel } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { WhatsAppShare } from "@/components/communication/whatsapp-share";
import { createAnnouncement, deleteAnnouncement, sendSmsBroadcast } from "./actions";

export const metadata: Metadata = { title: "Communication" };

interface AnnouncementRow extends Announcement {
  groups: { id: string; name: string } | null;
}

interface GroupOption {
  id: string;
  name: string;
  leader_id: string | null;
}

interface WhatsAppMember {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

const messageStatusVariant: Record<MessageLog["status"], "success" | "danger" | "warning"> = {
  sent: "success",
  failed: "danger",
  queued: "warning",
};

export default async function CommunicationPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireTeam();
  const settings = await getChurchSettings(supabase);
  const params = await searchParams;
  const isStaff = profile.role === "admin" || profile.role === "pastor";

  let groupsQuery = supabase
    .from("groups")
    .select("id, name, leader_id")
    .eq("active", true)
    .order("name");
  if (!isStaff) {
    groupsQuery = groupsQuery.eq("leader_id", profile.member_id ?? "");
  }

  const [announcementsResult, groupsResult, membersResult, logsResult] = await Promise.all([
    supabase
      .from("announcements")
      .select("*, groups(id, name)")
      .order("publish_at", { ascending: false })
      .limit(20),
    groupsQuery,
    supabase
      .from("members")
      .select("id, first_name, last_name, phone")
      .in("status", ["active", "visitor"])
      .not("phone", "is", null)
      .order("first_name")
      .limit(200),
    isStaff
      ? supabase
          .from("message_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(25)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const announcements = (announcementsResult.data ?? []) as unknown as AnnouncementRow[];
  const groups = (groupsResult.data ?? []) as GroupOption[];
  const members = (membersResult.data ?? []) as WhatsAppMember[];
  const logs = (logsResult.data ?? []) as MessageLog[];
  const smsConfigured = isSmsConfigured();
  const now = new Date().toISOString();

  return (
    <div>
      <PageHeader
        title="Communication"
        description="Post announcements, text the congregation, and share updates on WhatsApp."
      />

      <Flash ok={params.ok} error={params.error} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Announcements</CardTitle>
                <CardDescription>Recent notices for the church and groups.</CardDescription>
              </div>
              <Badge variant="brand">{announcements.length}</Badge>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              {announcements.length ? (
                <ul className="divide-y divide-slate-100">
                  {announcements.map((announcement) => {
                    const isScheduled = announcement.publish_at > now;
                    const isExpired = Boolean(
                      announcement.expires_at && announcement.expires_at < now,
                    );
                    const canDelete = isStaff || announcement.created_by === profile.id;
                    return (
                      <li key={announcement.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 gap-3">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                              <Megaphone className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-slate-900">
                                  {announcement.title}
                                </h3>
                                <Badge variant="neutral">{audienceLabel[announcement.audience]}</Badge>
                                {announcement.groups ? (
                                  <Badge variant="info">{announcement.groups.name}</Badge>
                                ) : null}
                                {isScheduled ? <Badge variant="warning">Scheduled</Badge> : null}
                                {isExpired ? <Badge variant="danger">Expired</Badge> : null}
                              </div>
                              <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-slate-600">
                                {announcement.body}
                              </p>
                              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                                <Clock className="h-3.5 w-3.5" />
                                {isScheduled ? "Goes out " : "Published "}
                                {formatDateTime(announcement.publish_at)}
                                {announcement.expires_at
                                  ? ` · expires ${formatDateTime(announcement.expires_at)}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          {canDelete ? (
                            <form action={deleteAnnouncement}>
                              <input type="hidden" name="id" value={announcement.id} />
                              <ConfirmButton
                                variant="ghost"
                                size="icon"
                                className="text-rose-600 hover:bg-rose-50"
                                message="Delete this announcement?"
                              >
                                <Trash2 className="h-4 w-4" />
                              </ConfirmButton>
                            </form>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  icon={Megaphone}
                  title="No announcements yet"
                  description="Use the form to publish your first notice."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-600" /> Share on WhatsApp
              </CardTitle>
              <CardDescription>
                Opens WhatsApp with your message ready to send to each member.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <WhatsAppShare
                members={members}
                countryCode={settings.country_code}
                defaultMessage={`Hello from ${settings.name}! `}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New announcement</CardTitle>
              <CardDescription>
                {isStaff
                  ? "Everyone, staff, leaders, or a specific group."
                  : "You can post to groups you lead."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!isStaff && !groups.length ? (
                <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  You are not leading any active group yet. Ask an administrator to assign you as a
                  group leader.
                </p>
              ) : null}
              <form action={createAnnouncement} className="space-y-3">
                <Field label="Title" htmlFor="announcement_title">
                  <Input id="announcement_title" name="title" required maxLength={160} />
                </Field>
                <Field label="Message" htmlFor="announcement_body">
                  <Textarea
                    id="announcement_body"
                    name="body"
                    required
                    maxLength={4000}
                    className="min-h-28"
                  />
                </Field>

                {isStaff ? (
                  <Field label="Audience" htmlFor="announcement_audience">
                    <Select id="announcement_audience" name="audience" defaultValue="all">
                      <option value="all">Everyone</option>
                      <option value="staff">Staff</option>
                      <option value="leaders">Leaders</option>
                      <option value="group">Specific group</option>
                    </Select>
                  </Field>
                ) : (
                  <input type="hidden" name="audience" value="group" />
                )}

                <Field
                  label={isStaff ? "Group (for group announcements)" : "Group"}
                  htmlFor="announcement_group"
                  hint={isStaff ? "Ignored unless the audience is a specific group." : undefined}
                >
                  <Select
                    id="announcement_group"
                    name="group_id"
                    defaultValue=""
                    required={!isStaff}
                  >
                    <option value="">{isStaff ? "No group" : "Choose a group..."}</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Publish at" htmlFor="announcement_publish">
                    <Input id="announcement_publish" name="publish_at" type="datetime-local" />
                  </Field>
                  <Field label="Expires" htmlFor="announcement_expires">
                    <Input id="announcement_expires" name="expires_at" type="datetime-local" />
                  </Field>
                </div>

                <SubmitButton className="w-full" pendingLabel="Publishing...">
                  <Send className="h-4 w-4" /> Publish announcement
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          {isStaff ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-indigo-600" /> SMS broadcast
                </CardTitle>
                <CardDescription>Send a text to the church or one group.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {!smsConfigured ? (
                  <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    SMS is not configured. Add Africa&apos;s Talking or Twilio credentials to your
                    environment to enable sending.
                  </p>
                ) : null}
                <form action={sendSmsBroadcast} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Audience" htmlFor="sms_audience">
                      <Select id="sms_audience" name="audience" defaultValue="all">
                        <option value="all">All members</option>
                        <option value="group">One group</option>
                      </Select>
                    </Field>
                    <Field label="Group" htmlFor="sms_group">
                      <Select id="sms_group" name="group_id" defaultValue="">
                        <option value="">—</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <Field
                    label="Message"
                    htmlFor="sms_message"
                    hint="Up to 480 characters. Recipients without a phone number are skipped."
                  >
                    <Textarea
                      id="sms_message"
                      name="message"
                      required
                      maxLength={480}
                      className="min-h-24"
                    />
                  </Field>
                  <SubmitButton className="w-full" pendingLabel="Sending..." disabled={!smsConfigured}>
                    <Send className="h-4 w-4" /> Send SMS
                  </SubmitButton>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {isStaff ? (
        <Card className="mt-6 overflow-hidden">
          <CardHeader>
            <CardTitle>Recent messages</CardTitle>
            <CardDescription>Delivery log for SMS broadcasts.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            {logs.length ? (
              <TableWrap>
                <Table>
                  <THead>
                    <tr>
                      <TH>Sent</TH>
                      <TH>Recipient</TH>
                      <TH>Channel</TH>
                      <TH>Status</TH>
                      <TH>Message</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {logs.map((log) => (
                      <TR key={log.id}>
                        <TD className="whitespace-nowrap text-xs text-slate-500">
                          {formatDateTime(log.created_at)}
                        </TD>
                        <TD className="whitespace-nowrap text-sm">{log.recipient ?? "—"}</TD>
                        <TD>
                          <Badge variant="neutral">{log.channel.replace("_", "-")}</Badge>
                        </TD>
                        <TD>
                          <Badge variant={messageStatusVariant[log.status]}>{log.status}</Badge>
                        </TD>
                        <TD className="max-w-md">
                          <p className="truncate text-sm text-slate-600" title={log.error ?? undefined}>
                            {log.body ?? "—"}
                          </p>
                          {log.error ? (
                            <p className="mt-0.5 truncate text-xs text-rose-600">{log.error}</p>
                          ) : null}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            ) : (
              <EmptyState
                icon={Inbox}
                title="No messages sent yet"
                description="SMS broadcasts will appear here with their delivery status."
              />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
