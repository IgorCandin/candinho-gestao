import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function canWrite() {
  const access = await getCurrentUserAccess();
  return access.active && (access.role === "admin" || access.canWriteSupplements);
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getCurrentUserAccess();
  if (!access.active || !access.canAccessSupplements) {
    return NextResponse.json({ error: "Sem acesso ao CRM." }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_sales_opportunities_actionable_v2")
    .select("*")
    .eq("customer_id", id)
    .order("opportunity_score", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ opportunities: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await canWrite())) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const allowed = new Set([
    "contacted",
    "still_using",
    "product_ended",
    "not_interested",
    "bought_elsewhere",
    "later",
    "sale_completed",
    "dismissed",
  ]);

  const feedbackStatus = clean(body.feedback_status, 40);
  if (!feedbackStatus || !allowed.has(feedbackStatus)) {
    return NextResponse.json({ error: "Feedback inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_sales_opportunity_feedback_v1", {
    p_customer_id: id,
    p_recommended_product_id: clean(body.recommended_product_id, 80),
    p_opportunity_group: clean(body.opportunity_group, 80),
    p_opportunity_subtype: clean(body.opportunity_subtype, 160),
    p_feedback_status: feedbackStatus,
    p_notes: clean(body.notes, 800),
    p_next_action_on: clean(body.next_action_on, 10),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
