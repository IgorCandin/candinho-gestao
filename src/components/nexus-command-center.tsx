"use client";

import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  RefreshCcw,
  Route,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { NexusSignalCard } from "@/components/nexus-signal-card";
import type { NexusBrief, NexusSignal } from "@/lib/nexus-operating-types";

const FILTERS = [
  { key: "all", label: "Tudo" },
  { key: "commercial", label: "Comercial" },
  { key: "operation", label: "Operação" },
  { key: "relationship", label: "Relacionamentos" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function routeLabel(route: string) {
  const map: Array<[string, string]> = [
    ["/pedidos-pendentes", "Pendências"],
    ["/vendas", "Vendas"],
    ["/leads", "Leads"],
    ["/clientes", "CRM / Clientes"],
    ["/agenda", "Agenda"],
    ["/pos-venda", "Pós-venda"],
    ["/estoque", "Estoque"],
    ["/pedidos-fornecedor", "Compras"],
    ["/produtos", "Produtos"],
    ["/parceiros", "Parceiros"],
    ["/suplementos/painel", "Gestão"],
    ["/suplementos", "Hoje"],
  ];

  return map.find(([prefix]) => route === prefix || route.startsWith(`${prefix}/`))?.[1] ?? route;
}

function signalGroup(signal: NexusSignal): FilterKey {
  if (["lead_followup", "quote_followup", "stock_lead_opportunity"].includes(signal.signalType)) {
    return "commercial";
  }
  if (signal.signalType === "relationship_review") return "relationship";
  return "operation";
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function NexusCommandCenter({ initialBrief }: { initialBrief: NexusBrief }) {
  const [brief, setBrief] = useState(initialBrief);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      brief.signals.filter(
        (signal) => filter === "all" || signalGroup(signal) === filter,
      ),
    [brief.signals, filter],
  );

  async function refresh() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/nexus/brief?refresh=1", {
        cache: "no-store",
      });
      const payload = (await response.json()) as NexusBrief & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível atualizar o Nexus.");
      }

      setBrief(payload);
      setMessage("Leitura operacional atualizada.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível atualizar o Nexus.",
      );
    } finally {
      setLoading(false);
    }
  }

  function removeSignal(id: string) {
    setBrief((current) => {
      const signal = current.signals.find((item) => item.id === id);
      if (!signal) return current;

      const counts = { ...current.counts };
      counts.open = Math.max(0, counts.open - 1);

      if (signal.severity === "urgent") counts.urgent = Math.max(0, counts.urgent - 1);
      if (signal.severity === "attention") counts.attention = Math.max(0, counts.attention - 1);
      if (signal.severity === "opportunity") counts.opportunity = Math.max(0, counts.opportunity - 1);
      if (signal.signalType === "lead_followup") counts.lead = Math.max(0, counts.lead - 1);
      if (signal.signalType === "payment_due") counts.payment = Math.max(0, counts.payment - 1);
      if (signal.signalType === "delivery_due") counts.delivery = Math.max(0, counts.delivery - 1);
      if (signal.signalType === "post_sale") counts.postSale = Math.max(0, counts.postSale - 1);
      if (["stockout", "stock_lead_opportunity"].includes(signal.signalType)) {
        counts.stock = Math.max(0, counts.stock - 1);
      }
      if (signal.signalType === "relationship_review") {
        counts.relationship = Math.max(0, counts.relationship - 1);
      }

      return {
        ...current,
        signals: current.signals.filter((item) => item.id !== id),
        counts,
      };
    });
  }

  const execution = [
    {
      label: "1. Resolver dinheiro e entrega",
      note: `${brief.counts.payment} cobrança(s) priorizada(s) · ${brief.counts.delivery} entrega(s)`,
      href: "/pedidos-pendentes",
    },
    {
      label: "2. Retomar oportunidades",
      note: `${brief.counts.lead} lead(s) na fila inteligente`,
      href: "/leads",
    },
    {
      label: "3. Fazer pós-venda",
      note: `${brief.postSale.overdueCount} atrasado(s) · ${brief.postSale.todayCount} para hoje`,
      href: "/pos-venda",
    },
    {
      label: "4. Garantir reposição",
      note: `${brief.counts.stock} sinal(is) de estoque/demanda`,
      href: "/pedidos-fornecedor/proximo-pedido",
    },
  ];

  return (
    <section className="nexus-command-center">
      <header className="nexus-command-hero">
        <div className="nexus-command-brand">
          <span className="nexus-command-orb"><Bot size={25} /></span>
          <div>
            <span className="eyebrow">Nexus Operating Layer · V1</span>
            <h2>O cérebro acima dos módulos</h2>
            <p>
              O ERP continua sendo a fonte de verdade. O Nexus cruza os fatos, aprende o caminho de uso e organiza a próxima decisão sem executar ações críticas sozinho.
            </p>
          </div>
        </div>

        <button className="button gold" type="button" disabled={loading} onClick={() => void refresh()}>
          {loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCcw size={16} />}
          {loading ? "Atualizando" : "Atualizar leitura"}
        </button>
      </header>

      <div className="nexus-command-stats">
        <article><span>Sinais ativos</span><strong>{brief.counts.open}</strong><small>inclui insights e revisões</small></article>
        <article className="urgent"><span>Urgentes</span><strong>{brief.counts.urgent}</strong><small>merecem vir primeiro</small></article>
        <article className="opportunity"><span>Oportunidades</span><strong>{brief.counts.opportunity}</strong><small>podem virar venda</small></article>
        <article><span>Faturamento do mês</span><strong>{money(brief.commercial.currentMonthRevenue)}</strong><small>{brief.commercial.currentMonthSales} venda(s) entregues</small></article>
        <article><span>Lucro do mês</span><strong>{money(brief.commercial.currentMonthProfit)}</strong><small>base operacional atual</small></article>
        <article><span>A receber</span><strong>{money(brief.commercial.receivableTotal)}</strong><small>{brief.commercial.receivableSales} venda(s)</small></article>
      </div>

      <div className="nexus-command-layout">
        <div className="nexus-command-main">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2><Sparkles size={18} /> Inbox do Nexus</h2>
                <p>O que mudou no ERP e merece decisão, em vez de obrigar você a procurar módulo por módulo.</p>
              </div>

              <div className="nexus-signal-filters">
                {FILTERS.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={filter === item.key ? "active" : ""}
                    onClick={() => setFilter(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel-body nexus-command-signals">
              {visible.length ? (
                visible.slice(0, 20).map((signal) => (
                  <NexusSignalCard
                    signal={signal}
                    key={signal.id}
                    onChanged={(id) => removeSignal(id)}
                  />
                ))
              ) : (
                <div className="empty compact">
                  <CheckCircle2 size={27} />
                  <strong>Nada nesta categoria agora</strong>
                  Troque o filtro ou atualize a leitura.
                </div>
              )}
            </div>
          </article>
        </div>

        <aside className="nexus-command-side">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2><ClipboardList size={18} /> Rotina guiada</h2>
                <p>Um novo operador pode seguir esta sequência sem conhecer todos os atalhos do ERP.</p>
              </div>
            </div>
            <div className="panel-body nexus-playbook-list">
              {execution.map((item) => (
                <Link href={item.href} key={item.label}>
                  <strong>{item.label}</strong>
                  <span>{item.note}</span>
                </Link>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2><Route size={18} /> Rotina aprendida</h2>
                <p>Frequência de páginas abertas nos últimos 30 dias.</p>
              </div>
            </div>
            <div className="panel-body nexus-route-list">
              {brief.usage.length ? (
                brief.usage.slice(0, 8).map((item, index) => (
                  <div key={item.route}>
                    <span>{index + 1}</span>
                    <div><strong>{routeLabel(item.route)}</strong><small>{item.route}</small></div>
                    <b>{item.visits}×</b>
                  </div>
                ))
              ) : (
                <div className="empty compact">
                  <Route size={24} />
                  <strong>Ainda aprendendo a rotina</strong>
                  A partir deste pacote, a navegação passa a alimentar este mapa.
                </div>
              )}
            </div>
          </article>

          <article className="panel nexus-guardrail-card">
            <div className="panel-head">
              <div>
                <h2><ShieldCheck size={18} /> Limites do Nexus</h2>
                <p>Inteligência com trilhos claros.</p>
              </div>
            </div>
            <div className="panel-body">
              <p><strong>Pode:</strong> observar, cruzar dados, priorizar, sugerir, gerar mensagens e explicar o porquê.</p>
              <p><strong>Não faz sozinho:</strong> enviar mensagem, receber pagamento, apagar registro, alterar financeiro ou dar baixa manual.</p>
              <p><strong>Exceção configurável:</strong> a parceria pode ser atribuída automaticamente quando o vínculo do cliente foi cadastrado explicitamente.</p>
            </div>
          </article>
        </aside>
      </div>

      <div className="nexus-command-footer-note">
        <UserRoundCheck size={16} />
        <span>
          “Já tratei” apenas tira um sinal da fila por alguns dias. O registro original continua no módulo certo e o histórico não é apagado.
        </span>
      </div>

      {message && <p className="form-message">{message}</p>}
    </section>
  );
}
