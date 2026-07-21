import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ListChecks,
  ListTodo,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import {
  getStrategicAgendaMonth,
  shiftStrategicMonth,
  strategicMonthLabel,
} from "@/lib/strategic-agenda-data";
import {
  createStrategicTask,
  moveStrategicTaskWeek,
  saveStrategicTaskNotes,
  setStrategicTaskStatus,
} from "./actions";

const priorityLabel: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  extreme: "Extrema",
};

const statusLabel: Record<string, string> = {
  planned: "Pendente",
  completed: "Concluída",
  postponed: "Adiada",
};

export default async function StrategicAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    status?: string;
    category?: string;
    week?: string;
  }>;
}) {
  const access = await getCurrentUserAccess();
  const canManage =
    access.role === "admin" ||
    access.canWriteSupplements ||
    access.canWriteFitness ||
    access.canWriteMarketing;

  if (!canManage) redirect("/central");

  const params = await searchParams;
  const data = await getStrategicAgendaMonth(params.month);
  const allItems = data.items;

  const categories = [...new Set(allItems.map((item) => item.category))].sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );

  const filteredItems = allItems.filter((item) => {
    if (params.status && item.status !== params.status) return false;
    if (params.category && item.category !== params.category) return false;
    if (params.week && item.week_number !== Number(params.week)) return false;
    return true;
  });

  const total = allItems.length;
  const completed = allItems.filter((item) => item.status === "completed").length;
  const postponed = allItems.filter((item) => item.status === "postponed").length;
  const pending = allItems.filter((item) => item.status === "planned").length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const previousMonth = shiftStrategicMonth(data.monthKey, -1);
  const nextMonth = shiftStrategicMonth(data.monthKey, 1);

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central"
        title="Agenda Estratégica"
        description="Sua rotina mensal de crescimento, relacionamento, marketing e operação. O mês é gerado automaticamente a partir das 27 tarefas-base e mantém histórico próprio."
      />

      <section className="strategic-month-toolbar">
        <Link
          className="button ghost compact-button"
          href={`/central/agenda-estrategica?month=${previousMonth}`}
        >
          <ArrowLeft size={15} />
          Mês anterior
        </Link>

        <div>
          <span>Planejamento mensal</span>
          <strong>{strategicMonthLabel(data.monthKey)}</strong>
        </div>

        <Link
          className="button ghost compact-button"
          href={`/central/agenda-estrategica?month=${nextMonth}`}
        >
          Próximo mês
          <ArrowRight size={15} />
        </Link>
      </section>

      <section className="stats-grid strategic-agenda-stats">
        <StatCard
          href={`/central/agenda-estrategica?month=${data.monthKey}`}
          label="Progresso"
          value={`${progress}%`}
          note={`${completed} de ${total} concluídas`}
          icon={BarChart3}
        />
        <StatCard
          href={`/central/agenda-estrategica?month=${data.monthKey}&status=planned`}
          label="Pendentes"
          value={String(pending)}
          note="Ainda fazem parte do plano do mês"
          icon={ListTodo}
        />
        <StatCard
          href={`/central/agenda-estrategica?month=${data.monthKey}&status=completed`}
          label="Concluídas"
          value={String(completed)}
          note="Executadas neste mês"
          icon={ListChecks}
        />
        <StatCard
          href={`/central/agenda-estrategica?month=${data.monthKey}&status=postponed`}
          label="Adiadas"
          value={String(postponed)}
          note="Podem ser reabertas ou movidas de semana"
          icon={CalendarDays}
        />
      </section>

      <article className="panel strategic-agenda-control-panel">
        <div className="panel-head">
          <div>
            <h2>Organizar o mês</h2>
            <p>Filtre o plano ou adicione uma tarefa estratégica específica deste mês.</p>
          </div>
          <ListTodo size={20} />
        </div>

        <div className="strategic-agenda-controls">
          <form method="get" className="strategic-agenda-filters">
            <input type="hidden" name="month" value={data.monthKey} />

            <select className="select" name="week" defaultValue={params.week ?? ""}>
              <option value="">Todas as semanas</option>
              {[1, 2, 3, 4].map((week) => (
                <option value={week} key={week}>Semana {week}</option>
              ))}
            </select>

            <select className="select" name="status" defaultValue={params.status ?? ""}>
              <option value="">Todos os status</option>
              <option value="planned">Pendentes</option>
              <option value="completed">Concluídas</option>
              <option value="postponed">Adiadas</option>
            </select>

            <select className="select" name="category" defaultValue={params.category ?? ""}>
              <option value="">Todas as categorias</option>
              {categories.map((category) => (
                <option value={category} key={category}>{category}</option>
              ))}
            </select>

            <button className="button ghost compact-button" type="submit">
              Aplicar filtros
            </button>
          </form>

          <details className="strategic-new-task">
            <summary className="button gold compact-button">+ Nova tarefa do mês</summary>

            <form action={createStrategicTask}>
              <input type="hidden" name="reference_month" value={data.monthKey} />

              <label className="field strategic-task-wide">
                <span>Tarefa</span>
                <input className="input" name="task" required />
              </label>

              <label className="field strategic-task-wide">
                <span>Objetivo</span>
                <input className="input" name="objective" />
              </label>

              <label className="field">
                <span>Semana</span>
                <select className="select" name="week_number" defaultValue="1">
                  <option value="1">Semana 1</option>
                  <option value="2">Semana 2</option>
                  <option value="3">Semana 3</option>
                  <option value="4">Semana 4</option>
                </select>
              </label>

              <label className="field">
                <span>Prioridade</span>
                <select className="select" name="priority" defaultValue="medium">
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="extreme">Extrema</option>
                </select>
              </label>

              <label className="field">
                <span>Categoria</span>
                <input className="input" name="category" defaultValue="Geral" />
              </label>

              <label className="field strategic-task-wide">
                <span>Observações</span>
                <textarea className="input strategic-task-textarea" name="notes" />
              </label>

              <button className="button gold" type="submit">Adicionar tarefa</button>
            </form>
          </details>
        </div>
      </article>

      <section className="strategic-agenda-weeks">
        {[1, 2, 3, 4].map((week) => {
          const weekItems = filteredItems.filter((item) => item.week_number === week);
          const weekAll = allItems.filter((item) => item.week_number === week);
          const weekCompleted = weekAll.filter((item) => item.status === "completed").length;

          return (
            <article className="panel strategic-week-panel" key={week}>
              <div className="panel-head strategic-week-head">
                <div>
                  <span>Planejamento</span>
                  <h2>Semana {week}</h2>
                  <p>{weekCompleted} de {weekAll.length} concluídas</p>
                </div>
                <strong>{weekAll.length > 0 ? Math.round((weekCompleted / weekAll.length) * 100) : 0}%</strong>
              </div>

              {weekItems.length === 0 ? (
                <div className="empty compact">
                  <ListTodo size={22} />
                  <strong>Nenhuma tarefa neste filtro</strong>
                </div>
              ) : (
                <div className="strategic-task-list">
                  {weekItems.map((item) => (
                    <article
                      className={`strategic-task-card status-${item.status} priority-${item.priority}`}
                      key={item.id}
                    >
                      <div className="strategic-task-main">
                        <div className="strategic-task-meta">
                          {item.code && <span>#{item.code}</span>}
                          <span>{item.category}</span>
                          <span className={`strategic-priority ${item.priority}`}>
                            {priorityLabel[item.priority]}
                          </span>
                          <span className={`strategic-status ${item.status}`}>
                            {statusLabel[item.status]}
                          </span>
                        </div>

                        <strong>{item.task}</strong>

                        {item.objective && <p>{item.objective}</p>}

                        {item.completed_at && (
                          <small>Concluída em {formatDateTime(item.completed_at)}</small>
                        )}

                        {item.impact_note && (
                          <blockquote>{item.impact_note}</blockquote>
                        )}
                      </div>

                      <div className="strategic-task-actions">
                        {item.action_href && (
                          <Link className="button ghost compact-button" href={item.action_href}>
                            {item.action_label ?? "Abrir ação"}
                          </Link>
                        )}

                        {item.status === "planned" ? (
                          <>
                            <form action={setStrategicTaskStatus}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="status" value="completed" />
                              <button className="button gold compact-button" type="submit">
                                Concluir
                              </button>
                            </form>

                            <form action={setStrategicTaskStatus}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="status" value="postponed" />
                              <button className="button ghost compact-button" type="submit">
                                Adiar
                              </button>
                            </form>
                          </>
                        ) : (
                          <form action={setStrategicTaskStatus}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="status" value="planned" />
                            <button className="button ghost compact-button" type="submit">
                              Reabrir
                            </button>
                          </form>
                        )}
                      </div>

                      <details className="strategic-task-details">
                        <summary>Detalhes, impacto e organização</summary>

                        <div className="strategic-task-details-grid">
                          <form action={saveStrategicTaskNotes} className="strategic-task-notes-form">
                            <input type="hidden" name="id" value={item.id} />

                            <label className="field">
                              <span>Impacto no resultado</span>
                              <textarea
                                className="input strategic-task-textarea"
                                name="impact_note"
                                defaultValue={item.impact_note ?? ""}
                                placeholder="O que esta ação gerou para a empresa?"
                              />
                            </label>

                            <label className="field">
                              <span>Observações</span>
                              <textarea
                                className="input strategic-task-textarea"
                                name="notes"
                                defaultValue={item.notes ?? ""}
                              />
                            </label>

                            <button className="button ghost compact-button" type="submit">
                              Salvar anotações
                            </button>
                          </form>

                          <form action={moveStrategicTaskWeek} className="strategic-move-week-form">
                            <input type="hidden" name="id" value={item.id} />
                            <label className="field">
                              <span>Mover para</span>
                              <select className="select" name="week_number" defaultValue={String(item.week_number)}>
                                <option value="1">Semana 1</option>
                                <option value="2">Semana 2</option>
                                <option value="3">Semana 3</option>
                                <option value="4">Semana 4</option>
                              </select>
                            </label>
                            <button className="button ghost compact-button" type="submit">
                              Mover e reabrir
                            </button>
                          </form>
                        </div>
                      </details>
                    </article>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </>
  );
}
