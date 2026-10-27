import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const context = await getSessionContext();
  if (!context || !["admin", "pastor"].includes(context.profile.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const status = searchParams.get("status") ?? "";

  let query = context.supabase
    .from("members")
    .select("*")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (q) {
    const safe = q.replace(/[%,()]/g, " ").trim();
    if (safe) {
      query = query.or(
        `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`,
      );
    }
  }
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return new NextResponse(error.message, { status: 400 });
  }

  const rows = (data ?? []).map((member) => [
    member.first_name,
    member.last_name,
    member.other_names,
    member.gender,
    member.date_of_birth,
    member.marital_status,
    member.phone,
    member.email,
    member.address,
    member.joined_date,
    member.status,
    member.notes,
  ]);

  const csv = toCsv(
    [
      "first_name",
      "last_name",
      "other_names",
      "gender",
      "date_of_birth",
      "marital_status",
      "phone",
      "email",
      "address",
      "joined_date",
      "status",
      "notes",
    ],
    rows,
  );

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="members-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
