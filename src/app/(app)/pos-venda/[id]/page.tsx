import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PostSaleNexusCard } from "@/components/post-sale-nexus-card";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency,formatDateOnly } from "@/lib/format";

export default async function Page({params}:{params:Promise<{id:string}>}){
 const access=await getCurrentUserAccess();if(!access.canAccessSupplements)redirect("/dashboard");const{id}=await params;const supabase=await createClient();
 const{data:batch}=await supabase.from("post_sale_batch_overview").select("*").eq("id",id).maybeSingle();if(!batch)notFound();
 const{data:links}=await supabase.from("post_sale_batch_sales").select("sale_id").eq("batch_id",id);const ids=(links??[]).map((x:any)=>x.sale_id);
 const{data:sales}=ids.length?await supabase.from("sales").select("id,quoted_at,delivered_at,total_amount,notes,sale_items(quantity,unit_price,products(name,category))").in("id",ids).order("quoted_at",{ascending:false}):{data:[]};
 const{data:interactions}=await supabase.from("customer_interactions").select("interaction_type,contact_on,outcome,notes").eq("customer_id",batch.customer_id).order("contact_on",{ascending:false}).limit(8);
 return <><PageHeader eyebrow="Candinho Suplementos · Pós-venda" title={batch.customer_name} description={`${batch.sale_count} compra(s) reunida(s) · contato previsto para ${formatDateOnly(batch.due_on)}`} action={<Link className="button ghost" href="/pos-venda">Voltar</Link>}/>
 <section className="operation-home-kpis"><div><span>Compras agrupadas</span><strong>{batch.sale_count}</strong><small>{batch.product_summary}</small></div><div><span>Total comprado</span><strong>{formatCurrency(batch.total_amount)}</strong><small>Janela atual de acompanhamento</small></div><div><span>Contato</span><strong>{formatDateOnly(batch.due_on)}</strong><small>{batch.customer_phone||"Sem telefone cadastrado"}</small></div></section>
 <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.2fr) minmax(300px,.8fr)",gap:16,alignItems:"start"}}>
  <div style={{display:"grid",gap:16}}>
   <article className="panel"><div className="panel-head"><div><h2>Compras deste pós-venda</h2></div></div><div className="panel-body">{(sales??[]).map((s:any)=><div key={s.id} style={{padding:"12px 0",borderBottom:"1px solid var(--border)"}}><strong>{formatDateOnly(s.delivered_at||s.quoted_at)} · {formatCurrency(s.total_amount)}</strong><p>{(s.sale_items??[]).map((i:any)=>`${i.products?.name??"Produto"}${i.quantity>1?` ×${i.quantity}`:""}`).join(", ")}</p>{s.notes&&<small>{s.notes}</small>}</div>)}</div></article>
   <article className="panel"><div className="panel-head"><div><h2>Últimas interações</h2></div></div><div className="panel-body">{(interactions??[]).map((i:any,index)=><div key={`${i.contact_on}-${index}`} style={{padding:"10px 0",borderBottom:"1px solid var(--border)"}}><strong>{formatDateOnly(i.contact_on)} · {i.outcome||i.interaction_type}</strong>{i.notes&&<p>{i.notes}</p>}</div>)}{!(interactions??[]).length&&<p>Sem interações anteriores registradas.</p>}</div></article>
  </div>
  <PostSaleNexusCard batchId={id} phone={batch.customer_phone} initialMessage={batch.ai_last_message} initialMeta={batch.ai_metadata} status={batch.status} dueOn={batch.due_on}/>
 </div></>
}
