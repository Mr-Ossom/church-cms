import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { PhotoUpload } from "@/components/members/photo-upload";
import { createMember, updateMember } from "@/app/(dashboard)/members/actions";
import type { Member } from "@/lib/types";

const today = new Date().toISOString().slice(0, 10);

export function MemberForm({ member }: { member?: Member }) {
  const isEdit = Boolean(member);

  return (
    <form action={isEdit ? updateMember : createMember} className="space-y-6">
      {member ? <input type="hidden" name="id" value={member.id} /> : null}

      <Card>
        <CardContent className="space-y-5">
          <PhotoUpload defaultValue={member?.photo_url} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="first_name">
              <Input id="first_name" name="first_name" required defaultValue={member?.first_name} placeholder="Kofi" />
            </Field>
            <Field label="Last name" htmlFor="last_name">
              <Input id="last_name" name="last_name" required defaultValue={member?.last_name} placeholder="Mensah" />
            </Field>
            <Field label="Other names" htmlFor="other_names">
              <Input id="other_names" name="other_names" defaultValue={member?.other_names ?? ""} placeholder="Optional" />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" type="tel" defaultValue={member?.phone ?? ""} placeholder="+233 20 123 4567" />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={member?.email ?? ""} placeholder="name@example.com" />
            </Field>
            <Field label="Date of birth" htmlFor="date_of_birth">
              <Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={member?.date_of_birth ?? ""} />
            </Field>
            <Field label="Gender" htmlFor="gender">
              <Select id="gender" name="gender" defaultValue={member?.gender ?? ""}>
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Marital status" htmlFor="marital_status">
              <Select id="marital_status" name="marital_status" defaultValue={member?.marital_status ?? ""}>
                <option value="">Not specified</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="widowed">Widowed</option>
                <option value="divorced">Divorced</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Joined date" htmlFor="joined_date">
              <Input id="joined_date" name="joined_date" type="date" required defaultValue={member?.joined_date ?? today} />
            </Field>
            <Field label="Membership status" htmlFor="status">
              <Select id="status" name="status" defaultValue={member?.status ?? "active"}>
                <option value="active">Active</option>
                <option value="visitor">Visitor</option>
                <option value="inactive">Inactive</option>
                <option value="transferred">Transferred</option>
              </Select>
            </Field>
          </div>

          <Field label="Address" htmlFor="address">
            <Input id="address" name="address" defaultValue={member?.address ?? ""} placeholder="Area, city" />
          </Field>

          <Field label="Pastoral notes" htmlFor="notes" hint="Visible to administrators and pastors only where permitted.">
            <Textarea id="notes" name="notes" defaultValue={member?.notes ?? ""} placeholder="Anything the pastoral team should know" />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href={member ? `/members/${member.id}` : "/members"}>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <SubmitButton pendingLabel={isEdit ? "Saving changes..." : "Adding member..."}>
          {isEdit ? "Save changes" : "Add member"}
        </SubmitButton>
      </div>
    </form>
  );
}
