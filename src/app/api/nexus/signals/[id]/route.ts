import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getCurrentUserAccess();

  if (!(access.active && (access.role === "admin" || access.canWriteSupplements))) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const action =
    typeof body.action === "string" ? body.action.toLowerCase() : "snooze";
  const allowed = new Set(["snooze", "resolve", "dismiss", "reopen"]);

  if (!allowed.has(action)) {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  const days = Math.min(Math.max(Number(body.days ?? 3) || 3, 1), 30);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_nexus_signal_status_v1", {
    p_signal_id: id,
    p_action: action,
    p_snooze_days: days,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, signal: data });
}
