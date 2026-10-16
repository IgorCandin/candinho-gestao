import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency,formatDateOnly } from "@/lib/format";

export default async function Page({companyMode=false}:{companyMode?:boolean}={}){
 const base=companyMode?"/company/fitness/consignacoes":"/fitness/consignacoes";
 const access=await getCurrentUserAccess();if(!access.canAccessFitness)redirect("/dashboard");
 const supabase=await createClient();
 const{data,error}=await supabase.from("fitness_consignments_overview").select("*").order("created_at",{ascending:false});
 if(error)throw error;
 const rows=(data??[]) as Array<{id:string;customer_name:string;product_summary:string|null;started_on:string;expected_return_on:string|null;units_outstanding:number;outstanding_value:number;status:string}>;
 return <><PageHeader eyebrow="Candinho Fitness · Comercial" title="Consignações / Provas" description="Controle das peças que estão com clientes para experimentar. Enquanto estiverem em prova, saem da disponibilidade comercial." action={access.canWriteFitness?<Link className="button gold" href={`${base}/nova`}><Plus size={16}/>Nova consignação</Link>:undefined}/>
 <article className="panel"><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Saída</th><th>Previsão</th><th>Peças fora</th><th>Valor potencial</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><Link className="table-link" href={`${base}/${r.id}`}>{r.customer_name}</Link><small>{r.product_summary||"—"}</small></td><td>{formatDateOnly(r.started_on)}</td><td>{r.expected_return_on?formatDateOnly(r.expected_return_on):"—"}</td><td>{r.units_outstanding}</td><td>{formatCurrency(r.outstanding_value)}</td><td>{r.status==="open"?"Em prova":r.status==="partial"?"Acerto parcial":r.status==="closed"?"Finalizada":"Cancelada"}</td></tr>)}{rows.length===0&&<tr><td colSpan={6}>Nenhuma consignação registrada.</td></tr>}</tbody></table></div></article></>
}
