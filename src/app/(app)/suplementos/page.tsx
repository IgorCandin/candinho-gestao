import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  ClipboardClock,
  PackageCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getDashboard } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export default async function SupplementsDashboardPage() {
  const data = await getDashboard();
  const profitPotential = data.stockSaleValue - data.stockCostValue;

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Candinho Suplementos"
        title="Visão geral"
        description="O que precisa da sua atenção hoje, sem abrir várias telas e planilhas."
      />

      <section className="overview-shortcuts">
        <Link className="overview-shortcut pending" href="/pedidos-pendentes">
          <div className="overview-shortcut-icon"><ClipboardClock size={22} /></div>
          <div className="overview-shortcut-copy">
            <span className="overview-shortcut-label">Pedidos pendentes</span>
            <strong>{data.pendingOrdersCount}</strong>
            <p>{data.pendingDeliveryCount} para entregar · {data.pendingPaymentCount} a receber</p>
          </div>
          <div className="overview-shortcut-side">
            <span>{formatCurrency(data.pendingOrdersValue)}</span>
            <ArrowRight size={18} />
          </div>
        </Link>

        <Link className="overview-shortcut panel-cs" href="/painel-cs">
          <div className="overview-shortcut-icon"><BarChart3 size={22} /></div>
          <div className="overview-shortcut-copy">
            <span className="overview-shortcut-label">Painel CS</span>
            <strong>{formatCurrency(data.currentMonthRevenue)}</strong>
            <p>Mês atual · mês anterior · visão geral</p>
          </div>
          <div className="overview-shortcut-side">
            <span>{data.currentMonthSalesCount} vendas</span>
            <ArrowRight size={18} />
          </div>
        </Link>
      </section>

      <section className="grid stats-grid">
        <StatCard label="Unidades disponíveis" value={String(data.totalUnits)} note={`${data.totalProducts} produtos ativos`} icon={Boxes} />
        <StatCard label="Valor do estoque" value={formatCurrency(data.stockCostValue)} note="Calculado pelo custo atual" icon={WalletCards} />
        <StatCard label="Potencial de venda" value={formatCurrency(data.stockSaleValue)} note={`${formatCurrency(profitPotential)} de lucro potencial`} icon={TrendingUp} />
        <StatCard label="A receber" value={formatCurrency(data.receivable)} note="Vendas com pagamento pendente" icon={AlertTriangle} />
      </section>

      <section className="grid dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Vendas recentes</h2>
              <p>Histórico comercial do mais recente para o mais antigo</p>
            </div>
            <Link className="button ghost" href="/vendas">Ver tudo</Link>
          </div>
          {data.recentSales.length === 0 ? (
            <div className="empty"><strong>Nenhuma venda registrada</strong>As vendas aparecerão aqui em ordem cronológica.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Cliente</th><th>Produto</th><th>Data</th><th>Pagamento</th><th>Total</th></tr></thead>
                <tbody>
                  {data.recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td><div className="cell-main">{sale.customer_name}</div><div className="cell-sub">Estoque {sale.location_code}</div></td>
                      <td>{sale.product_summary ?? "—"}</td>
                      <td>{formatDateOnly(sale.business_date)}</td>
                      <td><Badge value={sale.payment_status} /></td>
                      <td className="amount">{formatCurrency(sale.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div><h2>Reposição necessária</h2><p>Calculada pelo estoque total da empresa</p></div>
            <PackageCheck size={19} />
          </div>
          <div className="panel-body">
            {data.lowStock.length === 0 ? (
              <div className="empty compact"><strong>Estoque dentro do mínimo</strong>Nenhum produto precisa de reposição agora.</div>
            ) : (
              <div className="list">
                {data.lowStock.map((row) => (
                  <div className="list-item" key={row.product_id}>
                    <div>
                      <strong>{row.product_name}</strong>
                      <span>Empresa: {row.company_quantity} · mínimo {row.min_stock} · sugestão {row.suggested_order_quantity}</span>
                    </div>
                    <span className={`badge ${row.company_quantity === 0 ? "red" : "orange"}`}>
                      <span className="dot" />{row.company_quantity} un.
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
