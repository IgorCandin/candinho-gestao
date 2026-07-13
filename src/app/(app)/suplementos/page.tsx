import Link from "next/link";
import { AlertTriangle, Boxes, CircleDollarSign, PackageCheck, TrendingUp, WalletCards } from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getDashboard } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";

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
        action={
          <Link className="button gold" href="/vendas?novo=venda">
            <CircleDollarSign size={16} />
            Registrar venda
          </Link>
        }
      />
      <section className="grid stats-grid">
        <StatCard label="Unidades disponíveis" value={String(data.totalUnits)} note={`${data.totalProducts} produtos ativos`} icon={Boxes} />
        <StatCard label="Valor do estoque" value={formatCurrency(data.stockCostValue)} note="Calculado pelo custo atual" icon={WalletCards} />
        <StatCard label="Potencial de venda" value={formatCurrency(data.stockSaleValue)} note={`${formatCurrency(profitPotential)} de lucro potencial`} icon={TrendingUp} />
        <StatCard label="A receber" value={formatCurrency(data.receivable)} note={`${data.lowStockCount} saldos exigem atenção`} icon={AlertTriangle} />
      </section>
      <section className="grid dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Vendas e leads recentes</h2>
              <p>Últimas movimentações comerciais registradas</p>
            </div>
            <Link className="button ghost" href="/vendas">Ver tudo</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Cliente</th><th>Tipo</th><th>Data</th><th>Pagamento</th><th>Total</th></tr></thead>
              <tbody>
                {data.recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td><div className="cell-main">{sale.customer_name}</div><div className="cell-sub">Estoque {sale.location_code}</div></td>
                    <td><Badge value={sale.record_type} /></td>
                    <td>{formatDate(sale.created_at)}</td>
                    <td><Badge value={sale.payment_status} /></td>
                    <td className="amount">{formatCurrency(sale.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div><h2>Reposição necessária</h2><p>Zerados e abaixo do mínimo</p></div>
            <PackageCheck size={19} />
          </div>
          <div className="panel-body">
            <div className="list">
              {data.lowStock.map((row) => (
                <div className="list-item" key={`${row.product_id}-${row.location_id}`}>
                  <div><strong>{row.product_name}</strong><span>{row.location_code} · mínimo {row.min_stock}</span></div>
                  <span className={`badge ${row.quantity === 0 ? "red" : "orange"}`}><span className="dot" />{row.quantity} un.</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
