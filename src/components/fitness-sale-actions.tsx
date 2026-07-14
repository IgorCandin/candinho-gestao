"use client";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export function FitnessSaleActions({saleId,paymentStatus,deliveryStatus}:{saleId:string;paymentStatus:string;deliveryStatus:string}){
 const router=useRouter(); const [paidOn,setPaidOn]=useState(today);const [method,setMethod]=useState("Pix");const [deliveredOn,setDeliveredOn]=useState(today);const [loading,setLoading]=useState("");const [message,setMessage]=useState<string|null>(null);
 async function run(name:string,params:Record<string,unknown>){setLoading(name);setMessage(null);try{const {error}=await createClient().rpc(name,params);if(error)throw error;router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Não foi possível concluir a ação.");}finally{setLoading("");}}
 return <div className="sale-actions-grid">
  {paymentStatus!=="received"&&<article className="panel"><div className="panel-head"><div><h2>Receber pagamento</h2></div></div><div className="panel-body form-grid-two"><label className="field"><span>Data</span><input className="input" type="date" value={paidOn} onChange={(e)=>setPaidOn(e.target.value)}/></label><label className="field"><span>Forma</span><select className="select" value={method} onChange={(e)=>setMethod(e.target.value)}>{["Pix","Dinheiro","Cartão","Link de Pagamento","Pagamento fracionado"].map((x)=><option key={x}>{x}</option>)}</select></label><button className="button gold field-span-two" onClick={()=>run("mark_fitness_sale_paid",{p_sale_id:saleId,p_paid_on:paidOn,p_payment_method:method})}>{loading==="mark_fitness_sale_paid"?<LoaderCircle className="spin" size={16}/>:<CheckCircle2 size={16}/>}Recebido</button></div></article>}
  {deliveryStatus!=="delivered"&&<article className="panel"><div className="panel-head"><div><h2>Confirmar entrega</h2></div></div><div className="panel-body"><label className="field"><span>Data</span><input className="input" type="date" value={deliveredOn} onChange={(e)=>setDeliveredOn(e.target.value)}/></label><button className="button gold dashboard-full-button" onClick={()=>run("mark_fitness_sale_delivered",{p_sale_id:saleId,p_delivered_on:deliveredOn})}>{loading==="mark_fitness_sale_delivered"?<LoaderCircle className="spin" size={16}/>:<CheckCircle2 size={16}/>}Entregue</button></div></article>}
  {message&&<p className="form-error visible">{message}</p>}
 </div>;
}
