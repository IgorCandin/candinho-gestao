import Link from "next/link";
import { BarChart3, CircleDollarSign, ClipboardClock, ReceiptText, ShoppingBag, TrendingUp, WalletCards } from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getPanelCS } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { PanelPeriod } from "@/lib/types";

function resolvePeriod(value?: string): PanelPeriod {
  if (value === "previous") return "previous";
  if (value === "all") return "all";
  return "current";
}

export default async function PanelCSPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const params = await searchParams;
  const period = resolvePeriod(params.periodo);
  const data = await getPanelCS(period);

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Candinho Suplementos"
        title="Painel CS"
        description="Acompanhe o desempenho comercial sem precisar abrir várias telas."
        action={<Link className="button ghost" href="/suplementos"><BarChart3 size={16} />Voltar à visão geral</Link>}
      />

      <nav className="period-tabs" aria-label="Período do painel">
        <Link className={`period-tab ${period === "current" ? "active" : ""}`} href="/painel-cs?periodo=current">Mês atual</Link>
        <Link className={`period-tab ${period === "previous" ? "active" : ""}`} href="/painel-cs?periodo=previous">Mês anterior</Link>
        <Link className={`period-tab ${period === "all" ? "active" : ""}`} href="/painel-cs?periodo=all">Visão geral</Link>
      </nav>

      <div className="panel-period-title">
        <span>Período selecionado</span>
        <strong>{data.periodLabel}</strong>
      </div>

      <section className="grid panel-cs-stats">
        <StatCard label="Receita bruta" value={formatCurrency(data.grossRevenue)} note="Vendas não canceladas" icon={CircleDollarSign} />
        <StatCard label="Lucro" value={formatCurrency(data.profit)} note="Lucro registrado no período" icon={TrendingUp} />
        <StatCard label="Quantidade de vendas" value={String(data.saleCount)} note="Pedidos comerciais concluídos ou ativos" icon={ShoppingBag} />
        <StatCard label="Ticket médio" value={formatCurrency(data.averageTicket)} note="Média por venda" icon={ReceiptText} />
        <StatCard label="Valor a receber" value={formatCurrency(data.receivable)} note="Pagamentos ainda pendentes" icon={WalletCards} />
        <StatCard label="Pedidos pendentes" value={String(data.pendingOrdersCount)} note="Entrega ou pagamento em aberto" icon={ClipboardClock} />
      </section>

      <article className="panel panel-cs-sales">
        <div className="panel-head">
          <div><h2>Vendas do período</h2><p>Base atual do sistema; ficará completa após a importação da MOV.</p></div>
          <Link className="button ghost" href="/vendas">Ver todos</Link>
        </div>
        {data.sales.length === 0 ? (
          <div className="empty"><BarChart3 size={26} /><strong>Nenhuma venda neste período</strong>Os indicadores serão preenchidos conforme os registros forem importados.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Cliente</th><th>Data</th><th>Status</th><th>Pagamento</th><th>Total</th><th>Lucro</th></tr></thead>
              <tbody>
                {data.sales.slice(0, 20).map((sale) => (
                  <tr key={sale.id}>
                    <td><div className="cell-main">{sale.customer_name}</div><div className="cell-sub">Origem {sale.location_code}</div></td>
                    <td>{formatDateTime(sale.created_at)}</td>
                    <td><Badge value={sale.general_status} /></td>
                    <td><Badge value={sale.payment_status} /></td>
                    <td className="amount">{formatCurrency(sale.total_amount)}</td>
                    <td className="amount positive">{formatCurrency(sale.total_profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </>
  );
}
