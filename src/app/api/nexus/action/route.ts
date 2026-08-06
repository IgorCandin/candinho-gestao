import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max = 500) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();

  if (!(access.active && (access.role === "admin" || access.canWriteSupplements))) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = object(await request.json().catch(() => ({})));
  const mode = body.mode === "execute" ? "execute" : "preview";
  const supabase = await createClient();

  if (mode === "execute") {
    const planId = clean(body.plan_id, 80);
    if (!planId) {
      return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("nexus_execute_action_v1", {
      p_plan_id: planId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  }

  const actionKind = clean(body.action_kind, 80);
  const allowed = new Set([
    "signal_status",
    "schedule_customer_followup",
    "create_operational_task",
  ]);

  if (!actionKind || !allowed.has(actionKind)) {
    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("nexus_prepare_action_v1", {
    p_action_kind: actionKind,
    p_payload: object(body.payload),
    p_source_route: clean(body.source_route, 300),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
