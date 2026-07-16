/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText, ImageIcon, MessageSquareText, Phone, ShoppingBag, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getLeadDetails } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";

function Line({label,value}:{label:string;value:React.ReactNode}){if(value==null||value===""||value==="—")return null;return <div className="sale-detail-line"><span>{label}</span><strong>{value}</strong></div>}

export default async function LeadDetailsPage({params}:{params:Promise<{id:string}>}){
  const{id}=await params;
  const lead=await getLeadDetails(id);
  if(!lead)notFound();
  const action=<div className="page-header-actions">
    {lead.quote_id&&<a className="button gold" href={`/api/orcamentos/${lead.quote_id}/pdf`} target="_blank" rel="noreferrer"><FileText size={16}/>Abrir PDF</a>}
    {lead.quote_id&&lead.quote_status==="quoted"&&<Link className="button gold" href={`/vendas/nova?quote=${lead.quote_id}`}><ShoppingBag size={16}/>Confirmar orçamento</Link>}
    {lead.quote_sale_id&&<Link className="button gold" href={`/vendas/${lead.quote_sale_id}`}><ShoppingBag size={16}/>Ver venda</Link>}
    <Link className="button ghost" href="/leads"><ArrowLeft size={16}/>Voltar</Link>
  </div>;
  return <>
    <DemoBanner/>
    <PageHeader eyebrow="Lead" title={lead.customer_name} description="Informações do contato comercial e orçamento vinculado." action={action}/>
    <section className="lead-details-layout">
      <div className="lead-details-main">
        {lead.quote_id&&<article className="panel"><div className="panel-head"><div><h2>Orçamento #{lead.quote_number}</h2><p>Cotação gerada a partir do fluxo Novo Orçamento.</p></div><FileText size={19}/></div><div className="panel-body sale-detail-list"><Line label="Valor do orçamento" value={lead.quote_total_amount==null?null:formatCurrency(lead.quote_total_amount)}/><Line label="Situação" value={<Badge value={lead.quote_status??"quoted"}/>}/></div></article>}
        <article className="panel"><div className="panel-head"><div><h2>Produtos de interesse</h2><p>Todos os itens vinculados a este lead e ao orçamento.</p></div><strong>{lead.items.length}</strong></div><div className="panel-body lead-product-list">{lead.items.length>0?lead.items.map((item)=><div className="lead-product-card" key={item.id}><div className="sale-item-image">{item.product_image_url?<img src={item.product_image_url} alt={item.product_name}/>:<ImageIcon size={30}/>}</div><div><Link className="cell-main table-link" href={`/produtos/${item.product_id}`}>{item.product_name}</Link><span>{[item.category,item.brand].filter(Boolean).join(" · ")||"Produto cadastrado"}</span><small>Quantidade: {item.quantity}</small></div></div>):<div className="empty compact"><strong>Nenhum produto vinculado</strong>Revise o cadastro deste lead.</div>}</div></article>
        {lead.notes&&<article className="panel"><div className="panel-head"><div><h2>Observações</h2><p>Contexto do atendimento</p></div><MessageSquareText size={19}/></div><div className="panel-body"><p className="sale-notes">{lead.notes}</p></div></article>}
      </div>
      <aside className="sale-details-side">
        <article className="panel"><div className="panel-head"><div><h2>Situação</h2><p>Etapa atual</p></div><CalendarDays size={19}/></div><div className="panel-body sale-detail-list"><Line label="Data do orçamento" value={formatDate(lead.lead_at)}/><Line label="Status" value={<Badge value={lead.lead_status??lead.general_status}/>}/></div></article>
        <article className="panel"><div className="panel-head"><div><h2>Cliente</h2><p>Dados disponíveis</p></div><UserRound size={19}/></div><div className="panel-body sale-detail-list"><Line label="Nome" value={lead.customer_id?<Link className="table-link" href={`/clientes/${lead.customer_id}`}>{lead.customer_name}</Link>:lead.customer_name}/><Line label="Telefone" value={lead.phone?<span className="detail-with-icon"><Phone size={14}/>{lead.phone}</span>:null}/><Line label="Cidade" value={lead.city}/><Line label="Referência" value={lead.reference}/></div></article>
      </aside>
    </section>
  </>;
}
