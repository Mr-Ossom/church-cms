"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MessageCircle, Search } from "lucide-react";
import { Input, Textarea } from "@/components/ui/input";
import { cn, whatsappLink } from "@/lib/utils";

interface WhatsAppMember {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export function WhatsAppShare({
  members,
  countryCode,
  defaultMessage,
}: {
  members: WhatsAppMember[];
  countryCode: string;
  defaultMessage: string;
}) {
  const [message, setMessage] = useState(defaultMessage);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) =>
      `${member.first_name} ${member.last_name} ${member.phone}`.toLowerCase().includes(term),
    );
  }, [members, query]);

  return (
    <div>
      <label htmlFor="wa-message" className="mb-1.5 block text-sm font-medium text-slate-700">
        Message
      </label>
      <Textarea
        id="wa-message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className="min-h-20 text-sm"
        placeholder="Type a message to share..."
      />

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search recipients"
          className="pl-9"
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {members.length} member{members.length === 1 ? "" : "s"} with a phone number. Each link opens
        WhatsApp with your message pre-filled.
      </p>

      <ul className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
        {filtered.map((member) => {
          const link = whatsappLink(member.phone, message, countryCode);
          return (
            <li key={member.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-xs text-slate-500">{member.phone}</p>
              </div>
              {link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100",
                  )}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Chat
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </li>
          );
        })}
        {!filtered.length ? (
          <li className="px-3 py-6 text-center text-sm text-slate-500">No one matches that search.</li>
        ) : null}
      </ul>
    </div>
  );
}
