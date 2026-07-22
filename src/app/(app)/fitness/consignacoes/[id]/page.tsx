import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FitnessConsignmentSettlementForm } from "@/components/fitness-consignment-settlement-form";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency,formatDateOnly } from "@/lib/format";

export default async function Page({params}:{params:Promise<{id:string}>}){
 const access=await getCurrentUserAccess();if(!access.canAccessFitness)redirect("/dashboard");
 const{id}=await params;const supabase=await createClient();
 const[{data:c},{data:items}]=await Promise.all([supabase.from("fitness_consignments_overview").select("*").eq("id",id).maybeSingle(),supabase.from("fitness_consignment_items_overview").select("*").eq("consignment_id",id).order("created_at")]);
 if(!c)notFound();const rows=(items??[]) as any[];
 return <><PageHeader eyebrow="Candinho Fitness · Consignações" title={`Prova · ${c.customer_name}`} description={`${formatDateOnly(c.started_on)} · ${c.units_outstanding} peça(s) ainda com a cliente`} action={<Link className="button ghost" href="/fitness/consignacoes">Voltar</Link>}/>
 <section className="operation-home-kpis"><div><span>Status</span><strong>{c.status==="open"?"Em prova":c.status==="closed"?"Finalizada":c.status==="cancelled"?"Cancelada":"Parcial"}</strong><small>{c.expected_return_on?`Acerto previsto ${formatDateOnly(c.expected_return_on)}`:"Sem data prevista"}</small></div><div><span>Peças enviadas</span><strong>{c.units_sent}</strong><small>{c.units_returned} devolvidas · {c.units_sold} vendidas</small></div><div><span>Potencial em aberto</span><strong>{formatCurrency(c.outstanding_value)}</strong><small>{c.responsible||"Sem responsável informado"}</small></div></section>
 <article className="panel"><div className="panel-head"><div><h2>Peças</h2><p>{c.product_summary}</p></div></div><div className="table-wrap"><table><thead><tr><th>Produto</th><th>Levou</th><th>Devolveu</th><th>Ficou</th><th>Em prova</th><th>Preço</th></tr></thead><tbody>{rows.map(i=><tr key={i.id}><td>{i.product_name}<small>{i.size} · {i.color}</small></td><td>{i.quantity_sent}</td><td>{i.quantity_returned}</td><td>{i.quantity_sold}</td><td>{i.quantity_outstanding}</td><td>{formatCurrency(i.unit_price)}</td></tr>)}</tbody></table></div></article>
 {c.notes&&<article className="panel"><div className="panel-body"><strong>Observações</strong><p>{c.notes}</p></div></article>}
 {access.canWriteFitness&&["open","partial"].includes(c.status)&&<FitnessConsignmentSettlementForm id={id} items={rows.filter(i=>i.quantity_outstanding>0).map(i=>({id:i.id,product_name:i.product_name,size:i.size,color:i.color,quantity_outstanding:Number(i.quantity_outstanding),unit_price:Number(i.unit_price)}))}/>}
 {c.sale_id&&<p><Link className="button gold" href={`/fitness/vendas/${c.sale_id}`}>Abrir venda gerada no acerto</Link></p>}
 </>
}
