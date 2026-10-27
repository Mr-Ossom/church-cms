import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { attendanceCheckSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const context = await getSessionContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["admin", "leader"].includes(context.profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = attendanceCheckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data: session } = await context.supabase
    .from("attendance_sessions")
    .select("id")
    .eq("id", parsed.data.session_id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found or not accessible" }, { status: 404 });
  }

  const { error } = await context.supabase.from("attendance_records").upsert(
    {
      session_id: parsed.data.session_id,
      member_id: parsed.data.member_id,
      status: parsed.data.status,
      checked_in_at: new Date().toISOString(),
    },
    { onConflict: "session_id,member_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
