import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getFitnessCustomer, getFitnessSales } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CompanyFitnessCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, sales] = await Promise.all([getFitnessCustomer(id), getFitnessSales()]);
  if (!customer) notFound();
  const customerSales = sales.filter((sale) => sale.customer_id === id);
  return <><PageHeader eyebrow="Company · Ficha de Clientes · Fitness" title={customer.name} description={[customer.city, customer.phone, customer.instagram].filter(Boolean).join(" · ") || "Cliente Fitness"} action={<Link className="button gold" href={`/company/clientes/fitness/${id}/editar`}>Editar dados</Link>}/><section className="stats-grid"><div className="stat-card"><span>Compras</span><strong>{customer.total_purchases}</strong><small>Histórico concluído</small></div><div className="stat-card"><span>Total comprado</span><strong>{formatCurrency(customer.total_spent)}</strong><small>{customer.classification}</small></div><div className="stat-card"><span>Última compra</span><strong>{customer.last_purchase_on ? formatDateOnly(customer.last_purchase_on) : "—"}</strong><small>{customer.days_without_purchase === null ? "Sem histórico" : `${customer.days_without_purchase} dia(s)`}</small></div></section><article className="panel"><div className="panel-head"><div><h2>Histórico Fitness</h2><p>{customer.notes || "Sem observações."}</p></div></div><div className="table-wrap"><table><thead><tr><th>Data</th><th>Produtos</th><th>Situação</th><th>Total</th></tr></thead><tbody>{customerSales.map((sale) => <tr key={sale.id}><td><Link className="table-link" href={`/company/concluir/fitness/${sale.id}`}>{formatDateOnly(sale.quoted_on)}</Link></td><td>{sale.product_summary}</td><td>{sale.status_label}</td><td>{formatCurrency(sale.total_amount)}</td></tr>)}{customerSales.length === 0 ? <tr><td colSpan={4}>Nenhuma venda para este cliente.</td></tr> : null}</tbody></table></div></article></>;
}
