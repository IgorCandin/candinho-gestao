import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { isUuidRouteParam } from "@/lib/route-param-guards";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();
  if (!access.active || !(access.role === "admin" || access.canWriteSupplements)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const movementId = typeof body.movement_id === "string" ? body.movement_id : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";

  if (!isUuidRouteParam(movementId)) {
    return NextResponse.json({ error: "Acerto inválido." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "Informe o motivo do estorno." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reverse_inventory_adjustment_v1", {
    p_movement_id: movementId,
    p_reason: reason,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, result: data });
}
