import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Home, Trash2, UserPlus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import type { Family, MemberStatus } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";
import { memberStatusVariant } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  addFamilyMember,
  deleteFamily,
  removeFamilyMember,
  updateFamily,
} from "../actions";

export const metadata: Metadata = { title: "Family" };

interface FamilyMemberRow {
  id: string;
  member_id: string;
  relationship: string;
  members: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    status: MemberStatus;
    photo_url: string | null;
  } | null;
}

export default async function FamilyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireStaff();
  const { id } = await params;
  const { ok, error } = await searchParams;
  const isAdmin = profile.role === "admin";

  const { data: familyData } = await supabase.from("families").select("*").eq("id", id).maybeSingle();
  if (!familyData) notFound();
  const family = familyData as Family;

  const [linksResult, membersResult] = await Promise.all([
    supabase
      .from("family_members")
      .select(
        "id, member_id, relationship, members(id, first_name, last_name, phone, email, status, photo_url)",
      )
      .eq("family_id", id),
    isAdmin
      ? supabase
          .from("members")
          .select("id, first_name, last_name")
          .order("first_name", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
  ]);

  const links = (linksResult.data ?? []) as unknown as FamilyMemberRow[];
  const linkedIds = new Set(links.map((link) => link.member_id));
  const candidates = ((membersResult.data ?? []) as { id: string; first_name: string; last_name: string }[]).filter(
    (member) => !linkedIds.has(member.id),
  );

  return (
    <div>
      <Link href="/families" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}>
        <ArrowLeft className="h-4 w-4" /> Back to families
      </Link>

      <PageHeader
        title={family.name}
        description={family.address ?? "Household"}
        actions={
          isAdmin ? (
            <form action={deleteFamily}>
              <input type="hidden" name="id" value={family.id} />
              <ConfirmButton
                variant="danger"
                message="Delete this household? Members stay in the directory but their family links are removed."
              >
                <Trash2 className="h-4 w-4" /> Delete family
              </ConfirmButton>
            </form>
          ) : undefined
        }
      />

      <Flash ok={ok} error={error} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Household members</CardTitle>
            <CardDescription>
              {links.length} {links.length === 1 ? "person" : "people"} linked to this family.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {links.length ? (
              <ul className="divide-y divide-slate-100">
                {links.map((link) => (
                  <li key={link.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar
                      firstName={link.members?.first_name}
                      lastName={link.members?.last_name}
                      src={link.members?.photo_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      {link.members ? (
                        <Link
                          href={`/members/${link.members.id}`}
                          className="block truncate text-sm font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {link.members.first_name} {link.members.last_name}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-500">Unknown member</span>
                      )}
                      <p className="text-xs text-slate-500">
                        {titleCase(link.relationship)}
                        {link.members?.phone ? ` · ${link.members.phone}` : ""}
                      </p>
                    </div>
                    {link.members ? (
                      <Badge variant={memberStatusVariant[link.members.status]}>
                        {link.members.status}
                      </Badge>
                    ) : null}
                    {isAdmin ? (
                      <form action={removeFamilyMember}>
                        <input type="hidden" name="id" value={link.id} />
                        <input type="hidden" name="family_id" value={family.id} />
                        <ConfirmButton
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50"
                          message="Remove this member from the family?"
                        >
                          Remove
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                <Home className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-2 text-sm text-slate-500">No one is linked to this household yet.</p>
              </div>
            )}

            {isAdmin && candidates.length ? (
              <form
                action={addFamilyMember}
                className="mt-5 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center"
              >
                <input type="hidden" name="family_id" value={family.id} />
                <Select name="member_id" required className="sm:flex-1">
                  <option value="">Choose a member...</option>
                  {candidates.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </Select>
                <Input name="relationship" placeholder="Relationship" className="sm:w-40" />
                <SubmitButton variant="secondary" pendingLabel="Adding...">
                  <UserPlus className="h-4 w-4" /> Add
                </SubmitButton>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Household details</CardTitle>
            <CardDescription>Created {formatDate(family.created_at)}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isAdmin ? (
              <form action={updateFamily} className="space-y-4">
                <input type="hidden" name="id" value={family.id} />
                <Field label="Family name" htmlFor="name">
                  <Input id="name" name="name" defaultValue={family.name} required />
                </Field>
                <Field label="Address" htmlFor="address">
                  <Input id="address" name="address" defaultValue={family.address ?? ""} />
                </Field>
                <Field label="Notes" htmlFor="notes">
                  <Textarea id="notes" name="notes" defaultValue={family.notes ?? ""} />
                </Field>
                <SubmitButton className="w-full" pendingLabel="Saving...">
                  Save changes
                </SubmitButton>
              </form>
            ) : (
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">Address</span>
                  {family.address ?? "—"}
                </p>
                <p>
                  <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">Notes</span>
                  {family.notes ?? "—"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
