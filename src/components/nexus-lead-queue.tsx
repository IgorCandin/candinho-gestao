import Link from "next/link";
import { Bot, ChevronRight, MessagesSquare } from "lucide-react";
import { NexusSignalCard } from "@/components/nexus-signal-card";
import type { NexusSignal } from "@/lib/nexus-operating-types";

export function NexusLeadQueue({ signals }: { signals: NexusSignal[] }) {
  const leads = signals
    .filter((signal) => signal.signalType === "lead_followup")
    .slice(0, 5);

  if (!leads.length) return null;

  return (
    <article className="panel nexus-lead-queue">
      <div className="panel-head">
        <div>
          <h2><Bot size={18} /> Nexus · quem vale retomar</h2>
          <p>
            Só entram aqui leads sem contato recente registrado. “Já tratei” tira o sinal da fila por 3 dias sem apagar o lead.
          </p>
        </div>
        <Link className="button ghost compact-button" href="/suplementos/nexus">
          Ver no Nexus <ChevronRight size={14} />
        </Link>
      </div>

      <div className="panel-body nexus-lead-queue-list">
        {leads.map((signal) => (
          <NexusSignalCard signal={signal} compact key={signal.id} />
        ))}
      </div>

      <div className="nexus-lead-queue-foot">
        <MessagesSquare size={14} />
        A lista completa de Leads continua abaixo como histórico comercial; esta fila é só a prioridade de contato.
      </div>
    </article>
  );
}
