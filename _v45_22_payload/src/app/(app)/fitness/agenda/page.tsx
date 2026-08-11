import { redirect } from "next/navigation";
import { CentralGlobalCalendarV4522 } from "@/components/central-global-calendar-v45-22";
import { CentralTaskCreateForm } from "@/components/central-task-create-form";
import { GoogleCalendarConnectionCard } from "@/components/google-calendar-connection-card";
import { PageHeader } from "@/components/page-header";
import {
  getCentralAgendaUsers,
  getCentralContacts,
} from "@/lib/central-data";
import { getCentralUnifiedAgendaSnapshot } from "@/lib/central-unified-agenda";
import { getCurrentUserAccess } from "@/lib/data";
import { getGoogleCalendarStatus } from "@/lib/google-calendar-data";

export default async function FitnessAgendaPage() {
  const access = await getCurrentUserAccess();
  if (!access.canAccessFitness && access.role !== "admin") {
    redirect("/dashboard");
  }

  const [agenda, contacts, users, googleCalendar] = await Promise.all([
    getCentralUnifiedAgendaSnapshot({
      canSupplements: false,
      canFitness: true,
      canMarketing: false,
      scope: "fitness",
    }),
    getCentralContacts(),
    getCentralAgendaUsers(),
    getGoogleCalendarStatus(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness"
        title="Agenda"
        description="Somente compromissos da Fitness. A mesma informação também aparece na Agenda Global da Central."
        action={
          access.canWriteFitness || access.role === "admin" ? (
            <CentralTaskCreateForm
              scopes={["fitness"]}
              contacts={contacts}
              users={users}
            />
          ) : null
        }
      />

      {(access.canWriteFitness || access.role === "admin") && (
        <GoogleCalendarConnectionCard status={googleCalendar} />
      )}

      <CentralGlobalCalendarV4522
        items={agenda.items}
        summary={agenda.summary}
        scopes={["fitness"]}
        canManageTasks={access.canWriteFitness || access.role === "admin"}
        showScopeFilter={false}
      />
    </>
  );
}
