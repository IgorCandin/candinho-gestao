import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { redirect } from "next/navigation";
import { CentralTaskCreateForm } from "@/components/central-task-create-form";
import { CentralUnifiedAgendaCard } from "@/components/central-unified-agenda-card";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  getCentralAgendaUsers,
  getCentralContacts,
} from "@/lib/central-data";
import { getCentralUnifiedAgendaSnapshot } from "@/lib/central-unified-agenda";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CentralAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    status?: string;
  }>;
}) {
  const access =
    await getCurrentUserAccess();

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

  const params =
    await searchParams;

  const allowedScopes = [
    "company",
    ...(access.canAccessSupplements ||
    access.role === "admin"
      ? ["supplements"]
      : []),
    ...(access.canAccessFitness ||
    access.role === "admin"
      ? ["fitness"]
      : []),
  ];

  const scope =
    params.scope &&
    allowedScopes.includes(params.scope)
      ? params.scope
      : null;

  const status =
    params.status &&
    [
      "planned",
      "completed",
      "cancelled",
    ].includes(params.status)
      ? params.status
      : null;

  const [
    agenda,
    contacts,
    users,
  ] = await Promise.all([
    getCentralUnifiedAgendaSnapshot({
      canSupplements:
        access.role === "admin" ||
        access.canAccessSupplements,
      canFitness:
        access.role === "admin" ||
        access.canAccessFitness,
      scope,
      status,
    }),
    getCentralContacts(),
    getCentralAgendaUsers(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central"
        title="Agenda unificada"
        description="Central, Suplementos e Fitness no mesmo lugar. A cor mostra de longe a origem de cada compromisso."
        action={
          <CentralTaskCreateForm
            scopes={allowedScopes}
            contacts={contacts}
            users={users}
          />
        }
      />

      <div className="central-agenda-scope-legend">
        <span className="company">
          <i />
          Central
        </span>
        {(access.canAccessSupplements ||
          access.role === "admin") && (
          <span className="supplements">
            <i />
            Suplementos
          </span>
        )}
        {(access.canAccessFitness ||
          access.role === "admin") && (
          <span className="fitness">
            <i />
            Fitness
          </span>
        )}
      </div>

      <section className="stats-grid central-agenda-stats">
        <StatCard
          href="/central/agenda?status=planned"
          label="Hoje"
          value={String(
            agenda.summary.today_count,
          )}
          note="compromissos de todas as operações"
          icon={CalendarDays}
        />

        <StatCard
          href="/central/agenda?status=planned"
          label="Atrasadas"
          value={String(
            agenda.summary.overdue_count,
          )}
          note="continuam até resolver"
          icon={CalendarClock}
        />

        <StatCard
          href="/central/agenda?status=planned"
          label="Próximos 7 dias"
          value={String(
            agenda.summary
              .next_seven_days_count,
          )}
          note="ações programadas"
          icon={CalendarCheck2}
        />

        <StatCard
          href="/central/agenda?status=completed"
          label="Concluídas no mês"
          value={String(
            agenda.summary
              .completed_month_count,
          )}
          note="tarefas finalizadas"
          icon={CheckCircle2}
        />
      </section>

      <article className="panel central-task-filter-panel">
        <form
          className="panel-body central-task-filter-form"
          method="get"
        >
          <label>
            <span>Operação</span>
            <select
              className="select"
              name="scope"
              defaultValue={scope ?? ""}
            >
              <option value="">
                Todas
              </option>

              {allowedScopes.map(
                (item) => (
                  <option
                    value={item}
                    key={item}
                  >
                    {item === "company"
                      ? "Central"
                      : item ===
                          "supplements"
                        ? "Suplementos"
                        : "Fitness"}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>Status</span>
            <select
              className="select"
              name="status"
              defaultValue={
                status ?? ""
              }
            >
              <option value="">
                Todos
              </option>
              <option value="planned">
                Pendentes
              </option>
              <option value="completed">
                Concluídas
              </option>
              <option value="cancelled">
                Canceladas
              </option>
            </select>
          </label>

          <button
            className="button ghost"
            type="submit"
          >
            <ListChecks size={15} />
            Filtrar
          </button>
        </form>
      </article>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Compromissos</h2>
            <p>
              {agenda.items.length} item(ns) no filtro atual.
            </p>
          </div>
        </div>

        <div className="panel-body">
          {agenda.items.length ? (
            <div className="central-unified-agenda-list">
              {agenda.items.map(
                (item) => (
                  <CentralUnifiedAgendaCard
                    item={item}
                    key={item.event_key}
                  />
                ),
              )}
            </div>
          ) : (
            <div className="empty">
              <CalendarDays size={30} />
              <strong>
                Agenda livre neste filtro
              </strong>
              Nenhum compromisso encontrado.
            </div>
          )}
        </div>
      </article>
    </>
  );
}
