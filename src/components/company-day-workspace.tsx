import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Plus, Sparkles } from "lucide-react";
import type { AgendaEvent, AgendaSummary } from "@/lib/types";
import { formatDateOnly } from "@/lib/format";

function time(value: string) { return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }

export function CompanyDayWorkspace({ events, summary }: { events: AgendaEvent[]; summary: AgendaSummary }) {
  const planned = events.filter((event) => event.status === "planned");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <div className="company-workspace-v2 company-day-v2">
    <header className="company-workspace-head"><div><span>COMPANY · CENTRO DO DIA</span><h1>Organizar o dia</h1><p>Agenda, prioridades, alertas e pendências em uma fila única de execução.</p></div><Link className="company-registry-link" href="/central/agenda"><Plus size={16}/> Nova tarefa</Link></header>
    <section className="company-workspace-metrics"><article><AlertTriangle/><span>Atrasadas</span><strong>{summary.overdue_count}</strong></article><article><CalendarDays/><span>Hoje</span><strong>{summary.today_count}</strong></article><article><Clock3/><span>Próximos 7 dias</span><strong>{summary.next_seven_days_count}</strong></article><article><CheckCircle2/><span>Concluídas no mês</span><strong>{summary.completed_month_count}</strong></article></section>
    <section className="company-workspace-panel"><div className="company-day-heading"><div><span>Fila operacional</span><h2>O que precisa acontecer</h2></div><Link href="/central/meu-dia"><Sparkles size={15}/> Abrir Meu Dia completo</Link></div><div className="company-day-list">{planned.slice(0, 80).map((event) => { const overdue = event.due_date < today; return <Link href={event.href || "/central/agenda"} key={event.event_key} className={overdue ? "overdue" : ""}><span className="company-day-date"><strong>{formatDateOnly(event.due_date)}</strong><small>{time(event.due_at)}</small></span><span className="company-day-copy"><small>{event.category.replaceAll("_", " ")} · {event.priority}</small><strong>{event.title}</strong><span>{event.subtitle}</span></span><span className="company-day-scope">{event.assigned_name || "Sem responsável"}</span></Link>; })}{planned.length === 0 ? <div className="company-empty-state"><CheckCircle2/><strong>Fila organizada</strong><span>Nenhuma pendência planejada.</span></div> : null}</div></section>
  </div>;
}
