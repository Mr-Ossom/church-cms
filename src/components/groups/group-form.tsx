import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createGroup, updateGroup } from "@/app/(dashboard)/groups/actions";
import type { Group } from "@/lib/types";

export function GroupForm({
  group,
  leaders,
  canAssignLeader,
}: {
  group?: Group;
  leaders: { id: string; first_name: string; last_name: string }[];
  canAssignLeader: boolean;
}) {
  const isEdit = Boolean(group);

  return (
    <form action={isEdit ? updateGroup : createGroup} className="space-y-5">
      {group ? <input type="hidden" name="id" value={group.id} /> : null}

      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Group name" htmlFor="name">
              <Input id="name" name="name" required defaultValue={group?.name} placeholder="e.g. Choir" />
            </Field>
            <Field label="Type" htmlFor="type">
              <Select id="type" name="type" defaultValue={group?.type ?? "ministry"}>
                <option value="ministry">Ministry</option>
                <option value="department">Department</option>
                <option value="small_group">Small group</option>
              </Select>
            </Field>
          </div>

          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={group?.description ?? ""}
              placeholder="What does this group do?"
            />
          </Field>

          {canAssignLeader ? (
            <Field label="Leader" htmlFor="leader_id">
              <Select id="leader_id" name="leader_id" defaultValue={group?.leader_id ?? ""}>
                <option value="">Unassigned</option>
                {leaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.first_name} {leader.last_name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Meeting day" htmlFor="meeting_day">
              <Input
                id="meeting_day"
                name="meeting_day"
                defaultValue={group?.meeting_day ?? ""}
                placeholder="e.g. Thursday"
              />
            </Field>
            <Field label="Meeting time" htmlFor="meeting_time">
              <Input
                id="meeting_time"
                name="meeting_time"
                defaultValue={group?.meeting_time ?? ""}
                placeholder="e.g. 6:00 PM"
              />
            </Field>
            <Field label="Location" htmlFor="location">
              <Input
                id="location"
                name="location"
                defaultValue={group?.location ?? ""}
                placeholder="e.g. Main hall"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="hidden" name="active" value="false" />
            <input
              type="checkbox"
              name="active"
              value="on"
              defaultChecked={group?.active ?? true}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Active group
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href={group ? `/groups/${group.id}` : "/groups"}>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <SubmitButton pendingLabel={isEdit ? "Saving..." : "Creating..."}>
          {isEdit ? "Save changes" : "Create group"}
        </SubmitButton>
      </div>
    </form>
  );
}
