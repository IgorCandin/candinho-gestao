import {
  AlertTriangle,
  CalendarClock,
  CircleCheckBig,
  ListTodo,
} from "lucide-react";
import { redirect } from "next/navigation";
import { CentralTaskCard } from "@/components/central-task-card";
import { CentralTaskCreateForm } from "@/components/central-task-create-form";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  getCentralAgendaSnapshot,
  getCentralAgendaUsers,
  getCentralContacts,
  getCentralAgendaTaskCustomers,
} from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CentralPendingPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    priority?: string;
    group?: string;
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
    ...(access.canAccessMarketing ||
    access.role === "admin"
      ? ["marketing"]
      : []),
  ];

  const scope =
    params.scope &&
    allowedScopes.includes(
      params.scope,
    )
      ? params.scope
      : null;

  const priority =
    params.priority &&
    [
      "normal",
      "attention",
      "urgent",
    ].includes(params.priority)
      ? params.priority
      : null;

  const groupByCustomer =
    params.group !== "none";

  const [
    agenda,
    contacts,
    users,
  ] = await Promise.all([
    getCentralAgendaSnapshot(
      "planned",
      scope,
    ),
    getCentralContacts(),
    getCentralAgendaUsers(),
  ]);

  const tasks = priority
    ? agenda.items.filter(
        (task) =>
          task.priority ===
          priority,
      )
    : agenda.items;

  const taskCustomers = await getCentralAgendaTaskCustomers(
    tasks.map((task) => task.id),
  );
  const customerByTaskId = new Map(
    taskCustomers.map((customer) => [customer.task_id, customer]),
  );
  const taskGroups = [...tasks.reduce((groups, task) => {
    const customer = customerByTaskId.get(task.id);
    const name = customer?.customer_name ?? task.contact_name ?? "Sem cliente associado";
    const key = customer?.customer_id ?? task.central_contact_id ?? name;
    const group = groups.get(key) ?? { key, name, tasks: [] };
    group.tasks.push(task);
    groups.set(key, group);
    return groups;
  }, new Map<string, { key: string; name: string; tasks: typeof tasks }>()).values()].sort((a, b) => {
    const aDueAt = a.tasks[0]?.due_at ?? "";
    const bDueAt = b.tasks[0]?.due_at ?? "";
    return aDueAt.localeCompare(bDueAt) || a.name.localeCompare(b.name, "pt-BR");
  });

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central"
        title="Pendências"
        description="Somente tarefas que ainda exigem ação. Lista vazia significa que não há pendências abertas no filtro atual."
        action={
          <CentralTaskCreateForm
            scopes={
              allowedScopes
            }
            contacts={contacts}
            users={users}
          />
        }
      />

      <section className="stats-grid central-agenda-stats">
        <StatCard
          href="/central/pendencias"
          label="Pendentes"
          value={String(
            agenda.summary
              .pending_count,
          )}
          note="tarefas abertas"
          icon={ListTodo}
        />

        <StatCard
          href="/central/pendencias"
          label="Atrasadas"
          value={String(
            agenda.summary
              .overdue_count,
          )}
          note="precisam de atenção"
          icon={AlertTriangle}
        />

        <StatCard
          href="/central/agenda"
          label="Hoje"
          value={String(
            agenda.summary
              .today_count,
          )}
          note="previstas para hoje"
          icon={CalendarClock}
        />

        <StatCard
          href="/central/agenda?status=completed"
          label="Concluídas no mês"
          value={String(
            agenda.summary
              .completed_month_count,
          )}
          note="ações resolvidas"
          icon={CircleCheckBig}
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
              defaultValue={
                scope ?? ""
              }
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
                    {item ===
                    "company"
                      ? "Company"
                      : item ===
                          "supplements"
                        ? "Suplementos"
                        : item ===
                            "fitness"
                          ? "Fitness"
                          : "Marketing"}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>
              Visualização
            </span>

            <select
              className="select"
              name="group"
              defaultValue={groupByCustomer ? "customer" : "none"}
            >
              <option value="customer">
                Por cliente
              </option>
              <option value="none">
                Lista única
              </option>
            </select>
          </label>

          <label>
            <span>
              Prioridade
            </span>

            <select
              className="select"
              name="priority"
              defaultValue={
                priority ?? ""
              }
            >
              <option value="">
                Todas
              </option>
              <option value="urgent">
                Urgente
              </option>
              <option value="attention">
                Atenção
              </option>
              <option value="normal">
                Normal
              </option>
            </select>
          </label>

          <button
            className="button ghost"
            type="submit"
          >
            <ListTodo size={15} />
            Filtrar
          </button>
        </form>
      </article>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>
              Fila de pendências
            </h2>

            <p>{tasks.length} tarefa(s) aguardando ação{groupByCustomer ? ` em ${taskGroups.length} cliente(s)/grupo(s)` : ""}.</p>
          </div>
        </div>

        <div className="central-task-list">
          {tasks.length ? (
            groupByCustomer ? (
              taskGroups.map((group) => (
                <section className="central-task-customer-group" key={group.key}>
                  <div className="central-task-customer-group-head">
                    <strong>{group.name}</strong>
                    <span>{group.tasks.length} pendência(s)</span>
                  </div>
                  {group.tasks.map((task) => (
                    <CentralTaskCard task={task} key={task.id} />
                  ))}
                </section>
              ))
            ) : tasks.map((task) => (
              <CentralTaskCard task={task} key={task.id} />
            ))
          ) : (
            <div className="empty">
              <CircleCheckBig
                size={30}
              />

              <strong>
                Tudo em dia por aqui
              </strong>

              Não há nenhuma tarefa
              aberta neste filtro. A
              tela vazia é um estado
              positivo, não um erro.
            </div>
          )}
        </div>
      </article>
    </>
  );
}
