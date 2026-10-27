import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins, PiggyBank, Receipt, TrendingUp, Trash2 } from "lucide-react";
import { getChurchSettings, requireStaff } from "@/lib/auth";
import type { Donation, DonationMethod, DonationType, Pledge } from "@/lib/types";
import { formatCurrency, formatDate, monthLabel } from "@/lib/utils";
import {
  donationMethodLabel,
  donationTypeLabel,
} from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createDonation,
  createPledge,
  deleteDonation,
  deletePledge,
} from "./actions";

export const metadata: Metadata = { title: "Giving" };

interface SummaryRow {
  month: string;
  donation_type: DonationType;
  method: DonationMethod;
  total: number;
  donations: number;
}

interface DonationRow extends Donation {
  members: { id: string; first_name: string; last_name: string } | null;
}

interface PledgeRow extends Pledge {
  members: { id: string; first_name: string; last_name: string } | null;
}

const PAGE_LIMIT = 200;

export default async function GivingPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    method?: string;
    from?: string;
    to?: string;
    member?: string;
    ok?: string;
    error?: string;
  }>;
}) {
  const { supabase, profile } = await requireStaff();
  const settings = await getChurchSettings(supabase);
  const params = await searchParams;
  const isAdmin = profile.role === "admin";

  const { data: summaryData } = await supabase.rpc("donation_summary");
  const summary = ((summaryData ?? []) as SummaryRow[]).map((row) => ({
    ...row,
    total: Number(row.total),
    donations: Number(row.donations),
  }));

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const thisYear = `${now.getFullYear()}-01-01`;

  const monthTotal = summary
    .filter((row) => row.month === thisMonth)
    .reduce((total, row) => total + row.total, 0);
  const yearTotal = summary
    .filter((row) => row.month >= thisYear)
    .reduce((total, row) => total + row.total, 0);
  const allTimeTotal = summary.reduce((total, row) => total + row.total, 0);

  let donations: DonationRow[] = [];
  let members: { id: string; first_name: string; last_name: string }[] = [];
  let pledges: PledgeRow[] = [];
  let paidByPledge = new Map<string, number>();
  let outstanding = 0;

  if (isAdmin) {
    let query = supabase
      .from("donations")
      .select("*, members(id, first_name, last_name)")
      .order("donation_date", { ascending: false })
      .limit(PAGE_LIMIT);

    if (params.type) query = query.eq("type", params.type);
    if (params.method) query = query.eq("method", params.method);
    if (params.from) query = query.gte("donation_date", params.from);
    if (params.to) query = query.lte("donation_date", params.to);
    if (params.member) query = query.eq("member_id", params.member);

    const [donationsResult, membersResult, pledgesResult, pledgePaymentsResult] = await Promise.all([
      query,
      supabase.from("members").select("id, first_name, last_name").order("first_name"),
      supabase
        .from("pledges")
        .select("*, members(id, first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("donations").select("pledge_id, amount").not("pledge_id", "is", null),
    ]);

    donations = (donationsResult.data ?? []) as unknown as DonationRow[];
    members = (membersResult.data ?? []) as { id: string; first_name: string; last_name: string }[];
    pledges = (pledgesResult.data ?? []) as unknown as PledgeRow[];
    paidByPledge = new Map();
    ((pledgePaymentsResult.data ?? []) as { pledge_id: string; amount: number }[]).forEach((payment) => {
      paidByPledge.set(
        payment.pledge_id,
        (paidByPledge.get(payment.pledge_id) ?? 0) + Number(payment.amount),
      );
    });
    outstanding = pledges.reduce((total, pledge) => {
      const paid = paidByPledge.get(pledge.id) ?? 0;
      return total + Math.max(0, Number(pledge.amount) - paid);
    }, 0);
  }

  const stats = [
    {
      label: "This month",
      value: formatCurrency(monthTotal, settings.currency),
      hint: `${summary
        .filter((row) => row.month === thisMonth)
        .reduce((total, row) => total + row.donations, 0)} gifts recorded`,
      icon: HandCoins,
      tone: "amber" as const,
    },
    {
      label: "This year",
      value: formatCurrency(yearTotal, settings.currency),
      hint: "Year-to-date contributions",
      icon: TrendingUp,
      tone: "indigo" as const,
    },
    {
      label: "All time",
      value: formatCurrency(allTimeTotal, settings.currency),
      hint: "Everything on record",
      icon: Receipt,
      tone: "emerald" as const,
    },
    ...(isAdmin
      ? [
          {
            label: "Pledges outstanding",
            value: formatCurrency(outstanding, settings.currency),
            hint: `${pledges.length} pledges tracked`,
            icon: PiggyBank,
            tone: "sky" as const,
          },
        ]
      : []),
  ];

  const byType = new Map<DonationType, number>();
  summary.forEach((row) => {
    byType.set(row.donation_type, (byType.get(row.donation_type) ?? 0) + row.total);
  });
  const byMethod = new Map<DonationMethod, number>();
  summary.forEach((row) => {
    byMethod.set(row.method, (byMethod.get(row.method) ?? 0) + row.total);
  });
  const monthly = Array.from(
    summary.reduce((map, row) => {
      map.set(row.month, (map.get(row.month) ?? 0) + row.total);
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12);

  return (
    <div>
      <PageHeader
        title="Giving"
        description={
          isAdmin
            ? "Record tithes, offerings and pledges, and keep clean financial records."
            : "Aggregated giving totals. Individual records are restricted to administrators."
        }
      />

      <Flash ok={params.ok} error={params.error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {!isAdmin ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Giving by month</CardTitle>
              <CardDescription>Last 12 months of aggregated contributions.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {monthly.length ? (
                <TableWrap>
                  <Table className="min-w-[400px]">
                    <THead>
                      <tr>
                        <TH>Month</TH>
                        <TH className="text-right">Total</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {monthly.map(([month, total]) => (
                        <TR key={month}>
                          <TD>{monthLabel(month)}</TD>
                          <TD className="text-right font-medium text-slate-900">
                            {formatCurrency(total, settings.currency)}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
              ) : (
                <EmptyState icon={HandCoins} title="No giving recorded yet" />
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>By type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {Array.from(byType).map(([type, total]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{donationTypeLabel[type]}</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(total, settings.currency)}
                    </span>
                  </div>
                ))}
                {!byType.size ? <p className="text-sm text-slate-500">No data yet.</p> : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>By method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {Array.from(byMethod).map(([method, total]) => (
                  <div key={method} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{donationMethodLabel[method]}</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(total, settings.currency)}
                    </span>
                  </div>
                ))}
                {!byMethod.size ? <p className="text-sm text-slate-500">No data yet.</p> : null}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <>
          <Card className="mt-6">
            <CardContent className="p-4">
              <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" method="get">
                <Select name="type" defaultValue={params.type ?? ""}>
                  <option value="">All types</option>
                  {Object.entries(donationTypeLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Select name="method" defaultValue={params.method ?? ""}>
                  <option value="">All methods</option>
                  {Object.entries(donationMethodLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Select name="member" defaultValue={params.member ?? ""}>
                  <option value="">All members</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </Select>
                <Input type="date" name="from" defaultValue={params.from ?? ""} aria-label="From date" />
                <Input type="date" name="to" defaultValue={params.to ?? ""} aria-label="To date" />
                <div className="flex gap-2">
                  <Button type="submit" variant="secondary" className="flex-1">
                    Filter
                  </Button>
                  <Link href="/giving" className={buttonVariants({ variant: "ghost" })}>
                    Clear
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="overflow-hidden xl:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Contributions</CardTitle>
                  <CardDescription>Showing up to {PAGE_LIMIT} records.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                {donations.length ? (
                  <TableWrap>
                    <Table>
                      <THead>
                        <tr>
                          <TH>Date</TH>
                          <TH>Member</TH>
                          <TH>Type</TH>
                          <TH>Method</TH>
                          <TH className="text-right">Amount</TH>
                          <TH className="text-right">Actions</TH>
                        </tr>
                      </THead>
                      <TBody>
                        {donations.map((donation) => (
                          <TR key={donation.id}>
                            <TD className="whitespace-nowrap text-sm">
                              {formatDate(donation.donation_date)}
                            </TD>
                            <TD className="text-sm">
                              {donation.members ? (
                                <Link
                                  href={`/members/${donation.members.id}`}
                                  className="font-medium text-slate-900 hover:text-indigo-600"
                                >
                                  {donation.members.first_name} {donation.members.last_name}
                                </Link>
                              ) : (
                                <span className="text-slate-400">Anonymous</span>
                              )}
                            </TD>
                            <TD>
                              <Badge variant="neutral">{donationTypeLabel[donation.type]}</Badge>
                            </TD>
                            <TD className="text-sm text-slate-500">
                              {donationMethodLabel[donation.method]}
                            </TD>
                            <TD className="text-right font-semibold text-slate-900">
                              {formatCurrency(Number(donation.amount), donation.currency)}
                            </TD>
                            <TD>
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={`/receipt/${donation.id}`}
                                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                                  title="Printable receipt"
                                >
                                  <Receipt className="h-4 w-4" />
                                </Link>
                                <form action={deleteDonation}>
                                  <input type="hidden" name="id" value={donation.id} />
                                  <ConfirmButton
                                    variant="ghost"
                                    size="sm"
                                    className="text-rose-600 hover:bg-rose-50"
                                    message="Delete this contribution? This cannot be undone."
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </ConfirmButton>
                                </form>
                              </div>
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </TableWrap>
                ) : (
                  <EmptyState
                    icon={HandCoins}
                    title="No contributions found"
                    description="Record a gift using the form, or clear the filters."
                  />
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Record a contribution</CardTitle>
                  <CardDescription>Currency: {settings.currency}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <form action={createDonation} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Amount" htmlFor="amount">
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="0.00"
                        />
                      </Field>
                      <Field label="Date" htmlFor="donation_date">
                        <Input
                          id="donation_date"
                          name="donation_date"
                          type="date"
                          required
                          defaultValue={new Date().toISOString().slice(0, 10)}
                        />
                      </Field>
                    </div>

                    <Field label="Member" htmlFor="member_id">
                      <Select id="member_id" name="member_id" defaultValue="">
                        <option value="">Anonymous</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Type" htmlFor="type">
                        <Select id="type" name="type" defaultValue="tithe">
                          {Object.entries(donationTypeLabel).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Method" htmlFor="method">
                        <Select id="method" name="method" defaultValue="cash">
                          {Object.entries(donationMethodLabel).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <Field label="Pledge (optional)" htmlFor="pledge_id">
                      <Select id="pledge_id" name="pledge_id" defaultValue="">
                        <option value="">Not linked to a pledge</option>
                        {pledges.map((pledge) => (
                          <option key={pledge.id} value={pledge.id}>
                            {pledge.members
                              ? `${pledge.members.first_name} ${pledge.members.last_name}`
                              : "Unknown"}{" "}
                            — {formatCurrency(Number(pledge.amount), settings.currency)}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Reference" htmlFor="reference">
                      <Input id="reference" name="reference" placeholder="Receipt or transaction ref" />
                    </Field>
                    <Field label="Notes" htmlFor="notes">
                      <Textarea id="notes" name="notes" className="min-h-16" />
                    </Field>

                    <SubmitButton className="w-full" pendingLabel="Recording...">
                      Record contribution
                    </SubmitButton>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pledges</CardTitle>
                  <CardDescription>Track commitments towards a goal.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {pledges.length ? (
                    <ul className="space-y-3">
                      {pledges.slice(0, 6).map((pledge) => {
                        const paid = paidByPledge.get(pledge.id) ?? 0;
                        const percent = Math.min(
                          100,
                          Math.round((paid / Number(pledge.amount)) * 100),
                        );
                        return (
                          <li key={pledge.id} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {pledge.members
                                    ? `${pledge.members.first_name} ${pledge.members.last_name}`
                                    : "Unknown member"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatCurrency(Number(pledge.amount), settings.currency)} ·{" "}
                                  {pledge.end_date ? `by ${formatDate(pledge.end_date)}` : "open"}
                                </p>
                              </div>
                              <form action={deletePledge}>
                                <input type="hidden" name="id" value={pledge.id} />
                                <ConfirmButton
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                  message="Delete this pledge?"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </ConfirmButton>
                              </form>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {formatCurrency(paid, settings.currency)} paid · {percent}%
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No pledges yet.</p>
                  )}

                  <form action={createPledge} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    <Field label="Member" htmlFor="pledge_member">
                      <Select id="pledge_member" name="member_id" required defaultValue="">
                        <option value="">Choose a member...</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Amount" htmlFor="pledge_amount">
                        <Input
                          id="pledge_amount"
                          name="amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                        />
                      </Field>
                      <Field label="Start date" htmlFor="pledge_start">
                        <Input
                          id="pledge_start"
                          name="start_date"
                          type="date"
                          required
                          defaultValue={new Date().toISOString().slice(0, 10)}
                        />
                      </Field>
                    </div>
                    <Field label="End date" htmlFor="pledge_end">
                      <Input id="pledge_end" name="end_date" type="date" />
                    </Field>
                    <SubmitButton variant="secondary" className="w-full" pendingLabel="Creating...">
                      Create pledge
                    </SubmitButton>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
