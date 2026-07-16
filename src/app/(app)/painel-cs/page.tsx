import Link from "next/link";
import {
  BarChart3,
  CircleDollarSign,
  ClipboardClock,
  Gauge,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getPanelCS } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { PanelPeriod } from "@/lib/types";

function resolvePeriod(value?: string): PanelPeriod {
  if (value === "previous") return "previous";
  if (value === "all") return "all";
  return "current";
}

function changeText(value: number | null) {
  if (value == null) return "Sem base anterior";
  if (Math.abs(value) < 0.05) return "Sem alteração";
  return `${value > 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")}%`;
}

function changeClass(value: number | null) {
  if (value == null || Math.abs(value) < 0.05) return "neutral";
  return value > 0 ? "positive" : "negative";
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
        description="Resultado comercial calculado pela data real da entrega, com comparação mensal e margem do período."
        action={<Link className="button ghost" href="/suplementos"><BarChart3 size={16} />Voltar à visão geral</Link>}
      />

      <nav className="period-tabs" aria-label="Período do painel">
        <Link className={`period-tab ${period === "current" ? "active" : ""}`} href="/painel-cs?periodo=current">Mês atual</Link>
        <Link className={`period-tab ${period === "previous" ? "active" : ""}`} href="/painel-cs?periodo=previous">Mês anterior</Link>
        <Link className={`period-tab ${period === "all" ? "active" : ""}`} href="/painel-cs?periodo=all">Histórico geral</Link>
      </nav>

      <div className="panel-period-title">
        <span>Período selecionado</span>
        <strong>{data.periodLabel}</strong>
      </div>

      {period === "current" ? (
        <section className="panel-cs-comparison">
          <div>
            <span>Faturamento</span>
            <strong>{formatCurrency(data.grossRevenue)}</strong>
            <small className={changeClass(data.revenueChange)}>{changeText(data.revenueChange)} vs. mês anterior</small>
          </div>
          <div>
            <span>Lucro</span>
            <strong>{formatCurrency(data.profit)}</strong>
            <small className={changeClass(data.profitChange)}>{changeText(data.profitChange)} vs. mês anterior</small>
          </div>
          <div>
            <span>Quantidade de vendas</span>
            <strong>{data.saleCount}</strong>
            <small className={changeClass(data.salesChange)}>{changeText(data.salesChange)} vs. mês anterior</small>
          </div>
          <div className="panel-cs-previous">
            <span>Mês anterior</span>
            <strong>{formatCurrency(data.comparisonRevenue)}</strong>
            <small>{data.comparisonSales} vendas · {formatCurrency(data.comparisonProfit)} de lucro</small>
          </div>
        </section>
      ) : null}

      <section className="grid panel-cs-stats">
        <StatCard href="/vendas" label="Receita bruta" value={formatCurrency(data.grossRevenue)} note="Somente vendas comerciais entregues" icon={CircleDollarSign} />
        <StatCard href="/vendas" label="Lucro" value={formatCurrency(data.profit)} note="Custo histórico preservado por venda" icon={TrendingUp} />
        <StatCard href="/vendas" label="Margem" value={`${data.marginPercent.toFixed(1).replace(".", ",")}%`} note="Lucro sobre o faturamento" icon={Gauge} />
        <StatCard href="/vendas" label="Quantidade de vendas" value={String(data.saleCount)} note="Vendas válidas no período" icon={ShoppingBag} />
        <StatCard href="/vendas" label="Ticket médio" value={formatCurrency(data.averageTicket)} note="Média por venda entregue" icon={ReceiptText} />
        <StatCard href="/pedidos-pendentes" label="Valor a receber" value={formatCurrency(data.receivable)} note={`${data.pendingOrdersCount} pedido(s) com pendência`} icon={WalletCards} />
      </section>

      <article className="panel panel-cs-sales">
        <div className="panel-head">
          <div><h2>Vendas do período</h2><p>Da entrega mais recente para a mais antiga.</p></div>
          <Link className="button ghost" href="/vendas">Ver histórico completo</Link>
        </div>
        {data.sales.length === 0 ? (
          <div className="empty"><BarChart3 size={26} /><strong>Nenhuma venda neste período</strong>Não há entregas comerciais válidas no período selecionado.</div>
        ) : (
          <div className="table-wrap">
            <table className="panel-cs-sales-table">
              <thead><tr><th>Cliente</th><th>Produto</th><th>Data da entrega</th><th>Pagamento</th><th>Total</th><th>Lucro</th><th></th></tr></thead>
              <tbody>
                {data.sales.slice(0, 40).map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      {sale.customer_id ? (
                        <Link className="cell-main dashboard-inline-link" href={`/clientes/${sale.customer_id}`}>{sale.customer_name}</Link>
                      ) : <div className="cell-main">{sale.customer_name}</div>}
                    </td>
                    <td>{sale.product_summary ?? "—"}</td>
                    <td><span className="date-status green">{formatDateOnly(sale.delivered_at)}</span></td>
                    <td>{sale.paid_at ? <span className="date-status green">{formatDateOnly(sale.paid_at)}</span> : <Badge value={sale.payment_status} />}</td>
                    <td className="amount">{formatCurrency(sale.total_amount)}</td>
                    <td className="amount positive">{formatCurrency(sale.total_profit)}</td>
                    <td><Link className="icon-link" href={`/vendas/${sale.id}`} aria-label={`Abrir venda de ${sale.customer_name}`}><ClipboardClock size={15} /></Link></td>
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
