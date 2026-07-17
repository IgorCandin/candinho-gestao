import { AlertTriangle, CalendarClock, CircleCheckBig, ListTodo } from "lucide-react";
import { redirect } from "next/navigation";
import { CentralTaskCard } from "@/components/central-task-card";
import { CentralTaskCreateForm } from "@/components/central-task-create-form";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCentralAgendaSnapshot, getCentralAgendaUsers, getCentralContacts } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CentralPendingPage({ searchParams }: { searchParams: Promise<{ scope?: string; priority?: string }> }) {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness)) redirect("/dashboard");
  const params = await searchParams;
  const allowedScopes = ["company", ...(access.canAccessSupplements || access.role === "admin" ? ["supplements"] : []), ...(access.canAccessFitness || access.role === "admin" ? ["fitness"] : [])];
  const scope = params.scope && allowedScopes.includes(params.scope) ? params.scope : null;
  const priority = params.priority && ["normal","attention","urgent"].includes(params.priority) ? params.priority : null;
  const [agenda, contacts, users] = await Promise.all([getCentralAgendaSnapshot("planned", scope), getCentralContacts(), getCentralAgendaUsers()]);
  const tasks = priority ? agenda.items.filter((task) => task.priority === priority) : agenda.items;
  return <>
    <PageHeader eyebrow="Candinho Central" title="Pendências" description="Tudo o que ainda exige ação, ordenado pela data prevista." action={<CentralTaskCreateForm scopes={allowedScopes} contacts={contacts} users={users}/>}/>
    <section className="stats-grid central-agenda-stats">
      <StatCard href="/central/pendencias" label="Pendentes" value={String(agenda.summary.pending_count)} note="tarefas abertas" icon={ListTodo}/>
      <StatCard href="/central/pendencias" label="Atrasadas" value={String(agenda.summary.overdue_count)} note="precisam de atenção" icon={AlertTriangle}/>
      <StatCard href="/central/agenda" label="Hoje" value={String(agenda.summary.today_count)} note="previstas para hoje" icon={CalendarClock}/>
      <StatCard href="/central/agenda?status=completed" label="Concluídas no mês" value={String(agenda.summary.completed_month_count)} note="ações resolvidas" icon={CircleCheckBig}/>
    </section>
    <article className="panel central-task-filter-panel"><form className="panel-body central-task-filter-form" method="get">
      <label><span>Operação</span><select className="select" name="scope" defaultValue={scope ?? ""}><option value="">Todas</option>{allowedScopes.map((item) => <option value={item} key={item}>{item === "company" ? "Company" : item === "supplements" ? "Suplementos" : "Fitness"}</option>)}</select></label>
      <label><span>Prioridade</span><select className="select" name="priority" defaultValue={priority ?? ""}><option value="">Todas</option><option value="urgent">Urgente</option><option value="attention">Atenção</option><option value="normal">Normal</option></select></label>
      <button className="button ghost" type="submit"><ListTodo size={15}/>Filtrar</button>
    </form></article>
    <article className="panel"><div className="panel-head"><div><h2>Fila de pendências</h2><p>{tasks.length} tarefa(s) aguardando ação.</p></div></div><div className="central-task-list">{tasks.length ? tasks.map((task) => <CentralTaskCard task={task} key={task.id}/>) : <div className="empty-state"><CircleCheckBig size={28}/><strong>Nenhuma pendência</strong><span>Não há tarefas abertas neste filtro.</span></div>}</div></article>
  </>;
}
