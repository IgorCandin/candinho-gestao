import { redirect } from "next/navigation";
import { AgendaDragDropV4532 } from "@/components/agenda-drag-drop-v45-32";
import { CommercialContactAgendaCard } from "@/components/commercial-contact-agenda-card";
import { DemoBanner } from "@/components/demo-banner";
import { GoogleCalendarConnectionCard } from "@/components/google-calendar-connection-card";
import { OperationalCalendar } from "@/components/operational-calendar";
import { PageHeader } from "@/components/page-header";
import {
  emptyCommercialContactQueue,
  type CommercialContactQueueSnapshot,
} from "@/lib/commercial-contact-types";
import {
  getAgendaEvents,
  getAgendaPurchaseOrderOptions,
  getAgendaSaleOptions,
  getAgendaUsers,
  getCurrentUserAccess,
  getCustomerOptions,
} from "@/lib/data";
import { getGoogleCalendarStatus } from "@/lib/google-calendar-data";
import { createClient } from "@/lib/supabase/server";

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dayDiff(date: string, today: string) {
  const a = new Date(`${date}T12:00:00-03:00`).getTime();
  const b = new Date(`${today}T12:00:00-03:00`).getTime();
  return Math.round((a - b) / 86_400_000);
}

function belongsToCommercialQueue(notes: string | null) {
  if (!notes) return false;
  return (
    notes.startsWith("[Recompra automática]") ||
    notes.startsWith("[Lead:") ||
    notes.startsWith("[Fila Comercial]")
  );
}

export default async function AgendaPage() {
  const access = await getCurrentUserAccess();
  if (!access.canAccessSupplements) redirect("/dashboard");

  const supabase = await createClient();
  const today = todayBrazil();

  const [
    events,
    customers,
    sales,
    purchaseOrders,
    users,
    googleCalendar,
    taskScopeResult,
    commercialQueueResult,
  ] = await Promise.all([
    getAgendaEvents(),
    getCustomerOptions(),
    getAgendaSaleOptions(),
    getAgendaPurchaseOrderOptions(),
    getAgendaUsers(),
    getGoogleCalendarStatus(),
    supabase
      .from("operational_tasks")
      .select("id")
      .eq("operation_scope", "supplements"),
    supabase.rpc("commercial_contact_queue_v1", { p_limit: 1 }),
  ]);

  if (taskScopeResult.error) throw taskScopeResult.error;

  const commercialQueue = commercialQueueResult.error
    ? emptyCommercialContactQueue(today)
    : ((commercialQueueResult.data as CommercialContactQueueSnapshot | null) ??
      emptyCommercialContactQueue(today));

  const supplementTaskIds = new Set(
    (taskScopeResult.data ?? []).map((row) => String(row.id)),
  );

  const scopedEvents = events.filter((event) => {
    if (belongsToCommercialQueue(event.notes)) return false;
    return (
      event.source_type !== "task" ||
      supplementTaskIds.has(event.source_id)
    );
  });

  const month = today.slice(0, 7);

  const summary = {
    today_count: scopedEvents.filter(
      (event) => event.status === "planned" && event.due_date === today,
    ).length + (commercialQueue.skipped ? 0 : commercialQueue.completed ? 0 : 1),
    overdue_count: scopedEvents.filter(
      (event) => event.status === "planned" && event.due_date < today,
    ).length,
    next_seven_days_count: scopedEvents.filter((event) => {
      if (event.status !== "planned") return false;
      const diff = dayDiff(event.due_date, today);
      return diff > 0 && diff <= 7;
    }).length,
    completed_month_count: scopedEvents.filter(
      (event) =>
        event.status === "completed" && event.due_date.startsWith(month),
    ).length + (commercialQueue.completed ? 1 : 0),
  };

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Candinho Suplementos"
        title="Agenda"
        description="Aqui ficam as obrigações reais: pagamentos, pós-venda, fornecedor, entregas e tarefas com data. A meta comercial aparece em um único card de hoje."
      />

      {access.canWriteSupplements && (
        <GoogleCalendarConnectionCard status={googleCalendar} />
      )}

      {!commercialQueue.skipped && (
        <CommercialContactAgendaCard snapshot={commercialQueue} />
      )}

      <AgendaDragDropV4532
        events={scopedEvents}
        enabled={access.canWriteSupplements}
      />

      <OperationalCalendar
        events={scopedEvents}
        summary={summary}
        customers={customers}
        sales={sales}
        purchaseOrders={purchaseOrders}
        users={users}
        canWrite={access.canWriteSupplements}
      />
    </>
  );
}
