import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

interface DonationRow {
  donation_date: string;
  type: string;
  method: string;
  amount: number;
  currency: string;
  reference: string | null;
  notes: string | null;
  members: { first_name: string; last_name: string } | null;
}

export async function GET() {
  const context = await getSessionContext();
  if (!context || context.profile.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data, error } = await context.supabase
    .from("donations")
    .select("donation_date, type, method, amount, currency, reference, notes, members(first_name, last_name)")
    .order("donation_date", { ascending: false });

  if (error) {
    return new NextResponse(error.message, { status: 400 });
  }

  const rows = ((data ?? []) as unknown as DonationRow[]).map((donation) => [
    donation.donation_date,
    donation.type,
    donation.method,
    Number(donation.amount),
    donation.currency,
    donation.members ? `${donation.members.first_name} ${donation.members.last_name}` : "Anonymous",
    donation.reference,
    donation.notes,
  ]);

  const csv = toCsv(
    ["date", "type", "method", "amount", "currency", "member", "reference", "notes"],
    rows,
  );

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="giving-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
