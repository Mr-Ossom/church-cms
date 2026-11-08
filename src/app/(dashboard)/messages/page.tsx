import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, UserRound } from "lucide-react";
import { requireTeam } from "@/lib/auth";
import { roleLabel } from "@/lib/labels";
import type { ThreadOverview } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Messages" };

export default async function FacilitatorMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireTeam();
  const params = await searchParams;

  const { data } = await supabase.rpc("message_threads_overview");
  const threads = (data ?? []) as ThreadOverview[];
  const unread = threads.reduce((total, thread) => total + Number(thread.unread_count ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Private conversations members have started with you."
        actions={
          unread ? <Badge variant="brand">{unread} unread</Badge> : undefined
        }
      />

      <Flash ok={params.ok} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>Reply to members directly from here.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {threads.length ? (
            <ul className="divide-y divide-slate-100">
              {threads.map((thread) => {
                const count = Number(thread.unread_count ?? 0);
                return (
                  <li key={thread.id}>
                    <Link
                      href={`/messages/${thread.id}`}
                      className="flex items-start gap-3 py-3 transition-colors first:pt-0 last:pb-0 hover:text-indigo-700"
                    >
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {thread.counterpart_name}
                          </p>
                          <Badge variant="neutral">{roleLabel[thread.counterpart_role]}</Badge>
                          {count ? <Badge variant="brand">{count} new</Badge> : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-600">
                          {thread.last_message ?? "No messages yet"}
                        </p>
                        {thread.last_message_at ? (
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDateTime(thread.last_message_at)}
                          </p>
                        ) : null}
                      </div>
                      <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={MessageCircle}
              title="No conversations yet"
              description="When a member reaches out to you, their message will appear here."
            />
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-slate-500">
        Members start conversations from the member portal. You can reply from this inbox.
      </p>
    </div>
  );
}
