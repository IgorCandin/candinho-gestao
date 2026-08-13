import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircle, Target } from "lucide-react";
import type { CommercialContactQueueSnapshot } from "@/lib/commercial-contact-types";
import { formatDateOnly } from "@/lib/format";

export function CommercialContactAgendaCard({
  snapshot,
}: {
  snapshot: CommercialContactQueueSnapshot;
}) {
  const next = snapshot.items[0] ?? null;
  const progress = Math.min(
    100,
    Math.round((snapshot.contacted_today / Math.max(snapshot.goal, 1)) * 100),
  );

  return (
    <Link
      className={`v4530-agenda-commercial ${snapshot.completed ? "completed" : ""}`}
      href="/suplementos/fila-comercial"
    >
      <span className="v4530-agenda-commercial-icon">
        {snapshot.completed ? <CheckCircle2 size={20} /> : <Target size={20} />}
      </span>
      <span className="v4530-agenda-commercial-copy">
        <small>Hoje · {formatDateOnly(snapshot.today)}</small>
        <strong>Fila comercial · {snapshot.contacted_today}/{snapshot.goal}</strong>
        <span>
          {snapshot.completed
            ? "Meta diária concluída. Se quiser, continue trabalhando a fila."
            : next
              ? `Próximo: ${next.customer_name} · ${next.product_name}`
              : "Nenhum contato elegível agora. As obrigações da Agenda continuam separadas."}
        </span>
      </span>
      <span className="v4530-agenda-commercial-progress" aria-hidden="true">
        <i style={{ width: `${progress}%` }} />
      </span>
      <span className="v4530-agenda-commercial-side">
        <MessageCircle size={15} />
        <small>{snapshot.total_eligible} na fila</small>
        <ArrowRight size={16} />
      </span>
    </Link>
  );
}
