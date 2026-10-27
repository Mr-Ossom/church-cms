import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import type { Announcement } from "@/lib/types";
import { audienceLabel } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Announcements" };

interface AnnouncementRow extends Announcement {
  groups: { name: string } | null;
}

export default async function PortalAnnouncementsPage() {
  const { supabase } = await requireUser();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("announcements")
    .select("*, groups(name)")
    .order("publish_at", { ascending: false })
    .limit(30);

  const announcements = ((data ?? []) as AnnouncementRow[]).filter(
    (announcement) =>
      announcement.publish_at <= nowIso &&
      (!announcement.expires_at || announcement.expires_at > nowIso),
  );

  return (
    <div>
      <PageHeader title="Announcements" description="The latest news and notices from church." />

      {announcements.length ? (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">{announcement.title}</h2>
                  <Badge variant="neutral">{audienceLabel[announcement.audience]}</Badge>
                  {announcement.groups ? (
                    <Badge variant="info">{announcement.groups.name}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {formatDateTime(announcement.publish_at)}
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {announcement.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Megaphone}
            title="No announcements right now"
            description="When church news is shared it will show up here."
          />
        </Card>
      )}
    </div>
  );
}
