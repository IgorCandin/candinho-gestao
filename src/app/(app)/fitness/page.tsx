import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, PackageOpen, PackageSearch, ShoppingBag, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess, getFitnessDashboard } from "@/lib/data";

export default async function FitnessHomePage(){
  const [access,summary]=await Promise.all([getCurrentUserAccess(),getFitnessDashboard()]);
  if(access.role==="sales") redirect("/fitness/produtos");
  return <>
    <PageHeader eyebrow="Candinho Fitness" title="Início" description="Uma entrada limpa para vender e consultar a operação. Indicadores completos ficam no Painel Gerencial."/>
    <section className="operation-home-hero">
      <Link className="operation-home-primary fitness" href={access.canWriteFitness?"/fitness/vendas/nova":"/fitness/produtos"}><ShoppingBag size={24}/><div><span>Ação principal</span><strong>{access.canWriteFitness?"Nova venda":"Consultar produtos"}</strong><small>{access.canWriteFitness?"Registrar uma venda da Fitness":"Preço e disponibilidade"}</small></div></Link>
      <div className="operation-home-kpis">
        <Link href="/fitness/vendas"><span>Pendências</span><strong>{summary.pending_delivery+summary.pending_payment}</strong><small>{summary.pending_delivery} entregar · {summary.pending_payment} receber</small></Link>
        <Link href="/fitness/estoque"><span>Disponível</span><strong>{summary.available_units}</strong><small>{summary.incoming_units} a caminho</small></Link>
        <Link href="/fitness/pedidos"><span>Pedidos abertos</span><strong>{summary.open_orders}</strong><small>Reposições em andamento</small></Link>
      </div>
    </section>
    <section className="operation-home-actions">
      <Link href="/fitness/vendas"><ShoppingBag size={20}/><div><strong>Comercial</strong><span>Vendas, pagamentos e entregas</span></div></Link>
      <Link href="/fitness/produtos"><PackageSearch size={20}/><div><strong>Produtos</strong><span>Peças e variações</span></div></Link>
      <Link href="/fitness/estoque"><Warehouse size={20}/><div><strong>Estoque</strong><span>Disponível, reservado e a caminho</span></div></Link>
      <Link href="/fitness/painel"><BarChart3 size={20}/><div><strong>Painel Gerencial</strong><span>Indicadores e visão completa</span></div></Link>
    </section>
    {access.canWriteFitness&&<Link className="operation-home-secondary" href="/fitness/pedidos/novo"><PackageOpen size={18}/>Novo pedido de fornecedor</Link>}
  </>;
}
