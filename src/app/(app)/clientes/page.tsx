import { MessageCircle, Plus } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getCustomers } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function CustomersPage() {
  const customers = await getCustomers();
  return <><DemoBanner /><PageHeader eyebrow="Relacionamento" title="Clientes" description="Histórico, recompra e pós-venda organizados sem perder o atendimento humano." action={<button className="button gold"><Plus size={16} />Novo cliente</button>} />
    <article className="panel"><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Cidade</th><th>Telefone</th><th>Compras</th><th>Total gasto</th><th>Última compra</th><th>Ação</th></tr></thead><tbody>
      {customers.map((customer) => <tr key={customer.id}><td><div className="product-cell"><span className="product-avatar">{customer.name.slice(0,2).toUpperCase()}</span><div className="cell-main">{customer.name}</div></div></td><td>{customer.city ?? "—"}</td><td>{customer.phone ?? "—"}</td><td>{customer.purchase_count}</td><td className="amount">{formatCurrency(customer.total_spent)}</td><td>{formatDate(customer.last_purchase_at)}</td><td><button className="button ghost"><MessageCircle size={15} />Chamar</button></td></tr>)}
    </tbody></table></div></article></>;
}
