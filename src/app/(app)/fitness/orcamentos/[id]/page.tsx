import Link from "next/link";
import { FileText } from "lucide-react";
import { notFound,redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FitnessQuoteConvertForm } from "@/components/fitness-quote-convert-form";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency,formatDateOnly } from "@/lib/format";

export default async function Page({params}:{params:Promise<{id:string}>}){
 const access=await getCurrentUserAccess();if(!access.canAccessFitness)redirect("/dashboard");const{id}=await params;const supabase=await createClient();
 const[{data:q},{data:items}]=await Promise.all([supabase.from("fitness_quotes_overview").select("*").eq("id",id).maybeSingle(),supabase.from("fitness_quote_items_overview").select("*").eq("quote_id",id).order("created_at")]);
 if(!q)notFound();const rows=(items??[]) as any[];
 return <><PageHeader eyebrow="Candinho Fitness · Orçamentos" title={`Orçamento #${q.quote_number}`} description={`${q.customer_name} · válido até ${formatDateOnly(q.valid_until)}`} action={<a className="button gold" href={`/api/fitness/orcamentos/${id}/pdf`} target="_blank" rel="noreferrer"><FileText size={16}/>Abrir PDF</a>}/>
 <section className="operation-home-kpis"><div><span>Status</span><strong>{q.status==="quoted"?"Em orçamento":q.status==="confirmed"?"Convertido":q.status==="lost"?"Perdido":"Cancelado"}</strong><small>{formatDateOnly(q.quoted_on)}</small></div><div><span>Itens</span><strong>{q.total_units}</strong><small>{q.item_count} variação(ões)</small></div><div><span>Total</span><strong>{formatCurrency(q.total_amount)}</strong><small>Desconto {formatCurrency(q.discount_amount)}</small></div></section>
 <article className="panel"><div className="table-wrap"><table><thead><tr><th>Produto</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>{rows.map(i=><tr key={i.id}><td>{i.product_name}<small>{i.size} · {i.color}</small></td><td>{i.quantity}</td><td>{formatCurrency(i.unit_price)}</td><td>{formatCurrency(i.total_price)}</td></tr>)}</tbody></table></div></article>
 {q.notes&&<article className="panel"><div className="panel-body"><strong>Observações</strong><p>{q.notes}</p></div></article>}
 {access.canWriteFitness&&q.status==="quoted"&&<FitnessQuoteConvertForm id={id}/>}
 {q.sale_id&&<p><Link className="button gold" href={`/fitness/vendas/${q.sale_id}`}>Abrir venda convertida</Link></p>}
 </>
}
