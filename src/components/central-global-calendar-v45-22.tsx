"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  LoaderCircle,
  NotebookPen,
  RotateCcw,
  Save,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  CentralUnifiedAgendaItem,
  CentralUnifiedAgendaScope,
  CentralUnifiedAgendaSnapshot,
} from "@/lib/central-unified-agenda";

type CalendarView = "month" | "week" | "day" | "list";
type StatusFilter = "open" | "all" | "completed";
type DialogAction = "reschedule" | "note" | null;

const operationMeta: Record<
  CentralUnifiedAgendaScope,
  { label: string; className: string }
> = {
  company: { label: "Central", className: "company" },
  supplements: { label: "Suplementos", className: "supplements" },
  fitness: { label: "Fitness", className: "fitness" },
  marketing: { label: "Marketing", className: "marketing" },
};

const categoryLabel: Record<string, string> = {
  task: "Tarefa",
  delivery: "Entrega",
  payment: "Cobrança",
  follow_up: "Retorno",
  post_sale: "Pós-venda",
  supplier: "Fornecedor",
  other: "Outro",
};

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, amount: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return isoDate(date);
}

function addMonths(value: string, amount: number) {
  const date = parseDate(value);
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  return isoDate(date);
}

function mondayOfWeek(value: string) {
  const date = parseDate(value);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return isoDate(date);
}

function monthCells(value: string) {
  const cursor = parseDate(value);
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
  return Array.from({ length: 42 }, (_, index) =>
    addDays(mondayOfWeek(isoDate(first)), index),
  );
}

function monthTitle(value: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(parseDate(value));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dayTitle(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parseDate(value));
}

function weekTitle(value: string) {
  const start = mondayOfWeek(value);
  const end = addDays(start, 6);
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  return `${formatter.format(parseDate(start))} — ${formatter.format(
    parseDate(end),
  )}`;
}

function formatMoney(value: number | null) {
  if (value == null || value <= 0) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(parseDate(value));
}

function eventTime(item: CentralUnifiedAgendaItem) {
  if (item.source_type !== "task") return null;
  const date = new Date(item.due_at);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function toDueIso(date: string, time: string) {
  return new Date(`${date}T${time || "12:00"}:00-03:00`).toISOString();
}

export function CentralGlobalCalendarV4522({
  items,
  summary,
  scopes,
  canManageTasks,
  showScopeFilter = true,
}: {
  items: CentralUnifiedAgendaItem[];
  summary: CentralUnifiedAgendaSnapshot["summary"];
  scopes: CentralUnifiedAgendaScope[];
  canManageTasks: boolean;
  showScopeFilter?: boolean;
}) {
  const router = useRouter();
  const today = todayBrazil();
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(today);
  const [scope, setScope] = useState<"all" | CentralUnifiedAgendaScope>(
    showScopeFilter ? "all" : scopes[0] ?? "all",
  );
  const [status, setStatus] = useState<StatusFilter>("open");
  const [selected, setSelected] =
    useState<CentralUnifiedAgendaItem | null>(null);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (scope !== "all" && item.operation_scope !== scope) return false;
        if (status === "open" && item.status !== "planned") return false;
        if (status === "completed" && item.status !== "completed") return false;
        return true;
      }),
    [items, scope, status],
  );

  const overdue = filtered.filter(
    (item) => item.status === "planned" && item.due_date < today,
  );

  const title =
    view === "month"
      ? monthTitle(cursor)
      : view === "week"
        ? weekTitle(cursor)
        : view === "day"
          ? dayTitle(cursor)
          : "Compromissos globais";

  const cells = monthCells(cursor);
  const cursorMonth = parseDate(cursor).getMonth();
  const weekStart = mondayOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  function move(direction: number) {
    if (view === "month") {
      setCursor((current) => addMonths(current, direction));
      return;
    }
    if (view === "week") {
      setCursor((current) => addDays(current, direction * 7));
      return;
    }
    setCursor((current) => addDays(current, direction));
  }

  function eventsForDate(date: string) {
    return filtered
      .filter((item) => item.due_date === date)
      .sort((a, b) => a.due_at.localeCompare(b.due_at));
  }

  return (
    <div className="v4522-global-agenda">
      <section className="agenda-summary-grid v4522-global-summary">
        <article>
          <span>Hoje</span>
          <strong>{summary.today_count}</strong>
          <small>compromissos no dia</small>
        </article>
        <article className={summary.overdue_count > 0 ? "danger" : ""}>
          <span>Atrasados</span>
          <strong>{summary.overdue_count}</strong>
          <small>continuam até resolver</small>
        </article>
        <article>
          <span>Próximos 7 dias</span>
          <strong>{summary.next_seven_days_count}</strong>
          <small>ações programadas</small>
        </article>
        <article className="success">
          <span>Concluídos no mês</span>
          <strong>{summary.completed_month_count}</strong>
          <small>tarefas finalizadas</small>
        </article>
      </section>

      {showScopeFilter && (
        <div className="v4522-agenda-legend">
          {scopes.map((item) => (
            <span className={operationMeta[item].className} key={item}>
              <i />
              {operationMeta[item].label}
            </span>
          ))}
        </div>
      )}

      {overdue.length > 0 && (
        <article className="panel agenda-overdue-panel">
          <div className="panel-head">
            <div>
              <h2>Atrasados</h2>
              <p>Itens globais que continuam pedindo uma decisão.</p>
            </div>
            <strong>{overdue.length}</strong>
          </div>
          <div className="agenda-overdue-strip">
            {overdue.slice(0, 8).map((item) => (
              <button
                type="button"
                key={item.event_key}
                onClick={() => setSelected(item)}
              >
                <span>{formatDate(item.due_date)}</span>
                <strong>{item.title}</strong>
                <small>{operationMeta[item.operation_scope].label}</small>
              </button>
            ))}
          </div>
        </article>
      )}

      <article className="panel agenda-panel">
        <div className="agenda-toolbar">
          <div className="agenda-navigation">
            <button
              className="icon-button"
              type="button"
              onClick={() => move(-1)}
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="button ghost compact-button"
              type="button"
              onClick={() => setCursor(today)}
            >
              Hoje
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={() => move(1)}
              aria-label="Próximo"
            >
              <ChevronRight size={18} />
            </button>
            <h2>{title}</h2>
          </div>

          <div className="agenda-view-switch">
            {(["month", "week", "day", "list"] as CalendarView[]).map(
              (item) => (
                <button
                  className={view === item ? "active" : ""}
                  type="button"
                  key={item}
                  onClick={() => setView(item)}
                >
                  {item === "month"
                    ? "Mês"
                    : item === "week"
                      ? "Semana"
                      : item === "day"
                        ? "Dia"
                        : "Lista"}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="agenda-filterbar">
          {showScopeFilter && (
            <label>
              <span>Operação</span>
              <select
                className="select"
                value={scope}
                onChange={(event) =>
                  setScope(
                    event.target.value as
                      | "all"
                      | CentralUnifiedAgendaScope,
                  )
                }
              >
                <option value="all">Todas</option>
                {scopes.map((item) => (
                  <option value={item} key={item}>
                    {operationMeta[item].label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span>Situação</span>
            <select
              className="select"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as StatusFilter)
              }
            >
              <option value="open">Pendentes</option>
              <option value="all">Todas</option>
              <option value="completed">Concluídas</option>
            </select>
          </label>
        </div>

        {view === "month" && (
          <div className="agenda-month">
            <div className="agenda-weekdays">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(
                (day) => (
                  <span key={day}>{day}</span>
                ),
              )}
            </div>
            <div className="agenda-month-grid">
              {cells.map((date) => {
                const dayEvents = eventsForDate(date);
                const outside =
                  parseDate(date).getMonth() !== cursorMonth;

                return (
                  <div
                    className={`agenda-day-cell ${
                      outside ? "outside" : ""
                    } ${date === today ? "today" : ""}`}
                    key={date}
                    onDoubleClick={() => {
                      setCursor(date);
                      setView("day");
                    }}
                  >
                    <div className="agenda-day-number">
                      <span>{parseDate(date).getDate()}</span>
                      {date === today && <small>Hoje</small>}
                    </div>
                    <div className="agenda-day-events">
                      {dayEvents.slice(0, 4).map((item) => (
                        <GlobalEventButton
                          item={item}
                          today={today}
                          compact
                          onClick={() => setSelected(item)}
                          key={item.event_key}
                        />
                      ))}
                      {dayEvents.length > 4 && (
                        <button
                          className="agenda-more"
                          type="button"
                          onClick={() => {
                            setCursor(date);
                            setView("day");
                          }}
                        >
                          + {dayEvents.length - 4} itens
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "week" && (
          <div className="agenda-week-grid">
            {weekDays.map((date) => (
              <section
                className={`agenda-week-day ${
                  date === today ? "today" : ""
                }`}
                key={date}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCursor(date);
                    setView("day");
                  }}
                >
                  <span>
                    {new Intl.DateTimeFormat("pt-BR", {
                      weekday: "short",
                    }).format(parseDate(date))}
                  </span>
                  <strong>{parseDate(date).getDate()}</strong>
                </button>
                <div>
                  {eventsForDate(date).map((item) => (
                    <GlobalEventButton
                      item={item}
                      today={today}
                      onClick={() => setSelected(item)}
                      key={item.event_key}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {view === "day" && (
          <GlobalAgendaList
            title={dayTitle(cursor)}
            items={eventsForDate(cursor)}
            today={today}
            onSelect={setSelected}
          />
        )}

        {view === "list" && (
          <GlobalAgendaList
            title="Compromissos globais"
            items={[...filtered].sort(
              (a, b) =>
                a.due_date.localeCompare(b.due_date) ||
                a.due_at.localeCompare(b.due_at),
            )}
            today={today}
            onSelect={setSelected}
          />
        )}
      </article>

      {selected && (
        <GlobalEventDialog
          item={selected}
          canManageTasks={canManageTasks}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function GlobalEventButton({
  item,
  today,
  compact = false,
  onClick,
}: {
  item: CentralUnifiedAgendaItem;
  today: string;
  compact?: boolean;
  onClick: () => void;
}) {
  const overdue = item.status === "planned" && item.due_date < today;
  const scope = operationMeta[item.operation_scope];

  return (
    <button
      className={`agenda-event v4522-global-event ${scope.className} ${
        overdue ? "overdue" : ""
      } ${compact ? "compact" : ""}`}
      type="button"
      onClick={onClick}
      title={`${scope.label} · ${item.title}`}
    >
      <span>
        {eventTime(item) && <small>{eventTime(item)}</small>}
        {item.title}
      </span>
    </button>
  );
}

function GlobalAgendaList({
  title,
  items,
  today,
  onSelect,
}: {
  title: string;
  items: CentralUnifiedAgendaItem[];
  today: string;
  onSelect: (item: CentralUnifiedAgendaItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="empty agenda-empty">
        <CalendarCheck2 size={30} />
        <strong>Nenhum compromisso encontrado</strong>
        Altere os filtros ou escolha outra data.
      </div>
    );
  }

  return (
    <div className="agenda-list-view v4522-global-list">
      <section>
        <h3>{title}</h3>
        {items.map((item) => {
          const scope = operationMeta[item.operation_scope];
          const overdue =
            item.status === "planned" && item.due_date < today;
          const amount = formatMoney(item.amount);

          return (
            <button
              className={`agenda-list-row v4522-global-row ${
                scope.className
              } ${overdue ? "overdue" : ""}`}
              type="button"
              onClick={() => onSelect(item)}
              key={item.event_key}
            >
              <span className="v4522-scope-dot" />
              <div>
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
                <small>
                  {[
                    scope.label,
                    categoryLabel[item.category] ?? item.category,
                    item.assigned_name,
                    formatDate(item.due_date),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </div>
              {amount && <b>{amount}</b>}
              <ArrowRight size={16} />
            </button>
          );
        })}
      </section>
    </div>
  );
}

function GlobalEventDialog({
  item,
  canManageTasks,
  onClose,
  onUpdated,
}: {
  item: CentralUnifiedAgendaItem;
  canManageTasks: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [action, setAction] = useState<DialogAction>(null);
  const [date, setDate] = useState(item.due_date);
  const [time, setTime] = useState(eventTime(item) ?? "12:00");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const scope = operationMeta[item.operation_scope];
  const editable = Boolean(item.editable_task_id && canManageTasks);
  const amount = formatMoney(item.amount);

  async function run(
    rpc: string,
    args: Record<string, unknown>,
    success: string,
  ) {
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc(rpc, args);
      if (error) throw error;
      setMessage(success);
      window.setTimeout(onUpdated, 220);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o compromisso.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="modal-card agenda-event-dialog">
        <div className="modal-head">
          <div>
            <span className={`v4522-dialog-scope ${scope.className}`}>
              {scope.label}
            </span>
            <h2>{item.title}</h2>
            <p>{item.subtitle}</p>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="agenda-event-meta">
          <div>
            <CalendarDays size={16} />
            <span>Data</span>
            <strong>
              {formatDate(item.due_date)}
              {eventTime(item) ? ` · ${eventTime(item)}` : ""}
            </strong>
          </div>
          <div>
            <CalendarClock size={16} />
            <span>Origem</span>
            <strong>{scope.label}</strong>
          </div>
          {amount && (
            <div>
              <CircleDollarSign size={16} />
              <span>Valor</span>
              <strong>{amount}</strong>
            </div>
          )}
        </div>

        {item.notes && (
          <div className="agenda-event-notes">
            <NotebookPen size={16} />
            <p>{item.notes}</p>
          </div>
        )}

        <div className="agenda-event-quick-actions">
          {item.href && (
            <Link className="button ghost" href={item.href}>
              <ExternalLink size={16} />
              Abrir origem
            </Link>
          )}

          {editable && item.status === "planned" && (
            <>
              <button
                className="button ghost"
                type="button"
                onClick={() =>
                  setAction(action === "reschedule" ? null : "reschedule")
                }
              >
                <CalendarClock size={16} />
                Reagendar
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={() => setAction(action === "note" ? null : "note")}
              >
                <NotebookPen size={16} />
                Observação
              </button>
              <button
                className="button gold"
                type="button"
                disabled={loading}
                onClick={() =>
                  run(
                    "central_update_operational_task_status",
                    {
                      p_task_id: item.editable_task_id,
                      p_status: "completed",
                    },
                    "Tarefa concluída.",
                  )
                }
              >
                {loading ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Concluir
              </button>
              <button
                className="button danger"
                type="button"
                disabled={loading}
                onClick={() =>
                  run(
                    "central_update_operational_task_status",
                    {
                      p_task_id: item.editable_task_id,
                      p_status: "cancelled",
                    },
                    "Tarefa cancelada.",
                  )
                }
              >
                <XCircle size={16} />
                Cancelar
              </button>
            </>
          )}

          {editable && item.status !== "planned" && (
            <button
              className="button ghost"
              type="button"
              disabled={loading}
              onClick={() =>
                run(
                  "central_update_operational_task_status",
                  {
                    p_task_id: item.editable_task_id,
                    p_status: "planned",
                  },
                  "Tarefa reaberta.",
                )
              }
            >
              <RotateCcw size={16} />
              Reabrir
            </button>
          )}
        </div>

        {!editable && (
          <p className="form-help">
            Este compromisso nasceu em outro módulo. A Agenda Global lê a
            mesma fonte de verdade; altere pela origem e a mudança aparece
            aqui automaticamente.
          </p>
        )}

        {action === "reschedule" && editable && (
          <form
            className="agenda-inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                "central_reschedule_operational_task",
                {
                  p_task_id: item.editable_task_id,
                  p_due_at: toDueIso(date, time),
                },
                "Tarefa reagendada.",
              );
            }}
          >
            <label className="field">
              <span>Nova data</span>
              <input
                className="input"
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Horário</span>
              <input
                className="input"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>
            <button className="button gold" disabled={loading}>
              <Save size={16} />
              Salvar
            </button>
          </form>
        )}

        {action === "note" && editable && (
          <form
            className="agenda-inline-form single"
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                "central_append_operational_task_note",
                {
                  p_task_id: item.editable_task_id,
                  p_note: note,
                },
                "Observação adicionada.",
              );
            }}
          >
            <label className="field">
              <span>Nova observação</span>
              <textarea
                className="textarea"
                rows={3}
                required
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <button className="button gold" disabled={loading}>
              <Save size={16} />
              Adicionar
            </button>
          </form>
        )}

        {message && (
          <p className="form-message standalone-message">{message}</p>
        )}
      </section>
    </div>
  );
}
