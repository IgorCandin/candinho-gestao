import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();
  if (!access.active || !(access.role === "admin" || access.canWriteSupplements)) {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const customerId = text(body.customer_id, 80);
  const partnerId = text(body.partner_id, 80);
  const action = body.action === "ignore" ? "ignore" : body.action === "snooze" ? "snooze" : null;

  if (!customerId || !partnerId || !action) {
    return NextResponse.json({ ok: false, error: "Revisão inválida." }, { status: 400 });
  }

  const daysRaw = Number(body.days ?? 30);
  const days = Number.isFinite(daysRaw) ? Math.min(180, Math.max(1, Math.round(daysRaw))) : 30;
  const snoozedUntil =
    action === "snooze"
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_partner_link_reviews")
    .upsert(
      {
        customer_id: customerId,
        partner_id: partnerId,
        review_status: action === "ignore" ? "ignored" : "snoozed",
        snoozed_until: snoozedUntil,
        notes: text(body.notes, 1000) || null,
      },
      { onConflict: "customer_id,partner_id" },
    );

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Não foi possível registrar a revisão." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
