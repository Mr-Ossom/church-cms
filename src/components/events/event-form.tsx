import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createEvent, updateEvent } from "@/app/(dashboard)/events/actions";
import type { ChurchEvent } from "@/lib/types";
import { toDatetimeLocal } from "@/lib/utils";

export function EventForm({
  event,
  groups,
  leaderMode,
  defaultGroupId,
}: {
  event?: ChurchEvent;
  groups: { id: string; name: string }[];
  leaderMode: boolean;
  defaultGroupId?: string;
}) {
  const isEdit = Boolean(event);

  return (
    <form action={isEdit ? updateEvent : createEvent} className="space-y-5">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}

      <Card>
        <CardContent className="space-y-4">
          <Field label="Event title" htmlFor="title">
            <Input id="title" name="title" required defaultValue={event?.title} placeholder="e.g. Sunday Celebration Service" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="type">
              <Select id="type" name="type" defaultValue={event?.type ?? "service"}>
                <option value="service">Service</option>
                <option value="event">Event</option>
                <option value="meeting">Meeting</option>
              </Select>
            </Field>
            <Field label="Location" htmlFor="location">
              <Input id="location" name="location" defaultValue={event?.location ?? ""} placeholder="e.g. Main Auditorium" />
            </Field>
            <Field label="Starts" htmlFor="starts_at">
              <Input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={toDatetimeLocal(event?.starts_at)}
              />
            </Field>
            <Field label="Ends" htmlFor="ends_at">
              <Input
                id="ends_at"
                name="ends_at"
                type="datetime-local"
                defaultValue={toDatetimeLocal(event?.ends_at)}
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={event?.description ?? ""}
              placeholder="What should people know about this gathering?"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Group"
              htmlFor="group_id"
              hint={leaderMode ? "Events must belong to a group you lead." : "Optional. Link this event to a ministry."}
            >
              <Select
                id="group_id"
                name="group_id"
                defaultValue={event?.group_id ?? defaultGroupId ?? ""}
                required={leaderMode}
              >
                <option value="">No specific group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Who can see this?" htmlFor="visibility">
              <Select id="visibility" name="visibility" defaultValue={event?.visibility ?? "all"}>
                <option value="all">Everyone</option>
                <option value="groups">Group members only</option>
                {!leaderMode ? <option value="leaders">Leaders only</option> : null}
                {!leaderMode ? <option value="staff">Staff only</option> : null}
              </Select>
            </Field>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="hidden" name="is_recurring" value="false" />
              <input
                type="checkbox"
                name="is_recurring"
                value="on"
                defaultChecked={event?.is_recurring ?? false}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              This is a recurring event
            </label>
            <div className="mt-3">
              <Input
                name="recurrence_rule"
                defaultValue={event?.recurrence_rule ?? ""}
                placeholder="e.g. Every Sunday at 9:00 AM"
              />
              <p className="mt-1 text-xs text-slate-500">
                Recurrence is stored as a note for now; create attendance sessions per occurrence.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href={event ? `/events/${event.id}` : "/events"}>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <SubmitButton pendingLabel={isEdit ? "Saving..." : "Creating..."}>
          {isEdit ? "Save changes" : "Create event"}
        </SubmitButton>
      </div>
    </form>
  );
}
