"use client";

import { LoaderCircle, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TestLabCustomer, TestLabOperation, TestLabStockRow } from "@/lib/types";

export function TestLabSaleForm({ operation, customers, products }: { operation: TestLabOperation; customers: TestLabCustomer[]; products: TestLabStockRow[] }) {
  const router = useRouter();
  const [customerId,setCustomerId]=useState(customers[0]?.id??"");
  const [productId,setProductId]=useState(products[0]?.product_id??"");
  const [quantity,setQuantity]=useState(1);
  const [paid,setPaid]=useState(false);
  const [delivered,setDelivered]=useState(false);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const product=useMemo(()=>products.find((p)=>p.product_id===productId),[products,productId]);

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault(); setLoading(true); setMessage(null);
    try{
      const {data,error}=await createClient().rpc("test_lab_create_sale",{p_operation:operation,p_customer_id:customerId,p_items:[{product_id:productId,quantity}],p_paid:paid,p_delivered:delivered,p_notes:"Venda criada na Área de Teste"});
      if(error)throw error;
      router.push(`/teste/${operation}/vendas/${data}`); router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível criar a venda de teste.");}
    finally{setLoading(false);}
  }

  return <form className="panel-body test-lab-form" onSubmit={submit}>
    <div className="form-grid-two">
      <label className="field"><span>Cliente fictício</span><select className="select" required value={customerId} onChange={(e)=>setCustomerId(e.target.value)}>{customers.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="field"><span>Produto fictício</span><select className="select" required value={productId} onChange={(e)=>setProductId(e.target.value)}>{products.map((p)=><option key={p.product_id} value={p.product_id}>{p.name}{p.variant_label?` · ${p.variant_label}`:""} · disp. {p.available_quantity}</option>)}</select></label>
      <label className="field"><span>Quantidade</span><input className="input" type="number" min={1} value={quantity} onChange={(e)=>setQuantity(Math.max(1,Number(e.target.value)||1))}/></label>
      <div className="test-lab-price-preview"><span>Total simulado</span><strong>R$ {((product?.sale_price??0)*quantity).toFixed(2).replace(".",",")}</strong></div>
    </div>
    <div className="test-lab-checks"><label><input type="checkbox" checked={paid} onChange={(e)=>setPaid(e.target.checked)}/> Criar como paga</label><label><input type="checkbox" checked={delivered} onChange={(e)=>setDelivered(e.target.checked)}/> Criar como entregue</label></div>
    <button className="button gold" disabled={loading||!customerId||!productId}>{loading?<LoaderCircle className="spin" size={16}/>:<ShoppingBag size={16}/>}Criar venda teste</button>
    {message&&<p className="form-error visible">{message}</p>}
  </form>;
}
