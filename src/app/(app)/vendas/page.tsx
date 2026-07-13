import { Plus } from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getSales } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default async function SalesPage() {
  const sales = await getSales();
  return <><DemoBanner /><PageHeader eyebrow="Comercial" title="Vendas e leads" description="Uma base única para orçamento, venda, pagamento, entrega e estorno seguro." action={<button className="button gold"><Plus size={16} />Nova venda</button>} />
    <div className="filters"><select className="select"><option>Todos os registros</option><option>Vendas</option><option>Leads</option></select><select className="select"><option>Todos os status</option></select></div>
    <article className="panel"><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Registro</th><th>Data</th><th>Status</th><th>Pagamento</th><th>Entrega</th><th>Total</th><th>Lucro</th></tr></thead><tbody>
      {sales.map((sale) => <tr key={sale.id}><td><div className="cell-main">{sale.customer_name}</div><div className="cell-sub">Origem {sale.location_code}</div></td><td><Badge value={sale.record_type} /></td><td>{formatDateTime(sale.created_at)}</td><td><Badge value={sale.general_status} /></td><td><Badge value={sale.payment_status} /></td><td><Badge value={sale.delivery_status} /></td><td className="amount">{formatCurrency(sale.total_amount)}</td><td className="amount positive">{formatCurrency(sale.total_profit)}</td></tr>)}
    </tbody></table></div></article></>;
}
