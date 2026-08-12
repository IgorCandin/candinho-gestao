import { redirect } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { GoogleCalendarConnectionCard } from "@/components/google-calendar-connection-card";
import { OperationalCalendar } from "@/components/operational-calendar";
import { PageHeader } from "@/components/page-header";
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

export default async function AgendaPage() {
  const access = await getCurrentUserAccess();
  if (!access.canAccessSupplements) redirect("/dashboard");

  const supabase = await createClient();

  if (access.canWriteSupplements || access.role === "admin") {
    const { error: queueError } = await supabase.rpc(
      "rebalance_flexible_commercial_contacts_v1",
      { p_daily_cap: 12 },
    );

    if (queueError) {
      console.error(
        "Não foi possível reorganizar a fila comercial flexível:",
        queueError,
      );
    }
  }

  const [
    events,
    customers,
    sales,
    purchaseOrders,
    users,
    googleCalendar,
    taskScopeResult,
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
  ]);

  if (taskScopeResult.error) throw taskScopeResult.error;

  const supplementTaskIds = new Set(
    (taskScopeResult.data ?? []).map((row) => String(row.id)),
  );

  const scopedEvents = events.filter(
    (event) =>
      event.source_type !== "task" ||
      supplementTaskIds.has(event.source_id),
  );

  const today = todayBrazil();
  const month = today.slice(0, 7);

  const summary = {
    today_count: scopedEvents.filter(
      (event) =>
        event.status === "planned" &&
        event.due_date === today,
    ).length,
    overdue_count: scopedEvents.filter(
      (event) =>
        event.status === "planned" &&
        event.due_date < today,
    ).length,
    next_seven_days_count: scopedEvents.filter((event) => {
      if (event.status !== "planned") return false;
      const diff = dayDiff(event.due_date, today);
      return diff > 0 && diff <= 7;
    }).length,
    completed_month_count: scopedEvents.filter(
      (event) =>
        event.status === "completed" &&
        event.due_date.startsWith(month),
    ).length,
  };

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Candinho Suplementos"
        title="Agenda"
        description="Compromissos fixos continuam vencendo normalmente. A fila comercial flexível é reorganizada automaticamente para manter até 12 contatos por dia."
      />

      {access.canWriteSupplements && (
        <GoogleCalendarConnectionCard status={googleCalendar} />
      )}

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
