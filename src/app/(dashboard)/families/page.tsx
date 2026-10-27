import type { Metadata } from "next";
import Link from "next/link";
import { Home, Plus, Search } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import type { Family } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Families" };

interface FamilyRow extends Family {
  family_members: { count: number }[];
}

export default async function FamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireStaff();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const isAdmin = profile.role === "admin";

  let query = supabase
    .from("families")
    .select("*, family_members(count)")
    .order("name", { ascending: true });

  if (q) {
    query = query.ilike("name", `%${q.replace(/[%,()]/g, " ")}%`);
  }

  const { data, error } = await query;
  if (error) {
    return <Flash error={error.message} />;
  }

  const families = (data ?? []) as unknown as FamilyRow[];

  return (
    <div>
      <PageHeader
        title="Families"
        description="Households help you care for people together, not just individually."
        actions={
          isAdmin ? (
            <Link href="/families/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" /> Add family
            </Link>
          ) : undefined
        }
      />

      <Flash ok={params.ok} error={params.error} />

      <Card className="overflow-hidden">
        <form className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input name="q" defaultValue={q} placeholder="Search households by name" className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {q ? (
              <Link href="/families" className={buttonVariants({ variant: "ghost" })}>
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        {families.length ? (
          <TableWrap>
            <Table>
              <THead>
                <tr>
                  <TH>Household</TH>
                  <TH>Address</TH>
                  <TH>Members</TH>
                  <TH>Created</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {families.map((family) => {
                  const count = family.family_members?.[0]?.count ?? 0;
                  return (
                    <TR key={family.id}>
                      <TD>
                        <Link
                          href={`/families/${family.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {family.name}
                        </Link>
                      </TD>
                      <TD className="max-w-[260px] truncate text-sm text-slate-500">
                        {family.address ?? "—"}
                      </TD>
                      <TD>
                        <Badge variant="neutral">
                          {count} {count === 1 ? "person" : "people"}
                        </Badge>
                      </TD>
                      <TD className="text-sm text-slate-500">{formatDate(family.created_at)}</TD>
                      <TD className="text-right">
                        <Link
                          href={`/families/${family.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          Open
                        </Link>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        ) : (
          <EmptyState
            icon={Home}
            title={q ? "No households match that search" : "No families yet"}
            description={
              q
                ? "Try another name or clear the search."
                : "Create a household and link members to it from their profile."
            }
            action={
              isAdmin ? (
                <Link href="/families/new" className={buttonVariants({ size: "sm" })}>
                  Add family
                </Link>
              ) : undefined
            }
          />
        )}
      </Card>
    </div>
  );
}
