import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, BarChart3, Boxes, CalendarClock, ClipboardCheck, Handshake, MessageSquareText, PackageSearch, Radar, ShoppingBag, Truck, UserRoundPlus } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { OperationInvestmentPanel } from "@/components/operation-investment-panel";
import { getOperationInvestmentSnapshot } from "@/lib/bank-data";
import { getCurrentUserAccess, getCustomerOpportunityRadarSummary, getDashboard } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function SupplementsHomePage() {
  const access = await getCurrentUserAccess();
  if (access.role === "sales") redirect("/produtos");

  const [data, investment, radar] = await Promise.all([
    getDashboard(),
    getOperationInvestmentSnapshot(),
    getCustomerOpportunityRadarSummary(),
  ]);
  const supabase = await createClient();
  const [{ data: postSale }, quoteResult] = await Promise.all([
    supabase.from("post_sale_batch_summary").select("*").maybeSingle(),
    supabase.from("sales_quotes").select("id", { count: "exact", head: true }).eq("status", "quoted"),
  ]);

  const quoteCount = quoteResult.count ?? 0;
  const todayActions = data.agendaToday.slice(0, 6);
  const urgentCount = data.agendaSummary.today_count + data.agendaSummary.overdue_count + data.operational.stale_leads_count + quoteCount;

  return <>
    <DemoBanner />

    <section className="operation-home-hero operation-home-no-heading">
      <Link className="operation-home-primary" href="/agenda">
        <CalendarClock size={24}/>
        <div><span>Hoje</span><strong>O que eu preciso fazer agora?</strong><small>{urgentCount} sinal(is) entre agenda, leads antigos, orçamentos e cobranças</small></div>
      </Link>
      <div className="operation-home-kpis">
        <Link href="/leads"><span>Leads para retomar</span><strong>{data.operational.stale_leads_count}</strong><small>{data.operational.open_leads_count} leads abertos</small></Link>
        <Link href="/orcamentos"><span>Orçamentos aguardando</span><strong>{quoteCount}</strong><small>aguardando conversão</small></Link>
        <Link href="/pedidos-pendentes"><span>Pedidos pendentes</span><strong>{data.pendingOrdersCount}</strong><small>{data.pendingPaymentCount} receber · {data.pendingDeliveryCount} entregar</small></Link>
        <Link href="/pos-venda"><span>Pós-venda</span><strong>{Number(postSale?.today_count ?? 0) + Number(postSale?.overdue_count ?? 0)}</strong><small>{Number(postSale?.overdue_count ?? 0)} atrasado(s) · {Number(postSale?.today_count ?? 0)} hoje</small></Link>
        <Link href="/estoque"><span>Estoque em atenção</span><strong>{data.operational.stock_attention_products}</strong><small>{data.operational.out_of_stock_products} zerado(s)</small></Link>
      </div>
    </section>

    <article className="panel">
      <div className="panel-head"><div><h2>Faça primeiro</h2><p>Ações com data vencida ou marcada para hoje. A origem continua no módulo correto; aqui você só ganha o atalho.</p></div><Link className="button ghost compact-button" href="/agenda">Abrir agenda</Link></div>
      {todayActions.length===0?<div className="empty compact"><ClipboardCheck size={25}/><strong>Nenhuma tarefa datada pendente agora</strong>Use as pendências abaixo para decidir a próxima ação comercial ou operacional.</div>:<div className="dashboard-agenda-list">{todayActions.map((item)=><Link href={item.href || "/agenda"} key={item.event_key}><span className={`badge ${item.priority === "urgent" ? "red" : item.priority === "attention" ? "orange" : "gray"}`}>{item.category}</span><div><strong>{item.title}</strong><small>{item.subtitle || "Ação operacional"}</small></div><b>{item.due_date}</b></Link>)}</div>}
    </article>

    <section className="operation-home-actions">
      <Link href="/leads/novo"><UserRoundPlus size={20}/><div><strong>Novo lead</strong><span>Registrar uma oportunidade sem perder o próximo contato</span></div></Link>
      <Link href="/vendas/nova"><ShoppingBag size={20}/><div><strong>Novo orçamento / venda</strong><span>Atender, orçar e converter dentro do fluxo comercial</span></div></Link>
      <Link href="/clientes"><MessageSquareText size={20}/><div><strong>CRM e relacionamento</strong><span>Retornos, pós-venda e histórico do cliente</span></div></Link>
      <Link href="/clientes/radar"><Radar size={20}/><div><strong>Radar de oportunidades</strong><span>Recompra, reativação e clientes prováveis</span></div></Link>
      <Link href="/estoque"><Boxes size={20}/><div><strong>Estoque e compras</strong><span>Saldo, rupturas, movimentações e atenção operacional</span></div></Link>
      <Link href="/pedidos-fornecedor/planejamento"><Truck size={20}/><div><strong>Planejar compras</strong><span>Giro, cobertura e produtos que precisam de reposição</span></div></Link>
      <Link href="/produtos"><PackageSearch size={20}/><div><strong>Produtos e catálogo</strong><span>Cadastro, consulta, sabores e materiais comerciais</span></div></Link>
      <Link href="/parceiros"><Handshake size={20}/><div><strong>Parceiros</strong><span>Rede, estoque nos pontos, acessos e acertos</span></div></Link>
    </section>

    {(data.operational.overdue_payment_count>0 || data.operational.supplier_orders_open_count>0 || data.operational.out_of_stock_products>0) && <article className="operation-home-alert"><AlertTriangle size={18}/><div><strong>Pendências operacionais</strong><span>{data.operational.overdue_payment_count} cobrança(s) vencida(s) · {data.operational.supplier_orders_open_count} pedido(s) de fornecedor aberto(s) · {data.operational.out_of_stock_products} ruptura(s)</span></div></article>}

    <article className="panel"><div className="panel-head"><div><h2>Gestão, não urgência</h2><p>Faturamento, lucro e indicadores continuam disponíveis, mas não competem com o que precisa ser feito hoje.</p></div><Link className="button ghost" href="/suplementos/painel"><BarChart3 size={16}/> Painel Gerencial</Link></div><div className="panel-body"><p className="form-help">Possíveis clientes no Radar: <strong>{radar.possible_customers}</strong> · Alta prioridade: <strong>{radar.high_priority}</strong> · A receber: <strong>{data.operational.pending_payment_count}</strong> venda(s).</p></div></article>

    <OperationInvestmentPanel data={investment} only="supplements" compact />
  </>;
}
