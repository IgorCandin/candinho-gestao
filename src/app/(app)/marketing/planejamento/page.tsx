import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, History, ListTodo } from "lucide-react";
import { CentralTaskCreateForm } from "@/components/central-task-create-form";
import { CentralTaskStatusActions } from "@/components/central-task-status-actions";
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
      .select("id,title,category,due_at,due_date,status,priority,operation_scope,assigned_name,notes,completed_at,cancelled_at")
      .eq("operation_scope", "marketing")
      .order("due_at", { ascending: true }),
  ]);

  if (tasksResult.error) throw tasksResult.error;
  const tasks = tasksResult.data ?? [];
  const planned = tasks.filter((task) => task.status === "planned");
  const history = tasks
    .filter((task) => task.status !== "planned")
    .sort((a, b) => String(b.completed_at || b.cancelled_at || b.due_at).localeCompare(String(a.completed_at || a.cancelled_at || a.due_at)));
  const completed = tasks.filter((task) => task.status === "completed");

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">Candinho Marketing</div>
          <h1>Planejamento</h1>
          <p>Agenda oficial de produção do Marketing, sincronizada com o Google Agenda.</p>
        </div>
        <CentralTaskCreateForm scopes={["marketing"]} contacts={contacts} users={users}/>
      </div>

      <article className="panel" style={{ marginBottom: 18, borderColor: "rgba(214,170,74,.32)" }}>
        <div className="panel-body" style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 11 }}>Marketing ↔ Google Agenda</strong>
          <small style={{ color: "var(--muted)", fontSize: 9, lineHeight: 1.55 }}>
            Tarefas pendentes do Marketing entram no Google Agenda. Quando você marcar como concluída ou cancelada aqui,
            o compromisso sai do Google, mas permanece no histórico desta página para consulta futura.
          </small>
        </div>
      </article>

      <div className="grid stats-grid" style={{ marginBottom: 18 }}>
        <article className="stat-card">
          <div className="stat-head"><span>Pendentes</span><span className="stat-icon"><ListTodo size={17}/></span></div>
          <div className="stat-value">{planned.length}</div>
          <div className="stat-note">tarefas ainda abertas</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>Concluídas</span><span className="stat-icon"><CheckCircle2 size={17}/></span></div>
          <div className="stat-value">{completed.length}</div>
          <div className="stat-note">mantidas no histórico</div>
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
            <h2>Próximas publicações e tarefas</h2>
            <p>O que ainda precisa ser produzido ou publicado.</p>
          </div>
          <CalendarDays size={20}/>
        </div>
        <div className="panel-body" style={{ display: "grid", gap: 10 }}>
          {planned.map((task) => (
            <div key={task.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", alignItems: "center", gap: 12, padding: 12, border: "1px solid var(--line)", borderRadius: 12, background: "rgba(255,255,255,.015)" }}>
              <span style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 10, background: "var(--gold-soft)", color: "var(--gold)" }}>
                <Clock3 size={18}/>
              </span>
              <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                <strong>{task.title}</strong>
                <span style={{ color: "var(--muted)", fontSize: 9, whiteSpace: "pre-line" }}>{task.notes || task.category || "Tarefa de Marketing"}</span>
                <small style={{ color: "var(--muted)", fontSize: 8 }}>{task.assigned_name ? `Responsável: ${task.assigned_name}` : "Operação Marketing"}</small>
              </div>
              <div style={{ textAlign: "right", display: "grid", justifyItems: "end", gap: 7 }}>
                <strong style={{ fontSize: 10 }}>{task.due_at ? formatDateTime(task.due_at) : "Sem data"}</strong>
                <span className={`badge ${task.priority === "urgent" ? "red" : task.priority === "attention" ? "amber" : "gray"}`}>
                  {task.priority === "urgent" ? "Urgente" : task.priority === "attention" ? "Atenção" : "Pendente"}
                </span>
                <CentralTaskStatusActions taskId={task.id} status={task.status}/>
              </div>
            </div>
          ))}

          {planned.length === 0 && (
            <div className="empty">
              <CheckCircle2 size={28}/>
              <strong>Nenhuma tarefa pendente</strong>
              O Marketing está em dia.
            </div>
          )}
        </div>
      </article>

      <article className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div>
            <h2>Histórico</h2>
            <p>Publicações e tarefas concluídas continuam registradas aqui, mesmo depois de saírem do Google Agenda.</p>
          </div>
          <History size={20}/>
        </div>
        <div className="panel-body" style={{ display: "grid", gap: 10 }}>
          {history.map((task) => (
            <div key={task.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", alignItems: "center", gap: 12, padding: 12, border: "1px solid var(--line)", borderRadius: 12, background: "rgba(255,255,255,.01)", opacity: .86 }}>
              <span style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 10, background: "rgba(85,180,120,.10)", color: "var(--gold)" }}>
                <CheckCircle2 size={18}/>
              </span>
              <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                <strong>{task.title}</strong>
                {task.notes && <span style={{ color: "var(--muted)", fontSize: 9, whiteSpace: "pre-line" }}>{task.notes}</span>}
                <small style={{ color: "var(--muted)", fontSize: 8 }}>
                  Planejada para {task.due_at ? formatDateTime(task.due_at) : "data não informada"}
                  {task.completed_at ? ` · Concluída em ${formatDateTime(task.completed_at)}` : ""}
                </small>
              </div>
              <div style={{ textAlign: "right", display: "grid", justifyItems: "end", gap: 7 }}>
                <span className={`badge ${task.status === "completed" ? "green" : "gray"}`}>{task.status === "completed" ? "Feito" : "Cancelado"}</span>
                <CentralTaskStatusActions taskId={task.id} status={task.status}/>
              </div>
            </div>
          ))}

          {history.length === 0 && (
            <div className="empty">
              <History size={28}/>
              <strong>Histórico vazio</strong>
              As tarefas concluídas aparecerão aqui.
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
