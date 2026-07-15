import { redirect } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
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

export default async function AgendaPage() {
  const access = await getCurrentUserAccess();
  if (!access.canAccessSupplements) redirect("/dashboard");

  const [events, summary, customers, sales, purchaseOrders, users] = await Promise.all([
    getAgendaEvents(),
    getAgendaSummary(),
    getCustomerOptions(),
    getAgendaSaleOptions(),
    getAgendaPurchaseOrderOptions(),
    getAgendaUsers(),
  ]);

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Rotina operacional"
        title="Agenda"
        description="Cobranças, retornos, pós-venda, entregas, chegadas e tarefas manuais em um único calendário."
      />
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
