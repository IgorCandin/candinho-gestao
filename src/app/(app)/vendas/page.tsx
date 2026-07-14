import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getSalesHistory } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export default async function SalesPage() {
  const sales = await getSalesHistory();

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Comercial"
        title="Vendas"
        description="Histórico de vendas em ordem cronológica, da mais recente para a mais antiga."
        action={<Link className="button gold" href="/vendas?novo=venda"><Plus size={16} />Nova venda</Link>}
      />

      <nav className="period-tabs" aria-label="Área comercial">
        <Link className="period-tab active" href="/vendas">Vendas</Link>
        <Link className="period-tab" href="/leads">Leads</Link>
      </nav>

      <article className="panel">
        {sales.length === 0 ? (
          <div className="empty"><strong>Nenhuma venda registrada</strong>As vendas aparecerão aqui quando forem cadastradas.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Cliente</th><th>Produto</th><th>Data</th><th>Status</th><th>Pagamento</th><th>Entrega</th><th>Origem</th><th>Total</th><th>Lucro</th></tr></thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td><div className="cell-main">{sale.customer_name}</div><div className="cell-sub">{sale.payment_method ?? "Pagamento não informado"}</div></td>
                    <td>{sale.product_summary ?? "—"}</td>
                    <td>{formatDateOnly(sale.business_date)}</td>
                    <td><Badge value={sale.general_status} /></td>
                    <td><Badge value={sale.payment_status} /></td>
                    <td><Badge value={sale.delivery_status} /></td>
                    <td>{sale.location_code}</td>
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
