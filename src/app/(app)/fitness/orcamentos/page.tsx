import Link from "next/link";
import { FileText,Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency,formatDateOnly } from "@/lib/format";

export default async function Page(){
 const access=await getCurrentUserAccess();if(!access.canAccessFitness)redirect("/dashboard");
 const supabase=await createClient();const{data}=await supabase.from("fitness_quotes_overview").select("*").order("created_at",{ascending:false});const rows=(data??[]) as any[];
 return <><PageHeader eyebrow="Candinho Fitness · Comercial" title="Orçamentos" description="Propostas por peça, tamanho e cor. Gere o PDF e converta em venda quando a cliente confirmar." action={access.canWriteFitness?<Link className="button gold" href="/fitness/orcamentos/novo"><Plus size={16}/>Novo orçamento</Link>:undefined}/>
 <article className="panel"><div className="table-wrap"><table><thead><tr><th>#</th><th>Cliente</th><th>Data</th><th>Validade</th><th>Itens</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.quote_number}</td><td><Link className="table-link" href={`/fitness/orcamentos/${r.id}`}>{r.customer_name}</Link><small>{r.product_summary||"—"}</small></td><td>{formatDateOnly(r.quoted_on)}</td><td>{formatDateOnly(r.valid_until)}</td><td>{r.total_units}</td><td>{formatCurrency(r.total_amount)}</td><td>{r.status==="quoted"?"Em orçamento":r.status==="confirmed"?"Convertido":r.status==="lost"?"Perdido":"Cancelado"}</td><td><a className="icon-button" href={`/api/fitness/orcamentos/${r.id}/pdf`} target="_blank" rel="noreferrer" title="Abrir PDF"><FileText size={16}/></a></td></tr>)}{rows.length===0&&<tr><td colSpan={8}>Nenhum orçamento Fitness registrado.</td></tr>}</tbody></table></div></article></>
}
