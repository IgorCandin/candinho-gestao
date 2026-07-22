import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, ListTodo } from "lucide-react";
import { CentralTaskCreateForm } from "@/components/central-task-create-form";
import { getCentralAgendaUsers, getCentralContacts } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingPlanningPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessMarketing)) redirect("/dashboard");

  const supabase = await createClient();
  const [contacts, users, tasksResult] = await Promise.all([
    getCentralContacts(),
    getCentralAgendaUsers(),
    supabase
      .from("central_operational_tasks_overview")
      .select("id,title,category,due_at,due_date,status,priority,operation_scope,assigned_name,notes")
      .eq("operation_scope", "marketing")
      .order("due_at", { ascending: true }),
  ]);

  if (tasksResult.error) throw tasksResult.error;
  const tasks = tasksResult.data ?? [];
  const planned = tasks.filter((task) => task.status === "planned");
  const completed = tasks.filter((task) => task.status === "completed");

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">Candinho Marketing</div>
          <h1>Planejamento</h1>
          <p>Agenda de produção da Operação Marketing sem sair para a interface da Central.</p>
        </div>
        <CentralTaskCreateForm scopes={["marketing"]} contacts={contacts} users={users}/>
      </div>

      <div className="grid stats-grid" style={{ marginBottom: 18 }}>
        <article className="stat-card">
          <div className="stat-head"><span>Pendentes</span><span className="stat-icon"><ListTodo size={17}/></span></div>
          <div className="stat-value">{planned.length}</div>
          <div className="stat-note">tarefas de produção ainda abertas</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>Concluídas</span><span className="stat-icon"><CheckCircle2 size={17}/></span></div>
          <div className="stat-value">{completed.length}</div>
          <div className="stat-note">tarefas concluídas no histórico</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>Total</span><span className="stat-icon"><CalendarDays size={17}/></span></div>
          <div className="stat-value">{tasks.length}</div>
          <div className="stat-note">itens vinculados ao Marketing</div>
        </article>
      </div>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Calendário de produção</h2>
            <p>Gravação, edição, publicação e outras tarefas do Marketing.</p>
          </div>
        </div>
        <div className="panel-body" style={{ display: "grid", gap: 10 }}>
          {tasks.map((task) => (
            <div key={task.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", alignItems: "center", gap: 12, padding: 12, border: "1px solid var(--line)", borderRadius: 12, background: "rgba(255,255,255,.015)" }}>
              <span style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 10, background: "var(--gold-soft)", color: "var(--gold)" }}>
                {task.status === "completed" ? <CheckCircle2 size={18}/> : <Clock3 size={18}/>}
              </span>
              <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                <strong>{task.title}</strong>
                <span style={{ color: "var(--muted)", fontSize: 9 }}>{task.notes || task.category || "Tarefa de Marketing"}</span>
                <small style={{ color: "var(--muted)", fontSize: 8 }}>{task.assigned_name ? `Responsável: ${task.assigned_name}` : "Sem responsável definido"}</small>
              </div>
              <div style={{ textAlign: "right" }}>
                <strong style={{ fontSize: 10 }}>{task.due_at ? formatDateTime(task.due_at) : "Sem data"}</strong>
                <span className={`badge ${task.status === "completed" ? "green" : "gray"}`} style={{ display: "block", marginTop: 5 }}>{task.status === "completed" ? "Concluída" : "Pendente"}</span>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="empty">
              <CalendarDays size={28}/>
              <strong>Nenhuma tarefa de Marketing</strong>
              Use Nova tarefa para montar o calendário de produção.
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
