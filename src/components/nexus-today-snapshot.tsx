import Link from "next/link";
import {
  Bot,
  ChevronRight,
  ClipboardCheck,
  Route,
  Sparkles,
} from "lucide-react";
import { NexusSignalCard } from "@/components/nexus-signal-card";
import type { NexusBrief, NexusSignal } from "@/lib/nexus-operating-types";

function routeLabel(route: string) {
  if (route.startsWith("/pedidos-pendentes")) return "Pendências";
  if (route.startsWith("/vendas")) return "Vendas";
  if (route.startsWith("/leads")) return "Leads";
  if (route.startsWith("/clientes")) return "Clientes / CRM";
  if (route.startsWith("/agenda")) return "Agenda";
  if (route.startsWith("/pos-venda")) return "Pós-venda";
  if (route.startsWith("/estoque")) return "Estoque";
  if (route.startsWith("/pedidos-fornecedor")) return "Compras";
  if (route.startsWith("/produtos")) return "Produtos";
  if (route.startsWith("/parceiros")) return "Parceiros";
  if (route.startsWith("/suplementos/painel")) return "Gestão";
  if (route === "/suplementos") return "Hoje";
  return route;
}

function chooseStartSignals(signals: NexusSignal[]) {
  const byType = new Map<string, NexusSignal>();

  for (const signal of signals) {
    if (!byType.has(signal.signalType)) {
      byType.set(signal.signalType, signal);
    }
  }

  const order = [
    "payment_due",
    "delivery_due",
    "lead_followup",
    "stock_lead_opportunity",
    "post_sale",
    "quote_followup",
    "stockout",
    "relationship_review",
  ];

  const selected = order
    .map((type) => byType.get(type))
    .filter((signal): signal is NexusSignal => Boolean(signal));

  for (const signal of signals) {
    if (selected.length >= 5) break;
    if (!selected.some((item) => item.id === signal.id)) selected.push(signal);
  }

  return selected.slice(0, 5);
}

export function NexusTodaySnapshot({ brief }: { brief: NexusBrief }) {
  const start = chooseStartSignals(brief.signals);
  const mostUsed = brief.usage.slice(0, 4);
  const actionableCount =
    brief.counts.urgent + brief.counts.attention + brief.counts.opportunity;

  return (
    <section className="nexus-today-wrap">
      <header className="nexus-today-head">
        <div className="nexus-today-brand">
          <span className="nexus-orb"><Bot size={20} /></span>
          <div>
            <span className="eyebrow">Nexus · copiloto operacional</span>
            <h2>Comece por aqui</h2>
            <p>
              O Nexus cruza a operação e mostra primeiro o que merece decisão.
              A ideia é qualquer pessoa conseguir seguir o trabalho sem decorar o ERP inteiro.
            </p>
          </div>
        </div>

        <Link className="button gold" href="/suplementos/nexus">
          Abrir Nexus
          <ChevronRight size={15} />
        </Link>
      </header>

      <div className="nexus-today-kpis">
        <div><span>Para agir</span><strong>{actionableCount}</strong><small>urgências, atenções e oportunidades</small></div>
        <div><span>Urgentes</span><strong>{brief.counts.urgent}</strong><small>cobrança, entrega, lead ou estoque</small></div>
        <div><span>Oportunidades</span><strong>{brief.counts.opportunity}</strong><small>demanda que pode virar venda</small></div>
        <div><span>A receber</span><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(brief.commercial.receivableTotal)}</strong><small>{brief.commercial.receivableSales} venda(s)</small></div>
      </div>

      {start.length > 0 ? (
        <div className="nexus-today-priorities">
          {start.map((signal) => (
            <NexusSignalCard signal={signal} compact key={signal.id} />
          ))}
        </div>
      ) : (
        <article className="panel nexus-clear-card">
          <ClipboardCheck size={24} />
          <div>
            <strong>Sem sinal crítico agora</strong>
            <span>Use a Agenda ou pergunte ao Nexus o que vale revisar em seguida.</span>
          </div>
        </article>
      )}

      {mostUsed.length > 0 && (
        <div className="nexus-learned-routine">
          <Route size={16} />
          <div>
            <strong>Padrão recente de uso</strong>
            <span>
              {mostUsed
                .map((item) => `${routeLabel(item.route)} (${item.visits}×)`)
                .join(" · ")}
            </span>
          </div>
          <small>
            <Sparkles size={12} /> O Nexus usa frequência de navegação só para organizar atalhos e contexto; não lê o que você digita nos formulários.
          </small>
        </div>
      )}
    </section>
  );
}
