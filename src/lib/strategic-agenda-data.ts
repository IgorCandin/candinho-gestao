import { createClient } from "@/lib/supabase/server";

export type StrategicAgendaItem = {
  id: string;
  reference_month: string;
  template_id: string | null;
  code: string | null;
  week_number: number;
  task: string;
  objective: string | null;
  priority: "low" | "medium" | "high" | "extreme";
  category: string;
  action_href: string | null;
  action_label: string | null;
  sort_order: number;
  status: "planned" | "completed" | "postponed";
  completed_at: string | null;
  postponed_at: string | null;
  impact_note: string | null;
  notes: string | null;
  priority_rank: number;
  scheduled_on: string | null;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function brazilMonthKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${year}-${month}`;
}

export function normalizeStrategicMonth(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})/);
  const key = match ? `${match[1]}-${match[2]}` : brazilMonthKey();
  return `${key}-01`;
}

export function strategicMonthKey(value: string) {
  return value.slice(0, 7);
}

export function shiftStrategicMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function strategicMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export async function getStrategicAgendaMonth(monthValue?: string) {
  const supabase = await createClient();
  const referenceMonth = normalizeStrategicMonth(monthValue);

  const { error: generationError } = await supabase.rpc(
    "central_generate_strategic_agenda_month",
    { p_month: referenceMonth },
  );

  if (generationError) {
    throw new Error(
      `Falha ao preparar a Agenda Estratégica: ${generationError.message}`,
    );
  }

  const { data, error } = await supabase
    .from("central_strategic_agenda_overview")
    .select("*")
    .eq("reference_month", referenceMonth)
    .order("week_number")
    .order("sort_order")
    .order("created_at");

  if (error) {
    throw new Error(`Falha ao carregar a Agenda Estratégica: ${error.message}`);
  }

  const items: StrategicAgendaItem[] = (data ?? []).map((row) => ({
    id: String(row.id),
    reference_month: String(row.reference_month),
    template_id: row.template_id ? String(row.template_id) : null,
    code: row.code ? String(row.code) : null,
    week_number: numberValue(row.week_number),
    task: String(row.task ?? ""),
    objective: row.objective ? String(row.objective) : null,
    priority: String(row.priority ?? "medium") as StrategicAgendaItem["priority"],
    category: String(row.category ?? "Geral"),
    action_href: row.action_href ? String(row.action_href) : null,
    action_label: row.action_label ? String(row.action_label) : null,
    sort_order: numberValue(row.sort_order),
    status: String(row.status ?? "planned") as StrategicAgendaItem["status"],
    completed_at: row.completed_at ? String(row.completed_at) : null,
    postponed_at: row.postponed_at ? String(row.postponed_at) : null,
    impact_note: row.impact_note ? String(row.impact_note) : null,
    notes: row.notes ? String(row.notes) : null,
    priority_rank: numberValue(row.priority_rank),
    scheduled_on: row.scheduled_on ? String(row.scheduled_on) : null,
  }));

  return {
    referenceMonth,
    monthKey: strategicMonthKey(referenceMonth),
    items,
  };
}
