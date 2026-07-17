import Link from "next/link";
import { ArrowLeft, CircleDollarSign, Gift, Handshake, Link2, TriangleAlert } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getPartnersOverview, getUnassignedPartnershipSales } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export default async function PartnerManagementPage(){
  const [partners,unassigned]=await Promise.all([getPartnersOverview(),getUnassignedPartnershipSales()]);
  const active=partners.filter((p)=>p.active&&p.status!=="Pausado");
  const pending=partners.filter((p)=>p.settlement_pending);
  const sales=partners.reduce((sum,p)=>sum+p.current_cycle_sales_count,0);
  const revenue=partners.reduce((sum,p)=>sum+p.current_cycle_revenue,0);
  const incomplete=partners.filter((p)=>!p.phone||!p.city||!p.contact_name).length;
  return <>
    <DemoBanner/>
    <PageHeader eyebrow="Parceiros" title="Área Gerencial" description="Indicadores internos, qualidade dos cadastros e vendas antigas que ainda precisam de vínculo." action={<Link className="button ghost" href="/parceiros"><ArrowLeft size={16}/>Voltar aos parceiros</Link>}/>
    <section className="stats-grid partner-stats-grid">
      <StatCard href="/parceiros" label="Parceiros ativos" value={String(active.length)} note={`${partners.length} cadastrados`} icon={Handshake}/>
      <StatCard href="/parceiros" label="Acertos pendentes" value={String(pending.length)} note="Metas ou movimentos a revisar" icon={Gift}/>
      <StatCard href="/parceiros" label="Vendas atribuídas" value={String(sales)} note={formatCurrency(revenue)} icon={CircleDollarSign}/>
      <StatCard href="/parceiros/gerencial" label="Vendas sem vínculo" value={String(unassigned.length)} note="Legado para revisar" icon={Link2}/>
      <StatCard href="/parceiros/gerencial" label="Cadastros incompletos" value={String(incomplete)} note="Sem telefone, cidade ou contato" icon={TriangleAlert}/>
    </section>
    {unassigned.length>0?<article className="panel"><div className="panel-head"><div><h2>Vendas antigas sem vínculo</h2><p>Abra a venda ou o parceiro sugerido para revisar a atribuição.</p></div><strong>{unassigned.length}</strong></div><div className="table-wrap"><table className="table"><thead><tr><th>Cliente</th><th>Data</th><th>Origem</th><th>Sugestão</th><th>Valor</th></tr></thead><tbody>{unassigned.map((sale)=><tr key={sale.id}><td><Link className="table-link" href={`/vendas/${sale.id}`}>{sale.customer_name}</Link></td><td>{formatDateOnly(sale.sale_date)}</td><td>{sale.location_code}</td><td>{sale.suggested_partner_id?<Link className="table-link" href={`/parceiros/${sale.suggested_partner_id}`}>{sale.suggested_partner_name}</Link>:"—"}</td><td>{formatCurrency(sale.total_amount)}</td></tr>)}</tbody></table></div></article>:<article className="panel"><div className="empty"><Link2 size={25}/><strong>Nenhuma parceria antiga sem vínculo</strong>Todos os registros marcados como parceria já possuem parceiro associado.</div></article>}
  </>;
}
