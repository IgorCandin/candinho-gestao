import { redirect } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { GoogleCalendarConnectionCard } from "@/components/google-calendar-connection-card";
import { OperationalCalendar } from "@/components/operational-calendar";
import { PageHeader } from "@/components/page-header";
import {
  getAgendaEvents,
  getAgendaPurchaseOrderOptions,
  getAgendaSaleOptions,
  getAgendaSummary,
  getAgendaUsers,
  getCurrentUserAccess,
  getCustomerOptions,
} from "@/lib/data";
import { getGoogleCalendarStatus } from "@/lib/google-calendar-data";

export default async function AgendaPage() {
  const access = await getCurrentUserAccess();
  if (!access.canAccessSupplements)
    redirect("/dashboard");

  const [
    events,
    summary,
    customers,
    sales,
    purchaseOrders,
    users,
    googleCalendar,
  ] = await Promise.all([
    getAgendaEvents(),
    getAgendaSummary(),
    getCustomerOptions(),
    getAgendaSaleOptions(),
    getAgendaPurchaseOrderOptions(),
    getAgendaUsers(),
    getGoogleCalendarStatus(),
  ]);

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Rotina operacional"
        title="Agenda"
        description="Cobranças, retornos, pós-venda, entregas, chegadas e tarefas manuais em um único calendário."
      />

      {access.canWriteSupplements && (
        <GoogleCalendarConnectionCard
          status={googleCalendar}
        />
      )}

      <OperationalCalendar
        events={events}
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
