import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins, PiggyBank, Receipt, TrendingUp, UserRound } from "lucide-react";
import { getChurchSettings, requireUser } from "@/lib/auth";
import type { Donation, Pledge } from "@/lib/types";
import { donationMethodLabel, donationTypeLabel } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "My giving" };

export default async function PortalGivingPage() {
  const { supabase, profile } = await requireUser();
  const settings = await getChurchSettings(supabase);

  if (!profile.member_id) {
    return (
      <div>
        <PageHeader title="My giving" />
        <Card>
          <EmptyState
            icon={UserRound}
            title="Your account is not linked yet"
            description="Ask the church office to link your login to your member record to see your giving history."
          />
        </Card>
      </div>
    );
  }

  const yearStart = `${new Date().getFullYear()}-01-01`;
  const [donationsResult, pledgesResult, paymentsResult] = await Promise.all([
    supabase
      .from("donations")
      .select("*")
      .eq("member_id", profile.member_id)
      .order("donation_date", { ascending: false })
      .limit(100),
    supabase
      .from("pledges")
      .select("*")
      .eq("member_id", profile.member_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("donations")
      .select("pledge_id, amount")
      .eq("member_id", profile.member_id)
      .not("pledge_id", "is", null),
  ]);

  const donations = (donationsResult.data ?? []) as Donation[];
  const pledges = (pledgesResult.data ?? []) as Pledge[];
  const paidByPledge = new Map<string, number>();
  ((paymentsResult.data ?? []) as { pledge_id: string; amount: number }[]).forEach((payment) => {
    paidByPledge.set(
      payment.pledge_id,
      (paidByPledge.get(payment.pledge_id) ?? 0) + Number(payment.amount),
    );
  });

  const allTime = donations.reduce((total, donation) => total + Number(donation.amount), 0);
  const thisYear = donations
    .filter((donation) => donation.donation_date >= yearStart)
    .reduce((total, donation) => total + Number(donation.amount), 0);
  const lastGift = donations[0]?.donation_date;

  return (
    <div>
      <PageHeader
        title="My giving"
        description="Your contribution history recorded by the church."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="This year"
          value={formatCurrency(thisYear, settings.currency)}
          hint="Tithes, offerings and pledges"
          icon={TrendingUp}
          tone="indigo"
        />
        <StatCard
          label="All time"
          value={formatCurrency(allTime, settings.currency)}
          hint={`${donations.length} contribution${donations.length === 1 ? "" : "s"}`}
          icon={HandCoins}
          tone="amber"
        />
        <StatCard
          label="Last gift"
          value={lastGift ? formatDate(lastGift) : "—"}
          hint={lastGift ? "Most recent contribution" : "No gifts recorded yet"}
          icon={Receipt}
          tone="emerald"
        />
      </div>

      {pledges.length ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>My pledges</CardTitle>
            <CardDescription>Commitments and how much has been given towards them.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
            {pledges.map((pledge) => {
              const paid = paidByPledge.get(pledge.id) ?? 0;
              const percent = Math.min(100, Math.round((paid / Number(pledge.amount)) * 100));
              return (
                <div key={pledge.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(Number(pledge.amount), settings.currency)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(pledge.start_date)} ·{" "}
                        {pledge.end_date ? `by ${formatDate(pledge.end_date)}` : "open-ended"}
                      </p>
                    </div>
                    <Badge variant={percent >= 100 ? "success" : "warning"}>{percent}%</Badge>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    {formatCurrency(paid, settings.currency)} paid
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle>Contribution history</CardTitle>
          <CardDescription>Receipts are available for every recorded gift.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {donations.length ? (
            <TableWrap>
              <Table className="min-w-[560px]">
                <THead>
                  <tr>
                    <TH>Date</TH>
                    <TH>Type</TH>
                    <TH>Method</TH>
                    <TH className="text-right">Amount</TH>
                    <TH className="text-right">Receipt</TH>
                  </tr>
                </THead>
                <TBody>
                  {donations.map((donation) => (
                    <TR key={donation.id}>
                      <TD className="whitespace-nowrap text-sm">
                        {formatDate(donation.donation_date)}
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
                      <TD className="text-right">
                        <Link
                          href={`/receipt/${donation.id}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                          title="View receipt"
                        >
                          <Receipt className="h-4 w-4" />
                        </Link>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          ) : (
            <EmptyState
              icon={PiggyBank}
              title="No giving recorded yet"
              description="Contributions recorded by the church will appear here."
            />
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-slate-500">
        Giving is recorded by church administrators. If something looks wrong, please contact the church
        office.
      </p>
    </div>
  );
}
