"use client";
import Link from "next/link";
import { LoaderCircle, Save, UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CustomerOption, ProductOption } from "@/lib/types";
const STATUSES=["Perguntou sobre","Decidindo","Está quase comprando","Esperando receber","Esperando pedido de fornecedor","Cotação","Aguardando"] as const;
export function NewLeadForm({customers,products}:{customers:CustomerOption[];products:ProductOption[]}){
 const router=useRouter(); const[customerId,setCustomerId]=useState(""); const[productId,setProductId]=useState(""); const[status,setStatus]=useState<(typeof STATUSES)[number]>("Perguntou sobre"); const[notes,setNotes]=useState(""); const[loading,setLoading]=useState(false); const[message,setMessage]=useState<string|null>(null);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);setMessage(null);try{const supabase=createClient();const{data,error}=await supabase.rpc("create_lead",{p_customer_id:customerId,p_product_id:productId,p_lead_status:status,p_notes:notes.trim()||null});if(error)throw error;router.push(`/leads/${String(data)}`);router.refresh();}catch(error){setMessage(error instanceof Error?error.message:"Não foi possível cadastrar o lead.");}finally{setLoading(false);}}
 return <form className="panel compact-form-panel" onSubmit={submit}><div className="panel-head"><div><h2>Informações do lead</h2><p>A data será registrada automaticamente como hoje.</p></div><UserRoundPlus size={20}/></div><div className="panel-body form-grid-two">
  <label className="field"><span>Cliente</span><select className="select" required value={customerId} onChange={e=>setCustomerId(e.target.value)}><option value="">Selecione o cliente</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}{c.city?` · ${c.city}`:""}</option>)}</select><small>Cliente novo? <Link className="inline-link" href="/clientes/novo">Cadastrar cliente</Link></small></label>
  <label className="field"><span>Produto</span><select className="select" required value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Selecione o produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  <label className="field"><span>Status do lead</span><select className="select" required value={status} onChange={e=>setStatus(e.target.value as (typeof STATUSES)[number])}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
  <label className="field field-span-two"><span>Observações</span><textarea className="textarea" rows={5} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Dúvidas, objetivo ou próximo passo."/></label>
 </div><div className="form-footer"><Link className="button ghost" href="/leads">Cancelar</Link><button className="button gold" disabled={loading}>{loading?<LoaderCircle className="spin" size={17}/>:<Save size={17}/>} {loading?"Salvando":"Salvar lead"}</button></div>{message&&<p className="form-message">{message}</p>}</form>;
}
