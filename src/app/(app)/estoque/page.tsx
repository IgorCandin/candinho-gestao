import { ArrowRightLeft, SlidersHorizontal } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getStock } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default async function StockPage() {
  const stock = await getStock();
  return <><DemoBanner /><PageHeader eyebrow="Logística" title="Estoque por local" description="Saldo disponível em cada ponto, com alertas de mínimo e valor parado." action={<button className="button gold"><ArrowRightLeft size={16} />Transferir estoque</button>} />
    <div className="filters"><select className="select"><option>Todos os locais</option></select><select className="select"><option>Todos os status</option><option>Zerados</option><option>Abaixo do mínimo</option></select><button className="button ghost"><SlidersHorizontal size={16} />Filtros</button></div>
    <article className="panel"><div className="table-wrap"><table><thead><tr><th>Produto</th><th>Local</th><th>Saldo</th><th>Mínimo</th><th>Valor de custo</th><th>Potencial de venda</th><th>Situação</th></tr></thead><tbody>
      {stock.map((row) => { const status = row.quantity === 0 ? ["red","Zerado"] : row.quantity <= row.min_stock ? ["orange","Repor"] : ["green","Saudável"]; return <tr key={`${row.product_id}-${row.location_id}`}><td><div className="product-cell"><span className="product-avatar">{row.product_name.slice(0,2).toUpperCase()}</span><div><div className="cell-main">{row.product_name}</div><div className="cell-sub">{row.category}</div></div></div></td><td><div className="cell-main">{row.location_code}</div><div className="cell-sub">{row.location_name}</div></td><td className="amount">{row.quantity}</td><td>{row.min_stock}</td><td>{formatCurrency(row.stock_cost_value)}</td><td>{formatCurrency(row.stock_sale_value)}</td><td><span className={`badge ${status[0]}`}><span className="dot" />{status[1]}</span></td></tr> })}
    </tbody></table></div></article></>;
}
