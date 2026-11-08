import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, Send, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { startThread } from "@/app/actions/messages";
import { roleLabel } from "@/lib/labels";
import type { Facilitator, ThreadOverview } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Messages" };

export default async function PortalMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireUser();
  const params = await searchParams;

  const [threadsResult, facilitatorsResult] = await Promise.all([
    supabase.rpc("message_threads_overview"),
    supabase.rpc("list_facilitators"),
  ]);

  const threads = (threadsResult.data ?? []) as ThreadOverview[];
  const facilitators = (facilitatorsResult.data ?? []) as Facilitator[];

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Reach out directly to a pastor, leader or member of the church team."
      />

      <Flash ok={params.ok} error={params.error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My conversations</CardTitle>
            <CardDescription>Private threads with church facilitators.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {threads.length ? (
              <ul className="space-y-2">
                {threads.map((thread) => {
                  const unread = Number(thread.unread_count ?? 0);
                  return (
                    <li key={thread.id}>
                      <Link
                        href={`/portal/messages/${thread.id}`}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <MessageCircle className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {thread.counterpart_name}
                            </p>
                            {unread ? <Badge variant="brand">{unread}</Badge> : null}
                          </div>
                          <p className="text-xs text-slate-500">
                            {roleLabel[thread.counterpart_role]}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {thread.last_message ?? "No messages yet"}
                          </p>
                          {thread.last_message_at ? (
                            <p className="mt-1 text-[11px] text-slate-400">
                              {formatDateTime(thread.last_message_at)}
                            </p>
                          ) : null}
                        </div>
                        <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-400" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={MessageCircle}
                title="No conversations yet"
                description="Choose a facilitator and send your first message."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Start a conversation</CardTitle>
            <CardDescription>
              Choose who you would like to reach out to. Conversations stay private between you and
              that facilitator.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {facilitators.length ? (
              <form action={startThread} className="space-y-3">
                <Field label="Facilitator" htmlFor="facilitator_profile_id">
                  <Select id="facilitator_profile_id" name="facilitator_profile_id" required defaultValue="">
                    <option value="">Choose a facilitator...</option>
                    {facilitators.map((facilitator) => (
                      <option key={facilitator.id} value={facilitator.id}>
                        {facilitator.full_name} · {roleLabel[facilitator.role]}
                        {facilitator.group_names?.length
                          ? ` · ${facilitator.group_names.join(", ")}`
                          : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Message" htmlFor="message_body">
                  <Textarea
                    id="message_body"
                    name="body"
                    required
                    maxLength={4000}
                    className="min-h-32"
                    placeholder="Write your message..."
                  />
                </Field>
                <SubmitButton className="w-full" pendingLabel="Sending...">
                  <Send className="h-4 w-4" /> Send message
                </SubmitButton>
              </form>
            ) : (
              <EmptyState
                icon={UserRound}
                title="No facilitators available"
                description="Ask the church office to add a pastor or leader to the team."
              />
            )}

            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              For urgent pastoral care, please call the church office. Messages are private and only
              visible to you and the facilitator you choose.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
