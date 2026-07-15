"use client";

import { CheckCircle2, LoaderCircle, PackageCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function TestLabSaleActions({ saleId, generalStatus, paymentStatus, deliveryStatus }: { saleId:string; generalStatus:string; paymentStatus:string; deliveryStatus:string }){
 const router=useRouter(); const[loading,setLoading]=useState("");const[message,setMessage]=useState<string|null>(null);
 async function run(name:string,params:Record<string,unknown>){setLoading(name);setMessage(null);try{const{error}=await createClient().rpc(name,params);if(error)throw error;router.refresh();}catch(error){setMessage(error instanceof Error?error.message:"Falha no teste.");}finally{setLoading("");}}
 if(generalStatus==="cancelled")return <div className="sale-actions-complete"><Trash2 size={20}/><div><strong>Venda teste cancelada</strong><span>O estoque fictício foi reconciliado.</span></div></div>;
 return <div className="test-lab-action-row">
  {paymentStatus!=="received"&&<button className="button gold" disabled={!!loading} onClick={()=>run("test_lab_mark_sale_paid",{p_sale_id:saleId})}>{loading==="test_lab_mark_sale_paid"?<LoaderCircle className="spin" size={16}/>:<CheckCircle2 size={16}/>}Marcar paga</button>}
  {deliveryStatus!=="delivered"&&<button className="button ghost" disabled={!!loading} onClick={()=>run("test_lab_mark_sale_delivered",{p_sale_id:saleId})}>{loading==="test_lab_mark_sale_delivered"?<LoaderCircle className="spin" size={16}/>:<PackageCheck size={16}/>}Marcar entregue</button>}
  <button className="button danger" disabled={!!loading} onClick={()=>run("test_lab_cancel_sale",{p_sale_id:saleId,p_reason:"Cancelamento manual na Área de Teste"})}>{loading==="test_lab_cancel_sale"?<LoaderCircle className="spin" size={16}/>:<Trash2 size={16}/>}Cancelar</button>
  {message&&<span className="form-error visible">{message}</span>}
 </div>;
}
