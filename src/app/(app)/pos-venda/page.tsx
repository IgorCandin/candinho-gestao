import Link from "next/link";
import { Bot,MessageSquareText } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency,formatDateOnly } from "@/lib/format";

export default async function Page(){
 const access=await getCurrentUserAccess();if(!access.canAccessSupplements)redirect("/dashboard");const supabase=await createClient();
 const[{data:summary},{data:rows}]=await Promise.all([supabase.from("post_sale_batch_summary").select("*").maybeSingle(),supabase.from("post_sale_batch_overview").select("*").order("status").order("due_on")]);
 const list=(rows??[]) as any[];
 return <><PageHeader eyebrow="Candinho Suplementos · Relacionamento" title="Pós-venda" description="Um acompanhamento por cliente e janela de compras. Compras próximas são reunidas para você falar com a pessoa uma única vez, com contexto completo."/>
 <section className="operation-home-kpis"><div><span>Em aberto</span><strong>{Number(summary?.open_count??0)}</strong><small>Acompanhamentos consolidados</small></div><div><span>Vencidos</span><strong>{Number(summary?.overdue_count??0)}</strong><small>Precisam de atenção</small></div><div><span>Hoje</span><strong>{Number(summary?.today_count??0)}</strong><small>Contatos previstos para hoje</small></div><div><span>Próximos 7 dias</span><strong>{Number(summary?.next_seven_days_count??0)}</strong><small>Agenda futura</small></div></section>
 <article className="panel"><div className="panel-head"><div><h2><MessageSquareText size={18}/> Acompanhamentos</h2><p>O Nexus fica disponível dentro de cada cliente.</p></div></div><div className="table-wrap"><table><thead><tr><th>Data</th><th>Cliente</th><th>Compras agrupadas</th><th>Produtos</th><th>Valor</th><th>Nexus</th><th>Status</th></tr></thead><tbody>{list.map(r=><tr key={r.id}><td>{formatDateOnly(r.due_on)}</td><td><Link className="table-link" href={`/pos-venda/${r.id}`}>{r.customer_name}</Link><small>{r.customer_phone||r.city||"—"}</small></td><td>{r.sale_count}</td><td>{r.product_summary||"—"}</td><td>{formatCurrency(r.total_amount)}</td><td>{r.ai_last_message?<span title="Mensagem já gerada"><Bot size={16}/></span>:"—"}</td><td>{r.status==="planned"?"Planejado":r.status==="completed"?"Concluído":"Cancelado"}</td></tr>)}{list.length===0&&<tr><td colSpan={7}>Nenhum pós-venda encontrado.</td></tr>}</tbody></table></div></article></>
}
