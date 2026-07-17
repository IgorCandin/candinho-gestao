import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, BarChart3, ClipboardClock, PackageSearch, ShoppingBag, UserRoundSearch } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess, getDashboard } from "@/lib/data";

export default async function SupplementsHomePage(){
  const access=await getCurrentUserAccess();
  if(access.role==="sales") redirect("/produtos");
  const data=await getDashboard();
  return <>
    <DemoBanner/>
    <PageHeader eyebrow="Candinho Suplementos" title="Início" description="O essencial para começar o dia sem poluição. O detalhamento completo continua no Painel Gerencial."/>
    <section className="operation-home-hero">
      <Link className="operation-home-primary" href="/vendas/nova"><ShoppingBag size={24}/><div><span>Ação principal</span><strong>Novo orçamento / venda</strong><small>Registrar atendimento e fechar venda</small></div></Link>
      <div className="operation-home-kpis">
        <Link href="/pedidos-pendentes"><span>Pendências</span><strong>{data.pendingOrdersCount}</strong><small>{data.pendingDeliveryCount} entregar · {data.pendingPaymentCount} receber</small></Link>
        <Link href="/leads"><span>Leads para retomar</span><strong>{data.operational.stale_leads_count}</strong><small>{data.operational.open_leads_count} abertos</small></Link>
        <Link href="/estoque"><span>Estoque em atenção</span><strong>{data.operational.stock_attention_products}</strong><small>{data.operational.out_of_stock_products} zerados</small></Link>
      </div>
    </section>
    <section className="operation-home-actions">
      <Link href="/pedidos-pendentes"><ClipboardClock size={20}/><div><strong>Pedidos pendentes</strong><span>Cobrar, receber e entregar</span></div></Link>
      <Link href="/produtos"><PackageSearch size={20}/><div><strong>Produtos</strong><span>Preço, estoque e disponibilidade</span></div></Link>
      <Link href="/leads"><UserRoundSearch size={20}/><div><strong>Leads</strong><span>Retomar oportunidades</span></div></Link>
      <Link href="/suplementos/painel"><BarChart3 size={20}/><div><strong>Painel Gerencial</strong><span>Indicadores, prioridades e análise completa</span></div></Link>
    </section>
    {(data.operational.overdue_payment_count>0||data.operational.out_of_stock_products>0)&&<article className="operation-home-alert"><AlertTriangle size={18}/><div><strong>Atenção hoje</strong><span>{data.operational.overdue_payment_count} pagamento(s) vencido(s) · {data.operational.out_of_stock_products} produto(s) zerado(s)</span></div></article>}
  </>;
}
