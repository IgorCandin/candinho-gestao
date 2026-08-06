import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max = 800) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

async function ensureWrite() {
  const access = await getCurrentUserAccess();
  return access.active && (access.role === "admin" || access.canWriteSupplements);
}

export async function POST(request: Request) {
  if (!(await ensureWrite())) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const items = Array.isArray(body.items)
    ? body.items
        .filter((item) => item && typeof item === "object")
        .slice(0, 50)
        .map((item) => {
          const row = item as Record<string, unknown>;
          return {
            product_id: clean(row.product_id, 80),
            location_id: clean(row.location_id, 80),
            flavor_id: clean(row.flavor_id, 80),
            quantity: Math.max(0, Math.trunc(Number(row.quantity ?? 0))),
            notes: clean(row.notes, 300),
          };
        })
    : [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_commercial_outflow_v1", {
    p_reason_code: clean(body.reason_code, 80),
    p_partner_id: clean(body.partner_id, 80),
    p_destination_name: clean(body.destination_name, 160),
    p_occurred_on: clean(body.occurred_on, 10),
    p_notes: clean(body.notes, 1000),
    p_items: items,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, result: data });
}

export async function DELETE(request: Request) {
  if (!(await ensureWrite())) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = clean(body.id, 80);
  if (!id) return NextResponse.json({ error: "Saída inválida." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_commercial_outflow_v1", {
    p_outflow_id: id,
    p_reason: clean(body.reason, 500),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, result: data });
}
