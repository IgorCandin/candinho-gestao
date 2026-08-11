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

  const canManageTasks = writableScopes.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central"
        title="Agenda Global"
        description="Central, Suplementos, Fitness, Marketing e Agenda Estratégica em um único calendário. Cada operação continua com sua própria visão filtrada."
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
        items={agenda.items}
        summary={agenda.summary}
        scopes={scopes}
        canManageTasks={canManageTasks}
      />
    </>
  );
}
