import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { MessageThread, ThreadMessage, ThreadOverview } from "@/lib/types";
import { ThreadView } from "@/components/messages/thread-view";
import { ThreadReadMarker } from "@/components/messages/thread-read-marker";

export const metadata: Metadata = { title: "Conversation" };

export default async function PortalThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireUser();
  const { id } = await params;
  const { ok, error } = await searchParams;

  const { data: threadData } = await supabase
    .from("message_threads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!threadData) notFound();
  const thread = threadData as MessageThread;

  const [messagesResult, overviewResult] = await Promise.all([
    supabase
      .from("thread_messages")
      .select("*")
      .eq("thread_id", id)
      .order("created_at", { ascending: true })
      .limit(300),
    supabase.rpc("message_threads_overview"),
  ]);

  const messages = (messagesResult.data ?? []) as ThreadMessage[];
  const overview = ((overviewResult.data ?? []) as ThreadOverview[]).find(
    (item) => item.id === id,
  );

  return (
    <div>
      <ThreadReadMarker threadId={id} />
      <ThreadView
        threadId={thread.id}
        currentProfileId={profile.id}
        counterpartName={overview?.counterpart_name ?? "Facilitator"}
        counterpartRole={overview?.counterpart_role ?? "leader"}
        origin="portal"
        backHref="/portal/messages"
        messages={messages}
        ok={ok}
        error={error}
      />
    </div>
  );
}
