"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, Clock, CloudOff, Loader2, Search, UserX } from "lucide-react";
import type { AttendanceStatus } from "@/lib/types";
import { cn, titleCase } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface CheckInMember {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  status: string;
}

interface QueuedMark {
  session_id: string;
  member_id: string;
  status: AttendanceStatus;
}

const statusButtons: { value: AttendanceStatus; label: string; icon: typeof Check; active: string }[] = [
  { value: "present", label: "Present", icon: Check, active: "bg-emerald-600 text-white border-emerald-600" },
  { value: "absent", label: "Absent", icon: UserX, active: "bg-rose-600 text-white border-rose-600" },
  { value: "excused", label: "Excused", icon: Clock, active: "bg-amber-500 text-white border-amber-500" },
];

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function CheckInBoard({
  sessionId,
  members,
  initialRecords,
  canEdit,
}: {
  sessionId: string;
  members: CheckInMember[];
  initialRecords: Record<string, AttendanceStatus>;
  canEdit: boolean;
}) {
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>(initialRecords);
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const storageKey = `churchos-attendance-${sessionId}`;
  const flushed = useRef(false);
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

  const readQueue = useCallback((): QueuedMark[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as QueuedMark[]) : [];
    } catch {
      return [];
    }
  }, [storageKey]);

  const subscribeQueue = useCallback(
    (callback: () => void) => {
      const event = `${storageKey}:queue`;
      window.addEventListener(event, callback);
      window.addEventListener("storage", callback);
      return () => {
        window.removeEventListener(event, callback);
        window.removeEventListener("storage", callback);
      };
    },
    [storageKey],
  );

  const queued = useSyncExternalStore(subscribeQueue, () => readQueue().length, () => 0);

  const writeQueue = useCallback(
    (queue: QueuedMark[]) => {
      window.localStorage.setItem(storageKey, JSON.stringify(queue));
      window.dispatchEvent(new Event(`${storageKey}:queue`));
    },
    [storageKey],
  );

  const sendMark = useCallback(async (mark: QueuedMark) => {
    const response = await fetch("/api/attendance/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mark),
    });
    if (!response.ok) throw new Error("Failed to save");
  }, []);

  const flushQueue = useCallback(async () => {
    if (!canEdit) return;
    const queue = readQueue();
    if (!queue.length) return;
    setSyncing(true);
    const remaining: QueuedMark[] = [];
    for (const mark of queue) {
      try {
        await sendMark(mark);
      } catch {
        remaining.push(mark);
      }
    }
    writeQueue(remaining);
    setSyncing(false);
  }, [canEdit, readQueue, sendMark, writeQueue]);

  useEffect(() => {
    const handleOnline = () => {
      void flushQueue();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flushQueue]);

  useEffect(() => {
    if (!flushed.current) {
      flushed.current = true;
      void flushQueue();
    }
  }, [flushQueue]);

  async function update(memberId: string, status: AttendanceStatus) {
    if (!canEdit) return;
    setRecords((current) => ({ ...current, [memberId]: status }));

    const mark: QueuedMark = { session_id: sessionId, member_id: memberId, status };
    try {
      if (!navigator.onLine) throw new Error("offline");
      await sendMark(mark);
    } catch {
      writeQueue([...readQueue().filter((item) => item.member_id !== memberId), mark]);
    }
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) =>
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(term),
    );
  }, [members, query]);

  const counts = useMemo(() => {
    const values = Object.values(records);
    return {
      present: values.filter((value) => value === "present").length,
      absent: values.filter((value) => value === "absent").length,
      excused: values.filter((value) => value === "excused").length,
      unmarked: Math.max(0, members.length - values.length),
    };
  }, [members.length, records]);

  return (
    <div>
      {!online || queued > 0 ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            {!online ? (
              <p className="font-medium">You are offline. Check-ins are saved on this device.</p>
            ) : null}
            {queued > 0 ? (
              <p>
                {syncing ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}
                {queued} change{queued === 1 ? "" : "s"} waiting to sync.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Present", value: counts.present, tone: "text-emerald-700 bg-emerald-50" },
          { label: "Absent", value: counts.absent, tone: "text-rose-700 bg-rose-50" },
          { label: "Excused", value: counts.excused, tone: "text-amber-700 bg-amber-50" },
          { label: "Not marked", value: counts.unmarked, tone: "text-slate-700 bg-slate-50" },
        ].map((stat) => (
          <div key={stat.label} className={cn("rounded-xl px-3 py-2", stat.tone)}>
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{stat.label}</p>
            <p className="text-xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people to check in..."
          className="pl-9"
        />
      </div>

      <ul className="divide-y divide-slate-100">
        {filtered.map((member) => {
          const status = records[member.id];
          return (
            <li key={member.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar
                  firstName={member.first_name}
                  lastName={member.last_name}
                  src={member.photo_url}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {member.first_name} {member.last_name}
                  </p>
                  <p className="text-xs capitalize text-slate-500">
                    {status ? titleCase(status) : "Not marked"}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                {statusButtons.map((option) => {
                  const active = status === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => void update(member.id, option.value)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50",
                        active && option.active,
                      )}
                    >
                      <option.icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      {!filtered.length ? (
        <div className="py-10 text-center text-sm text-slate-500">
          No one matches “{query}”.
        </div>
      ) : null}

      {canEdit ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <Badge variant="success" className="capitalize">Live</Badge>
          Taps save immediately. Offline changes sync automatically.
        </p>
      ) : (
        <p className="mt-4 text-xs text-slate-400">You are viewing this session in read-only mode.</p>
      )}
    </div>
  );
}
