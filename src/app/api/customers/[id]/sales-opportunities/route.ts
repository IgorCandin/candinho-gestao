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

function brazilDateAfter(days: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: "year" | "month" | "day") => Number(parts.find((part) => part.type === type)?.value);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
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

  const workflowAction = clean(body.workflow_action, 40);
  const workflow = workflowAction ? {
    called: { status: "contacted", days: 1, notes: "Company · contato iniciado; confirmar resposta" },
    skipped: { status: "later", days: 30, notes: "Company · pulado para o fim da fila mensal" },
    lost_contact: { status: "dismissed", days: null, notes: "Company · contato perdido; separar da fila ativa" },
    no_response: { status: "later", days: 30, notes: "Company · não respondeu; tentar novamente em 30 dias" },
    converted_sale: { status: "sale_completed", days: null, notes: "Company · resposta convertida em venda" },
    preferred_wait: { status: "later", days: 30, notes: "Company · preferiu esperar; retomar em 30 dias" },
    not_interested_month: { status: "later", days: 30, notes: "Company · não quer agora; retomar em 30 dias" },
  }[workflowAction] : null;

  if (workflowAction && !workflow) {
    return NextResponse.json({ error: "Ação comercial inválida." }, { status: 400 });
  }

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

  const feedbackStatus = workflow?.status ?? clean(body.feedback_status, 40);
  if (!feedbackStatus || !allowed.has(feedbackStatus)) {
    return NextResponse.json({ error: "Feedback inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const workflowNextAction = workflow?.days == null ? null : brazilDateAfter(workflow.days);

  if (workflowAction === "called" && workflowNextAction) {
    const { error: scheduleError } = await supabase.rpc("central_schedule_radar_followup", {
      p_customer_id: id,
      p_due_at: `${workflowNextAction}T15:00:00.000Z`,
      p_priority: "attention",
      p_notes: "Company · verificar se o cliente respondeu ao contato comercial",
    });
    if (scheduleError) return NextResponse.json({ error: scheduleError.message }, { status: 400 });
  }

  const { error } = await supabase.rpc("record_sales_opportunity_feedback_v1", {
    p_customer_id: id,
    p_recommended_product_id: clean(body.recommended_product_id, 80),
    p_opportunity_group: clean(body.opportunity_group, 80),
    p_opportunity_subtype: clean(body.opportunity_subtype, 160),
    p_feedback_status: feedbackStatus,
    p_notes: workflow?.notes ?? clean(body.notes, 800),
    p_next_action_on: workflow ? workflowNextAction : clean(body.next_action_on, 10),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, next_action_on: workflowNextAction });
}
