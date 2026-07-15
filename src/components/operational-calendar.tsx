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
  Clock3,
  ExternalLink,
  ListChecks,
  LoaderCircle,
  MessageCircle,
  NotebookPen,
  PackageOpen,
  Plus,
  RotateCcw,
  Save,
  ShoppingBag,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type {
  AgendaEvent,
  AgendaPurchaseOrderOption,
  AgendaSaleOption,
  AgendaSummary,
  AgendaUserOption,
  CustomerOption,
} from "@/lib/types";

type CalendarView = "month" | "week" | "day" | "list";
type ActionMode = "reschedule" | "note" | "complete" | "cancel" | null;

const categoryLabels: Record<AgendaEvent["category"], string> = {
  task: "Tarefa",
  delivery: "Entrega",
  payment: "Cobrança",
  follow_up: "Retorno",
  post_sale: "Pós-venda",
  supplier: "Fornecedor",
  other: "Outro",
};

const categoryIcons: Record<AgendaEvent["category"], typeof CalendarDays> = {
  task: ListChecks,
  delivery: Truck,
  payment: CircleDollarSign,
  follow_up: RotateCcw,
  post_sale: ShoppingBag,
  supplier: PackageOpen,
  other: CalendarClock,
};

const categories = Object.keys(categoryLabels) as AgendaEvent["category"][];
const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão", "Link de Pagamento", "Pagamento fracionado"] as const;

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
  const firstIso = isoDate(first);
  const start = mondayOfWeek(firstIso);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function monthTitle(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(parseDate(value));
}

function weekTitle(value: string) {
  const start = mondayOfWeek(value);
  const end = addDays(start, 6);
  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  return `${formatter.format(parseDate(start))} — ${formatter.format(parseDate(end))}`;
}

function dayTitle(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(parseDate(value));
}

function eventTime(event: AgendaEvent) {
  if (event.source_type !== "task") return null;
  const date = new Date(event.due_at);
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(date);
}

function eventTone(event: AgendaEvent, today: string) {
  if (event.status === "completed") return "completed";
  if (event.status === "cancelled") return "cancelled";
  if (event.due_date < today) return "overdue";
  if (event.priority === "urgent") return "overdue";
  if (event.priority === "attention") return "attention";
  if (event.category === "delivery" || event.category === "supplier") return "logistics";
  return "scheduled";
}

function whatsappUrl(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

function toDueIso(date: string, time: string) {
  return new Date(`${date}T${time || "12:00"}:00-03:00`).toISOString();
}

function eventLabel(event: AgendaEvent) {
  return `${categoryLabels[event.category]} · ${event.title}`;
}

export function OperationalCalendar({
  events,
  summary,
  customers,
  sales,
  purchaseOrders,
  users,
  canWrite,
}: {
  events: AgendaEvent[];
  summary: AgendaSummary;
  customers: CustomerOption[];
  sales: AgendaSaleOption[];
  purchaseOrders: AgendaPurchaseOrderOption[];
  users: AgendaUserOption[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const today = todayBrazil();
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(today);
  const [category, setCategory] = useState<"all" | AgendaEvent["category"]>("all");
  const [status, setStatus] = useState<"open" | "all" | "completed">("open");
  const [assignee, setAssignee] = useState("all");
  const [selected, setSelected] = useState<AgendaEvent | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => events.filter((event) => {
    if (category !== "all" && event.category !== category) return false;
    if (status === "open" && event.status !== "planned") return false;
    if (status === "completed" && event.status !== "completed") return false;
    if (assignee !== "all" && event.assigned_to !== assignee) return false;
    return true;
  }), [events, category, status, assignee]);

  const overdue = useMemo(() => filtered.filter((event) => event.status === "planned" && event.due_date < today), [filtered, today]);
  const calendarMonth = parseDate(cursor).getMonth();
  const cells = monthCells(cursor);
  const weekStart = mondayOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  function move(direction: number) {
    if (view === "month") setCursor((current) => addMonths(current, direction));
    else if (view === "week") setCursor((current) => addDays(current, direction * 7));
    else setCursor((current) => addDays(current, direction));
  }

  function eventsForDate(date: string) {
    return filtered.filter((event) => event.due_date === date).sort((a, b) => a.due_at.localeCompare(b.due_at));
  }

  function openEvent(event: AgendaEvent) {
    setSelected(event);
    setActionMode(null);
    setMessage(null);
  }

  async function runRpc(name: string, args: Record<string, unknown>) {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc(name, args);
      if (error) throw error;
      setMessage("Atualizado com sucesso.");
      setActionMode(null);
      router.refresh();
      setTimeout(() => setSelected(null), 350);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o compromisso.");
    } finally {
      setLoading(false);
    }
  }

  const title = view === "month" ? monthTitle(cursor) : view === "week" ? weekTitle(cursor) : view === "day" ? dayTitle(cursor) : "Compromissos operacionais";

  return (
    <div className="agenda-layout">
      <section className="agenda-summary-grid">
        <article><span>Hoje</span><strong>{summary.today_count}</strong><small>compromissos do dia</small></article>
        <article className={summary.overdue_count > 0 ? "danger" : ""}><span>Atrasados</span><strong>{summary.overdue_count}</strong><small>continuam até concluir</small></article>
        <article><span>Próximos 7 dias</span><strong>{summary.next_seven_days_count}</strong><small>ações programadas</small></article>
        <article className="success"><span>Concluídos no mês</span><strong>{summary.completed_month_count}</strong><small>tarefas finalizadas</small></article>
      </section>

      {overdue.length > 0 && (
        <article className="panel agenda-overdue-panel">
          <div className="panel-head"><div><h2>Atrasados</h2><p>Esses itens não somem enquanto estiverem pendentes.</p></div><strong>{overdue.length}</strong></div>
          <div className="agenda-overdue-strip">
            {overdue.slice(0, 8).map((event) => (
              <button type="button" key={event.event_key} onClick={() => openEvent(event)}>
                <span>{formatDateOnly(event.due_date)}</span><strong>{event.title}</strong><small>{event.subtitle}</small>
              </button>
            ))}
          </div>
        </article>
      )}

      <article className="panel agenda-panel">
        <div className="agenda-toolbar">
          <div className="agenda-navigation">
            <button className="icon-button" type="button" onClick={() => move(-1)} aria-label="Anterior"><ChevronLeft size={18} /></button>
            <button className="button ghost compact-button" type="button" onClick={() => setCursor(today)}>Hoje</button>
            <button className="icon-button" type="button" onClick={() => move(1)} aria-label="Próximo"><ChevronRight size={18} /></button>
            <h2>{title}</h2>
          </div>
          <div className="agenda-view-switch">
            {(["month", "week", "day", "list"] as CalendarView[]).map((item) => (
              <button className={view === item ? "active" : ""} type="button" key={item} onClick={() => setView(item)}>
                {item === "month" ? "Mês" : item === "week" ? "Semana" : item === "day" ? "Dia" : "Lista"}
              </button>
            ))}
          </div>
          {canWrite && <button className="button gold" type="button" onClick={() => setCreateOpen(true)}><Plus size={16} />Nova tarefa</button>}
        </div>

        <div className="agenda-filterbar">
          <label><span>Categoria</span><select className="select" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option value="all">Todas</option>{categories.map((item) => <option value={item} key={item}>{categoryLabels[item]}</option>)}</select></label>
          <label><span>Situação</span><select className="select" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="open">Pendentes</option><option value="all">Todas</option><option value="completed">Concluídas</option></select></label>
          <label><span>Responsável</span><select className="select" value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="all">Todos</option>{users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label>
        </div>

        {view === "month" && (
          <div className="agenda-month">
            <div className="agenda-weekdays">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="agenda-month-grid">
              {cells.map((date) => {
                const dayEvents = eventsForDate(date);
                const outside = parseDate(date).getMonth() !== calendarMonth;
                return (
                  <div className={`agenda-day-cell ${outside ? "outside" : ""} ${date === today ? "today" : ""}`} key={date} onDoubleClick={() => { setCursor(date); setView("day"); }}>
                    <div className="agenda-day-number"><span>{parseDate(date).getDate()}</span>{date === today && <small>Hoje</small>}</div>
                    <div className="agenda-day-events">
                      {dayEvents.slice(0, 4).map((event) => <AgendaEventButton event={event} today={today} compact onClick={() => openEvent(event)} key={event.event_key} />)}
                      {dayEvents.length > 4 && <button className="agenda-more" type="button" onClick={() => { setCursor(date); setView("day"); }}>+ {dayEvents.length - 4} itens</button>}
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
              <section className={`agenda-week-day ${date === today ? "today" : ""}`} key={date}>
                <button type="button" onClick={() => { setCursor(date); setView("day"); }}><span>{new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(parseDate(date))}</span><strong>{parseDate(date).getDate()}</strong></button>
                <div>{eventsForDate(date).map((event) => <AgendaEventButton event={event} today={today} onClick={() => openEvent(event)} key={event.event_key} />)}</div>
              </section>
            ))}
          </div>
        )}

        {view === "day" && (
          <AgendaDayList date={cursor} events={eventsForDate(cursor)} today={today} onSelect={openEvent} />
        )}

        {view === "list" && (
          <AgendaList events={filtered} today={today} onSelect={openEvent} />
        )}
      </article>

      {selected && (
        <EventDialog
          event={selected}
          today={today}
          canWrite={canWrite}
          actionMode={actionMode}
          setActionMode={setActionMode}
          loading={loading}
          message={message}
          onClose={() => { setSelected(null); setActionMode(null); setMessage(null); }}
          onRun={runRpc}
        />
      )}

      {createOpen && (
        <CreateTaskDialog
          customers={customers}
          sales={sales}
          purchaseOrders={purchaseOrders}
          users={users}
          today={today}
          loading={loading}
          message={message}
          onClose={() => { setCreateOpen(false); setMessage(null); }}
          onSubmit={async (args) => {
            setLoading(true);
            setMessage(null);
            try {
              const supabase = createClient();
              const { error } = await supabase.rpc("create_operational_task", args);
              if (error) throw error;
              setMessage("Tarefa criada.");
              router.refresh();
              setTimeout(() => setCreateOpen(false), 350);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Não foi possível criar a tarefa.");
            } finally { setLoading(false); }
          }}
        />
      )}
    </div>
  );
}

function AgendaEventButton({ event, today, compact = false, onClick }: { event: AgendaEvent; today: string; compact?: boolean; onClick: () => void }) {
  const Icon = categoryIcons[event.category];
  return (
    <button className={`agenda-event ${eventTone(event, today)} ${compact ? "compact" : ""}`} type="button" onClick={onClick} title={eventLabel(event)}>
      <Icon size={compact ? 11 : 14} />
      <span>{eventTime(event) && <small>{eventTime(event)}</small>}{event.title}</span>
    </button>
  );
}

function AgendaDayList({ date, events, today, onSelect }: { date: string; events: AgendaEvent[]; today: string; onSelect: (event: AgendaEvent) => void }) {
  if (events.length === 0) return <div className="empty agenda-empty"><CalendarCheck2 size={30} /><strong>Nenhum compromisso neste dia</strong>Crie uma tarefa ou escolha outra data.</div>;
  return <div className="agenda-day-list"><h3>{dayTitle(date)}</h3>{events.map((event) => <AgendaListRow event={event} today={today} onSelect={() => onSelect(event)} key={event.event_key} />)}</div>;
}

function AgendaList({ events, today, onSelect }: { events: AgendaEvent[]; today: string; onSelect: (event: AgendaEvent) => void }) {
  const sorted = [...events].sort((a, b) => a.due_date.localeCompare(b.due_date) || a.due_at.localeCompare(b.due_at));
  const groups = new Map<string, AgendaEvent[]>();
  sorted.forEach((event) => groups.set(event.due_date, [...(groups.get(event.due_date) ?? []), event]));
  if (sorted.length === 0) return <div className="empty agenda-empty"><CalendarCheck2 size={30} /><strong>Nenhum compromisso encontrado</strong>Altere os filtros ou crie uma nova tarefa.</div>;
  return <div className="agenda-list-view">{[...groups.entries()].map(([date, rows]) => <section key={date}><h3>{date < today ? "Atrasado · " : ""}{dayTitle(date)}</h3>{rows.map((event) => <AgendaListRow event={event} today={today} onSelect={() => onSelect(event)} key={event.event_key} />)}</section>)}</div>;
}

function AgendaListRow({ event, today, onSelect }: { event: AgendaEvent; today: string; onSelect: () => void }) {
  const Icon = categoryIcons[event.category];
  return <button className={`agenda-list-row ${eventTone(event, today)}`} type="button" onClick={onSelect}><span className="agenda-list-icon"><Icon size={17} /></span><div><strong>{event.title}</strong><span>{event.subtitle}</span><small>{[categoryLabels[event.category], event.assigned_name, eventTime(event)].filter(Boolean).join(" · ")}</small></div>{event.amount != null && event.amount > 0 && <b>{formatCurrency(event.amount)}</b>}<ArrowRight size={16} /></button>;
}

function EventDialog({ event, today, canWrite, actionMode, setActionMode, loading, message, onClose, onRun }: {
  event: AgendaEvent;
  today: string;
  canWrite: boolean;
  actionMode: ActionMode;
  setActionMode: (mode: ActionMode) => void;
  loading: boolean;
  message: string | null;
  onClose: () => void;
  onRun: (name: string, args: Record<string, unknown>) => Promise<void>;
}) {
  const [date, setDate] = useState(event.due_date);
  const [time, setTime] = useState(eventTime(event) ?? "12:00");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("Pix");
  const whatsapp = whatsappUrl(event.customer_phone);
  const canCancel = ["task", "interaction", "sale_post_sale"].includes(event.source_type) && event.status === "planned";
  const canComplete = event.source_type !== "purchase_order" && event.status === "planned";

  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}><section className="modal-card agenda-event-dialog">
    <div className="modal-head"><div><span className={`agenda-category-label ${eventTone(event, today)}`}>{categoryLabels[event.category]}</span><h2>{event.title}</h2><p>{event.subtitle}</p></div><button className="icon-button" type="button" onClick={onClose}><X size={18} /></button></div>
    <div className="agenda-event-meta">
      <div><CalendarDays size={16} /><span>Data</span><strong>{formatDateOnly(event.due_date)}{eventTime(event) ? ` · ${eventTime(event)}` : ""}</strong></div>
      {event.customer_name && <div><UserRound size={16} /><span>Cliente</span><strong>{event.customer_name}</strong></div>}
      {event.assigned_name && <div><Clock3 size={16} /><span>Responsável</span><strong>{event.assigned_name}</strong></div>}
      {event.amount != null && event.amount > 0 && <div><CircleDollarSign size={16} /><span>Valor</span><strong>{formatCurrency(event.amount)}</strong></div>}
    </div>
    {event.notes && <div className="agenda-event-notes"><NotebookPen size={16} /><p>{event.notes}</p></div>}

    <div className="agenda-event-quick-actions">
      {whatsapp && <a className="button whatsapp" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={16} />WhatsApp</a>}
      <Link className="button ghost" href={event.href}><ExternalLink size={16} />Abrir registro</Link>
      {canWrite && event.status === "planned" && <button className="button ghost" type="button" onClick={() => setActionMode(actionMode === "reschedule" ? null : "reschedule")}><CalendarClock size={16} />Reagendar</button>}
      {canWrite && <button className="button ghost" type="button" onClick={() => setActionMode(actionMode === "note" ? null : "note")}><NotebookPen size={16} />Observação</button>}
      {canWrite && canComplete && <button className="button gold" type="button" onClick={() => setActionMode(actionMode === "complete" ? null : "complete")}><CheckCircle2 size={16} />Concluir</button>}
      {canWrite && canCancel && <button className="button danger" type="button" onClick={() => setActionMode(actionMode === "cancel" ? null : "cancel")}><Trash2 size={16} />Cancelar</button>}
    </div>

    {actionMode === "reschedule" && <form className="agenda-inline-form" onSubmit={(e) => { e.preventDefault(); onRun("reschedule_operational_event", { p_source_type: event.source_type, p_source_id: event.source_id, p_due_at: toDueIso(date, time) }); }}><label className="field"><span>Nova data</span><input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>{event.source_type === "task" && <label className="field"><span>Horário</span><input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>}<button className="button gold" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}Salvar</button></form>}

    {actionMode === "note" && <form className="agenda-inline-form single" onSubmit={(e) => { e.preventDefault(); onRun("append_operational_event_note", { p_source_type: event.source_type, p_source_id: event.source_id, p_note: notes }); }}><label className="field"><span>Nova observação</span><textarea className="textarea" rows={3} required value={notes} onChange={(e) => setNotes(e.target.value)} /></label><button className="button gold" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}Adicionar</button></form>}

    {actionMode === "complete" && <form className="agenda-inline-form single" onSubmit={(e) => { e.preventDefault(); onRun("complete_operational_event", { p_source_type: event.source_type, p_source_id: event.source_id, p_completed_on: today, p_outcome: outcome.trim() || null, p_notes: notes.trim() || null, p_payment_method: event.source_type === "sale_payment" ? paymentMethod : null }); }}>
      {event.source_type === "sale_payment" && <label className="field"><span>Forma de pagamento</span><select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}>{PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}</select></label>}
      {["interaction", "sale_post_sale"].includes(event.source_type) && <label className="field"><span>Resultado</span><input className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Ex.: cliente gostou, pediu retorno, recompra provável" /></label>}
      <label className="field"><span>Observação final (opcional)</span><textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <button className="button gold" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}{event.source_type === "sale_delivery" ? "Marcar entregue" : event.source_type === "sale_payment" ? "Marcar recebido" : "Concluir compromisso"}</button>
    </form>}

    {actionMode === "cancel" && <form className="agenda-inline-form single" onSubmit={(e) => { e.preventDefault(); onRun("cancel_operational_event", { p_source_type: event.source_type, p_source_id: event.source_id, p_reason: notes.trim() || null }); }}><label className="field"><span>Motivo do cancelamento</span><textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label><button className="button danger" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}Confirmar cancelamento</button></form>}
    {message && <p className="form-message standalone-message">{message}</p>}
  </section></div>;
}

function CreateTaskDialog({ customers, sales, purchaseOrders, users, today, loading, message, onClose, onSubmit }: {
  customers: CustomerOption[];
  sales: AgendaSaleOption[];
  purchaseOrders: AgendaPurchaseOrderOption[];
  users: AgendaUserOption[];
  today: string;
  loading: boolean;
  message: string | null;
  onClose: () => void;
  onSubmit: (args: Record<string, unknown>) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AgendaEvent["category"]>("task");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");
  const [priority, setPriority] = useState<"normal" | "attention" | "urgent">("normal");
  const [customerId, setCustomerId] = useState("");
  const [saleId, setSaleId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [assignedTo, setAssignedTo] = useState(users[0]?.id ?? "");
  const [notes, setNotes] = useState("");

  function selectSale(value: string) {
    setSaleId(value);
    const sale = sales.find((item) => item.id === value);
    if (sale?.customer_id) setCustomerId(sale.customer_id);
  }

  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}><section className="modal-card agenda-create-dialog">
    <div className="modal-head"><div><h2>Nova tarefa operacional</h2><p>Crie um compromisso manual e vincule ao registro certo.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={18} /></button></div>
    <form className="form-grid-two" onSubmit={(e) => { e.preventDefault(); onSubmit({ p_title: title.trim(), p_category: category, p_due_at: toDueIso(date, time), p_priority: priority, p_customer_id: customerId || null, p_sale_id: saleId || null, p_purchase_order_id: purchaseOrderId || null, p_assigned_to: assignedTo || null, p_notes: notes.trim() || null }); }}>
      <label className="field field-span-two"><span>Título</span><input className="input" required minLength={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Separar creatina para retirada" /></label>
      <label className="field"><span>Categoria</span><select className="select" value={category} onChange={(e) => setCategory(e.target.value as AgendaEvent["category"])}>{categories.map((item) => <option value={item} key={item}>{categoryLabels[item]}</option>)}</select></label>
      <label className="field"><span>Prioridade</span><select className="select" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}><option value="normal">Normal</option><option value="attention">Atenção</option><option value="urgent">Urgente</option></select></label>
      <label className="field"><span>Data</span><input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label className="field"><span>Horário</span><input className="input" type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></label>
      <label className="field"><span>Cliente (opcional)</span><select className="select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Sem cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label className="field"><span>Responsável</span><select className="select" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}><option value="">Sem responsável</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <label className="field field-span-two"><span>Venda relacionada (opcional)</span><select className="select" value={saleId} onChange={(e) => selectSale(e.target.value)}><option value="">Sem venda</option>{sales.map((sale) => <option key={sale.id} value={sale.id}>{sale.label}</option>)}</select></label>
      <label className="field field-span-two"><span>Pedido de fornecedor (opcional)</span><select className="select" value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)}><option value="">Sem pedido</option>{purchaseOrders.map((order) => <option key={order.id} value={order.id}>{order.label}</option>)}</select></label>
      <label className="field field-span-two"><span>Observações</span><textarea className="textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <div className="agenda-form-actions field-span-two"><button className="button ghost" type="button" onClick={onClose}>Cancelar</button><button className="button gold" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}{loading ? "Salvando" : "Criar tarefa"}</button></div>
    </form>
    {message && <p className="form-message standalone-message">{message}</p>}
  </section></div>;
}
