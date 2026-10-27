import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/utils";

interface SessionRow {
  session_date: string;
  title: string;
  headcount: number;
  notes: string | null;
  events: { title: string } | null;
}

export async function GET() {
  const context = await getSessionContext();
  if (!context || !["admin", "pastor", "leader"].includes(context.profile.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data, error } = await context.supabase
    .from("attendance_sessions")
    .select("session_date, title, headcount, notes, events(title)")
    .order("session_date", { ascending: false });

  if (error) {
    return new NextResponse(error.message, { status: 400 });
  }

  const rows = ((data ?? []) as unknown as SessionRow[]).map((session) => [
    session.session_date,
    formatDate(session.session_date),
    session.title,
    session.events?.title ?? "",
    session.headcount,
    session.notes,
  ]);

  const csv = toCsv(
    ["date", "formatted_date", "session", "event", "headcount", "notes"],
    rows,
  );

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
