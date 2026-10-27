import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search, Upload, UserPlus, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import type { Member } from "@/lib/types";
import { formatDate, fullName } from "@/lib/utils";
import { memberStatusVariant } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Members" };

const PAGE_SIZE = 25;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireStaff();
  const params = await searchParams;
  const isAdmin = profile.role === "admin";
  const q = (params.q ?? "").trim();
  const status = params.status ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("members")
    .select("*", { count: "exact" })
    .order("first_name", { ascending: true })
    .range(from, to);

  if (q) {
    const safe = q.replace(/[%,()]/g, " ").trim();
    if (safe) {
      query = query.or(
        `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`,
      );
    }
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, count } = await query;
  const members = (data ?? []) as Member[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function urlForPage(target: number) {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (status) search.set("status", status);
    if (target > 1) search.set("page", String(target));
    const suffix = search.toString();
    return suffix ? `/members?${suffix}` : "/members";
  }

  return (
    <div>
      <PageHeader
        title="Members"
        description="The church directory — households, visitors, and everyone in between."
        actions={
          isAdmin ? (
            <>
              <Link href="/members/import" className={buttonVariants({ variant: "outline" })}>
                <Upload className="h-4 w-4" /> Import
              </Link>
              <Link href="/api/members/export" className={buttonVariants({ variant: "outline" })}>
                <Download className="h-4 w-4" /> Export
              </Link>
              <Link href="/members/new" className={buttonVariants()}>
                <UserPlus className="h-4 w-4" /> Add member
              </Link>
            </>
          ) : (
            <Link href="/api/members/export" className={buttonVariants({ variant: "outline" })}>
              <Download className="h-4 w-4" /> Export
            </Link>
          )
        }
      />

      <Flash ok={params.ok} error={params.error} />

      <Card className="overflow-hidden">
        <form className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search by name, phone or email"
              className="pl-9"
            />
          </div>
          <Select name="status" defaultValue={status} className="sm:w-44">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="visitor">Visitor</option>
            <option value="inactive">Inactive</option>
            <option value="transferred">Transferred</option>
          </Select>
          <div className="flex gap-2">
            <Button type="submit" variant="secondary">
              Filter
            </Button>
            {q || status ? (
              <Link href="/members" className={buttonVariants({ variant: "ghost" })}>
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        {members.length ? (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    <TH>Member</TH>
                    <TH>Contact</TH>
                    <TH>Status</TH>
                    <TH>Joined</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {members.map((member) => (
                    <TR key={member.id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar
                            firstName={member.first_name}
                            lastName={member.last_name}
                            src={member.photo_url}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/members/${member.id}`}
                              className="block truncate font-medium text-slate-900 hover:text-indigo-600"
                            >
                              {fullName(member)}
                            </Link>
                            <p className="text-xs text-slate-500">
                              {member.address ?? member.email ?? "No contact details"}
                            </p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <p className="text-sm">{member.phone ?? "—"}</p>
                        <p className="text-xs text-slate-500">{member.email ?? ""}</p>
                      </TD>
                      <TD>
                        <Badge variant={memberStatusVariant[member.status]}>{member.status}</Badge>
                      </TD>
                      <TD className="whitespace-nowrap text-sm">{formatDate(member.joined_date)}</TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/members/${member.id}`}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                          >
                            View
                          </Link>
                          {isAdmin ? (
                            <Link
                              href={`/members/${member.id}/edit`}
                              className={buttonVariants({ variant: "outline", size: "sm" })}
                            >
                              Edit
                            </Link>
                          ) : null}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>

            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>
                {count ?? 0} member{count === 1 ? "" : "s"} · page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link href={urlForPage(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Previous
                  </Link>
                ) : null}
                {page < totalPages ? (
                  <Link href={urlForPage(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Next
                  </Link>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            icon={Users}
            title={q || status ? "No members match your filters" : "No members yet"}
            description={
              q || status
                ? "Try a different search term or clear the filters."
                : "Add your first member, or import the directory from a CSV file."
            }
            action={
              isAdmin ? (
                <Link href="/members/new" className={buttonVariants({ size: "sm" })}>
                  Add member
                </Link>
              ) : undefined
            }
          />
        )}
      </Card>
    </div>
  );
}
