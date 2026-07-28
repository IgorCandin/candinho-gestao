import Link from "next/link";
import {
  CalendarClock,
  ContactRound,
  ExternalLink,
  UserRound,
} from "lucide-react";
import { CentralTaskStatusActions } from "@/components/central-task-status-actions";
import type { CentralUnifiedAgendaItem } from "@/lib/central-unified-agenda";
import { formatDateTime } from "@/lib/format";

const categoryLabel: Record<string, string> = {
  task: "Tarefa",
  delivery: "Entrega",
  payment: "Cobrança",
  follow_up: "Retorno",
  post_sale: "Pós-venda",
  supplier: "Fornecedor",
  other: "Outro",
};

const scopeLabel: Record<string, string> = {
  company: "Central",
  supplements: "Suplementos",
  fitness: "Fitness",
};

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function CentralUnifiedAgendaCard({
  item,
}: {
  item: CentralUnifiedAgendaItem;
}) {
  const overdue =
    item.status === "planned" &&
    item.due_date < todayBrazil();

  return (
    <article
      className={`central-unified-agenda-card scope-${item.operation_scope} status-${item.status} ${
        overdue ? "is-overdue" : ""
      }`}
    >
      <div className="central-unified-agenda-main">
        <div className="central-unified-agenda-tags">
          <span className="central-unified-agenda-scope">
            {scopeLabel[item.operation_scope] ??
              item.operation_scope}
          </span>

          <span className="badge">
            {categoryLabel[item.category] ??
              item.category}
          </span>

          {overdue && (
            <span className="badge red">
              Atrasada
            </span>
          )}

          {item.priority === "urgent" && (
            <span className="badge red">
              Urgente
            </span>
          )}

          {item.priority === "attention" &&
            !overdue && (
              <span className="badge amber">
                Atenção
              </span>
            )}
        </div>

        <h3>
          {item.href ? (
            <Link href={item.href}>
              {item.title}
            </Link>
          ) : (
            item.title
          )}
        </h3>

        {item.subtitle && (
          <p>{item.subtitle}</p>
        )}

        <div className="central-unified-agenda-meta">
          <span>
            <CalendarClock size={13} />
            {formatDateTime(item.due_at)}
          </span>

          {item.contact_name && (
            <span>
              <ContactRound size={13} />
              {item.contact_name}
            </span>
          )}

          {item.assigned_name && (
            <span>
              <UserRound size={13} />
              {item.assigned_name}
            </span>
          )}

          {item.href && (
            <span>
              <ExternalLink size={12} />
              Abrir origem
            </span>
          )}
        </div>
      </div>

      {item.editable_task_id && (
        <CentralTaskStatusActions
          taskId={item.editable_task_id}
          status={item.status}
        />
      )}
    </article>
  );
}
