import Link from "next/link";
import { CalendarClock, ContactRound, UserRound } from "lucide-react";
import { CentralTaskStatusActions } from "@/components/central-task-status-actions";
import { formatDateTime } from "@/lib/format";
import type { CentralAgendaTask } from "@/lib/central-data";

const categoryLabel: Record<string,string> = { task: "Tarefa", delivery: "Entrega", payment: "Cobrança", follow_up: "Retorno", post_sale: "Pós-venda", supplier: "Fornecedor", other: "Outro" };
const scopeLabel: Record<string,string> = { company: "Company", supplements: "Suplementos", fitness: "Fitness", marketing: "Marketing" };

function todayBrazil() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

export function CentralTaskCard({ task }: { task: CentralAgendaTask }) {
  const overdue = task.status === "planned" && task.due_date < todayBrazil();
  return <article className={`central-task-card ${task.status} ${task.priority} ${overdue ? "overdue" : ""}`}>
    <div className="central-task-card-main">
      <div className="central-task-card-tags"><span className={`badge scope-${task.operation_scope}`}>{scopeLabel[task.operation_scope] ?? task.operation_scope}</span><span className="badge">{categoryLabel[task.category] ?? task.category}</span>{overdue && <span className="badge red">Atrasada</span>}{task.priority === "urgent" && <span className="badge red">Urgente</span>}{task.priority === "attention" && <span className="badge amber">Atenção</span>}</div>
      <strong>{task.title}</strong>
      {task.notes && <p>{task.notes}</p>}
      <div className="central-task-card-meta"><span><CalendarClock size={14}/>{formatDateTime(task.due_at)}</span>{task.contact_name && <span><ContactRound size={14}/>{task.central_contact_id ? <Link href={`/central/clientes/${task.central_contact_id}`}>{task.contact_name}</Link> : task.contact_name}</span>}{task.assigned_name && <span><UserRound size={14}/>{task.assigned_name}</span>}</div>
    </div>
    <CentralTaskStatusActions taskId={task.id} status={task.status}/>
  </article>;
}
