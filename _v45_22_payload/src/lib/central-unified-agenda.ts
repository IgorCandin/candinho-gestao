import { createClient } from "@/lib/supabase/server";

export type CentralUnifiedAgendaScope =
  | "company"
  | "supplements"
  | "fitness"
  | "marketing";

export type CentralUnifiedAgendaItem = {
  event_key: string;
  operation_scope: CentralUnifiedAgendaScope;
  source_type: string;
  source_id: string;
  editable_task_id: string | null;
  category: string;
  title: string;
  subtitle: string | null;
  due_at: string;
  due_date: string;
  status: "planned" | "completed" | "cancelled";
  priority: "normal" | "attention" | "urgent";
  contact_name: string | null;
  contact_phone: string | null;
  assigned_name: string | null;
  href: string | null;
  notes: string | null;
  amount: number | null;
};

export type CentralUnifiedAgendaSnapshot = {
  summary: {
    today_count: number;
    overdue_count: number;
    next_seven_days_count: number;
    completed_month_count: number;
    pending_count: number;
  };
  items: CentralUnifiedAgendaItem[];
};

type LoadOptions = {
  canSupplements: boolean;
  canFitness: boolean;
  canMarketing: boolean;
  scope?: string | null;
  status?: string | null;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function nullable(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function numeric(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(
  value: unknown,
): CentralUnifiedAgendaItem["status"] {
  const raw = text(value, "planned").toLowerCase();

  if (raw === "completed") return "completed";
  if (raw === "cancelled" || raw === "postponed") return "cancelled";
  return "planned";
}

function normalizePriority(
  value: unknown,
): CentralUnifiedAgendaItem["priority"] {
  const raw = text(value, "normal").toLowerCase();

  if (raw === "urgent" || raw === "extreme" || raw === "high") {
    return "urgent";
  }
  if (raw === "attention" || raw === "medium") return "attention";
  return "normal";
}

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateAtNoon(date: string) {
  return `${date.slice(0, 10)}T12:00:00-03:00`;
}

function dayDiff(date: string, today: string) {
  const a = new Date(`${date.slice(0, 10)}T12:00:00-03:00`).getTime();
  const b = new Date(`${today}T12:00:00-03:00`).getTime();
  return Math.round((a - b) / 86_400_000);
}

function taskHref(
  scope: CentralUnifiedAgendaScope,
  row: Record<string, unknown>,
) {
  const contactId = nullable(row.central_contact_id);

  if (scope === "supplements") return "/suplementos/agenda";
  if (scope === "fitness") return "/fitness/agenda";
  if (scope === "marketing") return "/central/marketing/planejamento";
  if (contactId) return `/central/clientes/${contactId}`;
  return "/central/agenda";
}

export async function getCentralUnifiedAgendaSnapshot({
  canSupplements,
  canFitness,
  canMarketing,
  scope = null,
  status = null,
}: LoadOptions): Promise<CentralUnifiedAgendaSnapshot> {
  const supabase = await createClient();
  const allowedScopes: CentralUnifiedAgendaScope[] = [
    "company",
    ...(canSupplements ? (["supplements"] as const) : []),
    ...(canFitness ? (["fitness"] as const) : []),
    ...(canMarketing ? (["marketing"] as const) : []),
  ];

  const items: CentralUnifiedAgendaItem[] = [];

  const { data: taskRows, error: taskError } = await supabase
    .from("central_operational_tasks_overview")
    .select("*")
    .in("operation_scope", allowedScopes)
    .limit(800);

  if (taskError) throw taskError;

  for (const raw of taskRows ?? []) {
    const row = raw as Record<string, unknown>;
    const operationScope = text(
      row.operation_scope,
      "company",
    ) as CentralUnifiedAgendaScope;

    if (!allowedScopes.includes(operationScope)) continue;

    const dueAt = text(row.due_at);
    if (!dueAt) continue;

    items.push({
      event_key: `central-task:${text(row.id)}`,
      operation_scope: operationScope,
      source_type: "task",
      source_id: text(row.id),
      editable_task_id: text(row.id) || null,
      category: text(row.category, "task"),
      title: text(row.title, "Tarefa"),
      subtitle:
        nullable(row.contact_name) ??
        nullable(row.notes) ??
        "Tarefa operacional",
      due_at: dueAt,
      due_date: text(row.due_date) || dueAt.slice(0, 10),
      status: normalizeStatus(row.status),
      priority: normalizePriority(row.priority),
      contact_name: nullable(row.contact_name),
      contact_phone: nullable(row.contact_phone),
      assigned_name: nullable(row.assigned_name),
      href: taskHref(operationScope, row),
      notes: nullable(row.notes),
      amount: null,
    });
  }

  if (canSupplements) {
    const { data, error } = await supabase
      .from("operational_calendar_events")
      .select("*")
      .neq("source_type", "task")
      .limit(1400);

    if (error) throw error;

    for (const raw of data ?? []) {
      const row = raw as Record<string, unknown>;
      const dueAt = text(row.due_at);
      if (!dueAt) continue;

      items.push({
        event_key: `supplements:${text(row.event_key)}`,
        operation_scope: "supplements",
        source_type: text(row.source_type, "event"),
        source_id: text(row.source_id),
        editable_task_id: null,
        category: text(row.category, "other"),
        title: text(row.title, "Compromisso"),
        subtitle: nullable(row.subtitle),
        due_at: dueAt,
        due_date: text(row.due_date) || dueAt.slice(0, 10),
        status: normalizeStatus(row.status),
        priority: normalizePriority(row.priority),
        contact_name: nullable(row.customer_name),
        contact_phone: nullable(row.customer_phone),
        assigned_name: nullable(row.assigned_name),
        href: nullable(row.href),
        notes: nullable(row.notes),
        amount: row.amount == null ? null : numeric(row.amount),
      });
    }
  }

  if (canFitness) {
    const [salesResult, postSaleResult, ordersResult] = await Promise.all([
      supabase
        .from("fitness_sales_operational")
        .select(
          "id,customer_id,customer_name,payment_due_on,payment_status,product_summary,total_amount,general_status",
        )
        .eq("payment_status", "receivable")
        .not("payment_due_on", "is", null)
        .limit(500),

      supabase
        .from("fitness_post_sale_overview")
        .select(
          "id,customer_id,customer_name,product_summary,total_amount,due_on,status",
        )
        .not("due_on", "is", null)
        .limit(500),

      supabase
        .from("fitness_purchase_order_operational")
        .select(
          "id,supplier_name,product_summary,pending_units,grand_total,expected_on,status",
        )
        .gt("pending_units", 0)
        .not("expected_on", "is", null)
        .limit(400),
    ]);

    if (salesResult.error) throw salesResult.error;
    if (postSaleResult.error) throw postSaleResult.error;
    if (ordersResult.error) throw ordersResult.error;

    const today = todayBrazil();

    for (const raw of salesResult.data ?? []) {
      const row = raw as Record<string, unknown>;
      const dueDate = text(row.payment_due_on);
      if (!dueDate) continue;

      items.push({
        event_key: `fitness:payment:${text(row.id)}`,
        operation_scope: "fitness",
        source_type: "fitness_sale_payment",
        source_id: text(row.id),
        editable_task_id: null,
        category: "payment",
        title: `Cobrança · ${text(row.customer_name, "Cliente")}`,
        subtitle: nullable(row.product_summary) ?? "Venda Fitness",
        due_at: dateAtNoon(dueDate),
        due_date: dueDate,
        status: "planned",
        priority: dueDate < today ? "urgent" : "attention",
        contact_name: nullable(row.customer_name),
        contact_phone: null,
        assigned_name: null,
        href: `/fitness/vendas/${text(row.id)}`,
        notes: null,
        amount: numeric(row.total_amount),
      });
    }

    for (const raw of postSaleResult.data ?? []) {
      const row = raw as Record<string, unknown>;
      const dueDate = text(row.due_on);
      if (!dueDate) continue;

      items.push({
        event_key: `fitness:post-sale:${text(row.id)}`,
        operation_scope: "fitness",
        source_type: "fitness_post_sale",
        source_id: text(row.id),
        editable_task_id: null,
        category: "post_sale",
        title: `Pós-venda · ${text(row.customer_name, "Cliente")}`,
        subtitle: nullable(row.product_summary) ?? "Acompanhamento Fitness",
        due_at: dateAtNoon(dueDate),
        due_date: dueDate,
        status: normalizeStatus(row.status),
        priority:
          normalizeStatus(row.status) === "planned" && dueDate < today
            ? "urgent"
            : "normal",
        contact_name: nullable(row.customer_name),
        contact_phone: null,
        assigned_name: null,
        href: "/fitness/pos-venda",
        notes: null,
        amount: numeric(row.total_amount),
      });
    }

    for (const raw of ordersResult.data ?? []) {
      const row = raw as Record<string, unknown>;
      const dueDate = text(row.expected_on);
      if (!dueDate) continue;

      items.push({
        event_key: `fitness:purchase:${text(row.id)}`,
        operation_scope: "fitness",
        source_type: "fitness_purchase_order",
        source_id: text(row.id),
        editable_task_id: null,
        category: "supplier",
        title: `Chegada prevista · ${text(row.supplier_name, "Fornecedor")}`,
        subtitle:
          nullable(row.product_summary) ??
          `${numeric(row.pending_units)} unidade(s) a caminho`,
        due_at: dateAtNoon(dueDate),
        due_date: dueDate,
        status: "planned",
        priority: dueDate < today ? "attention" : "normal",
        contact_name: null,
        contact_phone: null,
        assigned_name: null,
        href: `/fitness/pedidos/${text(row.id)}`,
        notes: null,
        amount: numeric(row.grand_total),
      });
    }
  }

  const strategicResult = await supabase
    .from("central_strategic_agenda_overview")
    .select("*")
    .not("scheduled_on", "is", null)
    .limit(900);

  if (!strategicResult.error) {
    for (const raw of strategicResult.data ?? []) {
      const row = raw as Record<string, unknown>;
      const dueDate = text(row.scheduled_on);
      if (!dueDate) continue;

      const month = text(row.reference_month).slice(0, 7);
      items.push({
        event_key: `strategic:${text(row.id)}`,
        operation_scope: "company",
        source_type: "strategic_agenda",
        source_id: text(row.id),
        editable_task_id: null,
        category: "task",
        title: `Estratégica · ${text(row.task, "Ação estratégica")}`,
        subtitle:
          nullable(row.objective) ??
          nullable(row.category) ??
          "Agenda Estratégica",
        due_at: dateAtNoon(dueDate),
        due_date: dueDate,
        status: normalizeStatus(row.status),
        priority: normalizePriority(row.priority),
        contact_name: null,
        contact_phone: null,
        assigned_name: null,
        href:
          nullable(row.action_href) ??
          `/central/agenda-estrategica${month ? `?month=${month}` : ""}`,
        notes: nullable(row.notes),
        amount: null,
      });
    }
  }

  const unique = [
    ...new Map(items.map((item) => [item.event_key, item])).values(),
  ];

  const filtered = unique
    .filter(
      (item) =>
        !scope ||
        item.operation_scope === scope,
    )
    .filter(
      (item) =>
        !status || item.status === status,
    )
    .sort((a, b) => a.due_at.localeCompare(b.due_at));

  const today = todayBrazil();
  const currentMonth = today.slice(0, 7);

  const summaryItems = unique.filter(
    (item) => !scope || item.operation_scope === scope,
  );

  return {
    summary: {
      today_count: summaryItems.filter(
        (item) =>
          item.status === "planned" &&
          item.due_date === today,
      ).length,
      overdue_count: summaryItems.filter(
        (item) =>
          item.status === "planned" &&
          item.due_date < today,
      ).length,
      next_seven_days_count: summaryItems.filter((item) => {
        if (item.status !== "planned") return false;
        const diff = dayDiff(item.due_date, today);
        return diff > 0 && diff <= 7;
      }).length,
      completed_month_count: summaryItems.filter(
        (item) =>
          item.status === "completed" &&
          item.due_date.startsWith(currentMonth),
      ).length,
      pending_count: summaryItems.filter(
        (item) => item.status === "planned",
      ).length,
    },
    items: filtered,
  };
}
