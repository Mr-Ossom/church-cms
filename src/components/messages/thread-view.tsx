import Link from "next/link";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { sendThreadMessage } from "@/app/actions/messages";
import { roleLabel } from "@/lib/labels";
import type { ThreadMessage, UserRole } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";

export function ThreadView({
  threadId,
  currentProfileId,
  counterpartName,
  counterpartRole,
  origin,
  backHref,
  messages,
  ok,
  error,
}: {
  threadId: string;
  currentProfileId: string;
  counterpartName: string;
  counterpartRole: UserRole;
  origin: "portal" | "dashboard";
  backHref: string;
  messages: ThreadMessage[];
  ok?: string;
  error?: string;
}) {
  return (
    <div>
      <Link href={backHref} className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}>
        <ArrowLeft className="h-4 w-4" /> Back to messages
      </Link>

      <PageHeader
        title={counterpartName}
        description="Private conversation with a church facilitator."
        actions={<Badge variant="neutral">{roleLabel[counterpartRole]}</Badge>}
      />

      <Flash ok={ok} error={error} />

      <Card className="overflow-hidden">
        <CardContent className="max-h-[55vh] space-y-3 overflow-y-auto">
          {messages.length ? (
            messages.map((message) => {
              const mine = message.sender_profile_id === currentProfileId;
              return (
                <div
                  key={message.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5",
                      mine ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800",
                    )}
                  >
                    <p className="whitespace-pre-line text-sm leading-relaxed">{message.body}</p>
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        mine ? "text-indigo-200" : "text-slate-400",
                      )}
                    >
                      {formatDateTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={MessageCircle}
              title="No messages yet"
              description="Write the first message to start the conversation."
            />
          )}
        </CardContent>
      </Card>

      <form action={sendThreadMessage} className="mt-4 space-y-3">
        <input type="hidden" name="thread_id" value={threadId} />
        <input type="hidden" name="origin" value={origin} />
        <Textarea
          name="body"
          required
          maxLength={4000}
          className="min-h-24"
          placeholder="Write a message..."
          aria-label="Message"
        />
        <SubmitButton className="w-full" pendingLabel="Sending...">
          <Send className="h-4 w-4" /> Send message
        </SubmitButton>
      </form>
    </div>
  );
}
