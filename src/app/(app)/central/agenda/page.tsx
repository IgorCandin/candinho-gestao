import { redirect } from "next/navigation";
import { CentralGlobalCalendarV4522 } from "@/components/central-global-calendar-v45-22";
import { CentralTaskCreateForm } from "@/components/central-task-create-form";
import { GoogleCalendarConnectionCard } from "@/components/google-calendar-connection-card";
import { PageHeader } from "@/components/page-header";
import {
  getCentralAgendaUsers,
  getCentralContacts,
} from "@/lib/central-data";
import {
  getCentralUnifiedAgendaSnapshot,
  type CentralUnifiedAgendaScope,
} from "@/lib/central-unified-agenda";
import { getCurrentUserAccess } from "@/lib/data";
import { getGoogleCalendarStatus } from "@/lib/google-calendar-data";

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

function isCommercialQueueItem(notes: string | null) {
  if (!notes) return false;
  return (
    notes.startsWith("[Recompra automática]") ||
    notes.startsWith("[Lead:") ||
    notes.startsWith("[Fila Comercial]")
  );
}

export default async function CentralAgendaPage() {
  const access = await getCurrentUserAccess();

  if (
    !(
      access.role === "admin" ||
      access.canAccessSupplements ||
      access.canAccessFitness ||
      access.canAccessMarketing
    )
  ) {
    redirect("/dashboard");
  }

  const scopes: CentralUnifiedAgendaScope[] = [
    "company",
    ...(access.canAccessSupplements || access.role === "admin"
      ? (["supplements"] as const)
      : []),
    ...(access.canAccessFitness || access.role === "admin"
      ? (["fitness"] as const)
      : []),
    ...(access.canAccessMarketing || access.role === "admin"
      ? (["marketing"] as const)
      : []),
  ];

  const writableScopes = [
    ...(access.role === "admin" ? ["company"] : []),
    ...(access.canWriteSupplements ? ["supplements"] : []),
    ...(access.canWriteFitness ? ["fitness"] : []),
    ...(access.canWriteMarketing ? ["marketing"] : []),
  ];

  const [agenda, contacts, users, googleCalendar] = await Promise.all([
    getCentralUnifiedAgendaSnapshot({
      canSupplements:
        access.role === "admin" || access.canAccessSupplements,
      canFitness: access.role === "admin" || access.canAccessFitness,
      canMarketing: access.role === "admin" || access.canAccessMarketing,
    }),
    getCentralContacts(),
    getCentralAgendaUsers(),
    getGoogleCalendarStatus(),
  ]);

  const cleanItems = agenda.items.filter(
    (item) => !isCommercialQueueItem(item.notes),
  );
  const today = todayBrazil();
  const month = today.slice(0, 7);
  const summaryItems = cleanItems;
  const cleanSummary = {
    today_count: summaryItems.filter(
      (item) => item.status === "planned" && item.due_date === today,
    ).length,
    overdue_count: summaryItems.filter(
      (item) => item.status === "planned" && item.due_date < today,
    ).length,
    next_seven_days_count: summaryItems.filter((item) => {
      if (item.status !== "planned") return false;
      const diff = dayDiff(item.due_date, today);
      return diff > 0 && diff <= 7;
    }).length,
    completed_month_count: summaryItems.filter(
      (item) =>
        item.status === "completed" && item.due_date.startsWith(month),
    ).length,
    pending_count: summaryItems.filter((item) => item.status === "planned").length,
  };

  const canManageTasks = writableScopes.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central"
        title="Agenda Global"
        description="Central, Suplementos, Fitness, Marketing e Agenda Estratégica em um único calendário. A fila comercial fica resumida no Meu Dia e na Agenda de Suplementos."
        action={
          canManageTasks ? (
            <CentralTaskCreateForm
              scopes={writableScopes}
              contacts={contacts}
              users={users}
            />
          ) : null
        }
      />

      {canManageTasks && (
        <GoogleCalendarConnectionCard status={googleCalendar} />
      )}

      <CentralGlobalCalendarV4522
        items={cleanItems}
        summary={cleanSummary}
        scopes={scopes}
        canManageTasks={canManageTasks}
      />
    </>
  );
}
