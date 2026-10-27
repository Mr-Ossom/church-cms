import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Church } from "lucide-react";
import { getChurchSettings, requireUser } from "@/lib/auth";
import type { Donation } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { donationMethodLabel, donationTypeLabel } from "@/lib/labels";
import { PrintButton } from "@/components/print-button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Giving receipt" };

interface ReceiptDonation extends Donation {
  members: { id: string; first_name: string; last_name: string } | null;
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, profile } = await requireUser();
  const { id } = await params;

  const { data } = await supabase
    .from("donations")
    .select("*, members(id, first_name, last_name)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const donation = data as ReceiptDonation;
  const settings = await getChurchSettings(supabase);
  const backHref = profile.role === "admin" ? "/giving" : "/portal/giving";

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link href={backHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <PrintButton />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Church className="h-6 w-6" />
              </span>
              <div>
                <p className="text-base font-semibold text-slate-900">{settings.name}</p>
                <p className="text-xs text-slate-500">{settings.address ?? "Church giving receipt"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Receipt</p>
              <p className="text-sm font-semibold text-slate-900">
                #{donation.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Received from</p>
            <p className="text-lg font-semibold text-slate-900">
              {donation.members
                ? `${donation.members.first_name} ${donation.members.last_name}`
                : "Anonymous giver"}
            </p>
            <p className="text-sm text-slate-500">Date: {formatDate(donation.donation_date)}</p>
          </div>

          <div className="mt-6 rounded-2xl bg-indigo-50 p-5 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">Amount received</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-indigo-950">
              {formatCurrency(Number(donation.amount), donation.currency)}
            </p>
            <div className="mt-2 flex justify-center gap-2">
              <Badge variant="brand">{donationTypeLabel[donation.type]}</Badge>
              <Badge variant="neutral">{donationMethodLabel[donation.method]}</Badge>
            </div>
          </div>

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex items-center justify-between border-b border-dashed border-slate-200 py-2">
              <dt className="text-slate-500">Reference</dt>
              <dd className="font-medium text-slate-900">{donation.reference ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-dashed border-slate-200 py-2">
              <dt className="text-slate-500">Notes</dt>
              <dd className="max-w-[60%] text-right text-slate-700">{donation.notes ?? "—"}</dd>
            </div>
          </dl>

          <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-slate-500">
            <div>
              <div className="mt-8 border-t border-slate-300 pt-2">Received by</div>
            </div>
            <div>
              <div className="mt-8 border-t border-slate-300 pt-2">Date</div>
            </div>
          </div>

          <p className="mt-8 text-center text-[11px] leading-relaxed text-slate-400">
            Thank you for your generosity. This receipt acknowledges the contribution above and was
            generated by {settings.name} using ChurchOS.
          </p>
        </div>
      </div>
    </div>
  );
}
