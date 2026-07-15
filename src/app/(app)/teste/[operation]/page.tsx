import Link from "next/link";
import { FlaskConical, PackageOpen, ShoppingBag, Warehouse } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TestLabReset } from "@/components/test-lab-reset";
import { getCurrentUserAccess, getTestLabDashboard, getTestLabPurchaseOrders, getTestLabSales } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { parseTestLabOperation, testLabOperationLabel } from "@/lib/test-lab";

export default async function TestLabHome({params}:{params:Promise<{operation:string}>}){
 const {operation:raw}=await params;const operation=parseTestLabOperation(raw);if(!operation)notFound();
 const access=await getCurrentUserAccess();if(!access.canManageUsers)redirect("/dashboard");
 const [summary,sales,orders]=await Promise.all([getTestLabDashboard(operation),getTestLabSales(operation),getTestLabPurchaseOrders(operation)]);
 const label=testLabOperationLabel(operation);
 return <>
  <div className="test-lab-banner"><FlaskConical size={18}/><div><strong>AMBIENTE DE TESTE</strong><span>Dados 100% isolados da operação real de {label}. Pode vender, cancelar, receber e resetar sem afetar faturamento ou estoque oficial.</span></div></div>
  <PageHeader eyebrow={`Área de Teste · ${label}`} title="Visão geral" description="Use este laboratório para validar os fluxos críticos antes de liberar mudanças na operação real." action={<TestLabReset operation={operation}/>}/>
  <section className="stats-grid">
   <StatCard icon={ShoppingBag} label="Vendas teste" value={String(summary.sales_count)} note={`${summary.pending_payment_count} a receber · ${summary.pending_delivery_count} a entregar`}/>
   <StatCard icon={Warehouse} label="Estoque disponível" value={String(summary.available_units)} note={`${summary.reserved_units} reservadas · ${summary.incoming_units} a caminho`}/>
   <StatCard icon={PackageOpen} label="Pedidos abertos" value={String(summary.open_orders)} note="Somente pedidos fictícios"/>
   <StatCard icon={FlaskConical} label="Resultado simulado" value={formatCurrency(summary.profit)} note={`${formatCurrency(summary.revenue)} em vendas fictícias`}/>
  </section>
  <section className="test-lab-quick-grid">
   <Link className="dashboard-action-card" href={`/teste/${operation}/vendas/nova`}><span className="dashboard-action-icon orange"><ShoppingBag size={20}/></span><div><span>Nova venda teste</span><strong>Testar</strong><small>Reserva, pagamento, entrega e cancelamento</small></div></Link>
   <Link className="dashboard-action-card" href={`/teste/${operation}/estoque`}><span className="dashboard-action-icon blue"><Warehouse size={20}/></span><div><span>Estoque teste</span><strong>{summary.available_units}</strong><small>Ver físico, reservado e a caminho</small></div></Link>
   <Link className="dashboard-action-card" href={`/teste/${operation}/pedidos/novo`}><span className="dashboard-action-icon blue"><PackageOpen size={20}/></span><div><span>Novo pedido teste</span><strong>Repor</strong><small>Validar recebimento parcial e reserva</small></div></Link>
  </section>
  <section className="dashboard-two-column">
   <article className="panel"><div className="panel-head"><div><h2>Vendas teste recentes</h2><p>Últimos cenários executados.</p></div><Link className="button ghost" href={`/teste/${operation}/vendas`}>Ver todas</Link></div><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Produtos</th><th>Status</th><th>Total</th></tr></thead><tbody>{sales.slice(0,5).map((sale: (typeof sales)[number])=><tr key={sale.id}><td><Link className="table-link" href={`/teste/${operation}/vendas/${sale.id}`}>{sale.customer_name}</Link><small>{formatDateOnly(sale.quoted_on)}</small></td><td>{sale.product_summary}</td><td>{sale.general_status}</td><td>{formatCurrency(sale.total_amount)}</td></tr>)}{sales.length===0&&<tr><td colSpan={4}>Nenhuma venda teste ainda.</td></tr>}</tbody></table></div></article>
   <article className="panel"><div className="panel-head"><div><h2>Pedidos teste recentes</h2><p>Reposições fictícias.</p></div><Link className="button ghost" href={`/teste/${operation}/pedidos`}>Ver todos</Link></div><div className="table-wrap"><table><thead><tr><th>Fornecedor</th><th>Itens</th><th>Pendente</th><th>Status</th></tr></thead><tbody>{orders.slice(0,5).map((order: (typeof orders)[number])=><tr key={order.id}><td><Link className="table-link" href={`/teste/${operation}/pedidos/${order.id}`}>{order.supplier_name}</Link></td><td>{order.product_summary}</td><td>{order.pending_units}</td><td>{order.status}</td></tr>)}{orders.length===0&&<tr><td colSpan={4}>Nenhum pedido teste ainda.</td></tr>}</tbody></table></div></article>
  </section>
 </>;
}
