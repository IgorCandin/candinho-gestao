"use client";

import { LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type { FitnessCustomerRow, FitnessStockRow } from "@/lib/types";

const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão", "Link de Pagamento", "Pagamento fracionado"];
type DraftItem = { key: string; variantId: string; quantity: string; unitPrice: string };
const key = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year:"numeric",month:"2-digit",day:"2-digit" }).format(new Date());

export function FitnessSaleForm({ stock, customers, responsible }: { stock: FitnessStockRow[]; customers: FitnessCustomerRow[]; responsible: string }) {
  const router = useRouter();
  const options = useMemo(() => stock.filter((row) => row.product_active && row.variant_active).sort((a,b)=>`${a.product_name}${a.size}${a.color}`.localeCompare(`${b.product_name}${b.size}${b.color}`,"pt-BR")), [stock]);
  const [customerId,setCustomerId]=useState(""); const selectedCustomer=customers.find((customer)=>customer.id===customerId);
  const [customerName,setCustomerName]=useState(""); const [phone,setPhone]=useState(""); const [instagram,setInstagram]=useState(""); const [city,setCity]=useState(""); const [source,setSource]=useState("");
  const [quotedOn,setQuotedOn]=useState(today); const [items,setItems]=useState<DraftItem[]>([{key:key(),variantId:"",quantity:"1",unitPrice:""}]);
  const [paymentMode,setPaymentMode]=useState("receivable"); const [paidOn,setPaidOn]=useState(today); const [paymentMethod,setPaymentMethod]=useState("Pix"); const [paymentDueOn,setPaymentDueOn]=useState(today);
  const [delivered,setDelivered]=useState(false); const [deliveredOn,setDeliveredOn]=useState(today); const [notes,setNotes]=useState(""); const [loading,setLoading]=useState(false); const [message,setMessage]=useState<string|null>(null);

  const rowFor=(variantId:string)=>options.find((row)=>row.variant_id===variantId);
  const update=(itemKey:string,change:Partial<DraftItem>)=>setItems((current)=>current.map((item)=>item.key===itemKey?{...item,...change}:item));
  const selectItem=(itemKey:string,variantId:string)=>{const row=rowFor(variantId);update(itemKey,{variantId,unitPrice:row?String(row.sale_price):""});};
  const total=items.reduce((sum,item)=>sum+(Number(item.quantity)||0)*(Number(item.unitPrice)||0),0);
  function chooseCustomer(id:string){setCustomerId(id);const c=customers.find((item)=>item.id===id);if(c){setCustomerName(c.name);setPhone(c.phone??"");setInstagram(c.instagram??"");setCity(c.city??"");setSource(c.source??"");}}

  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    try {
      if (!customerName.trim()) throw new Error("Informe o cliente.");
      if (items.some((item)=>!item.variantId || Number(item.quantity)<=0 || Number(item.unitPrice)<0)) throw new Error("Revise os itens da venda.");
      const { data,error } = await createClient().rpc("create_fitness_sale_v2",{
        p_customer_id:customerId||null,p_customer_name:customerName.trim(),p_customer_phone:phone.trim()||null,p_customer_instagram:instagram.trim()||null,p_city:city.trim()||null,p_customer_source:source.trim()||null,p_quoted_on:quotedOn,
        p_items:items.map((item)=>({variant_id:item.variantId,quantity:Number(item.quantity),unit_price:Number(item.unitPrice)})),p_payment_mode:paymentMode,p_paid_on:paymentMode==="paid"?paidOn:null,p_payment_method:paymentMode==="paid"?paymentMethod:null,p_payment_due_on:paymentMode==="combined"?paymentDueOn:null,p_delivered:delivered,p_delivered_on:delivered?deliveredOn:null,p_responsible:responsible,p_notes:notes.trim()||null,
      });
      if (error) throw error; router.push(`/fitness/vendas/${String(data)}`); router.refresh();
    } catch (error) { setMessage(error instanceof Error?error.message:"Não foi possível registrar a venda."); } finally { setLoading(false); }
  }

  return <form className="new-sale-layout" onSubmit={submit}><div className="new-sale-main">
    <article className="panel"><div className="panel-head"><div><h2>Cliente</h2><p>Selecione um cliente existente ou cadastre automaticamente ao salvar.</p></div></div><div className="panel-body form-grid-two">
      <label className="field field-span-two"><span>Cliente existente</span><select className="select" value={customerId} onChange={(e)=>chooseCustomer(e.target.value)}><option value="">Novo cliente</option>{customers.filter((c)=>c.active).map((c)=><option key={c.id} value={c.id}>{c.name}{c.city?` · ${c.city}`:""}</option>)}</select></label>
      <label className="field"><span>Nome</span><input className="input" required value={customerName} onChange={(e)=>{setCustomerName(e.target.value);if(selectedCustomer&&e.target.value!==selectedCustomer.name)setCustomerId("");}}/></label>
      <label className="field"><span>Telefone</span><input className="input" value={phone} onChange={(e)=>setPhone(e.target.value)}/></label>
      <label className="field"><span>Instagram</span><input className="input" value={instagram} onChange={(e)=>setInstagram(e.target.value)}/></label>
      <label className="field"><span>Cidade</span><input className="input" value={city} onChange={(e)=>setCity(e.target.value)}/></label>
      <label className="field"><span>Origem</span><select className="select" value={source} onChange={(e)=>setSource(e.target.value)}><option value="">Não informado</option>{["Instagram","WhatsApp","Indicação","Academia","Cliente antigo","Outro"].map((item)=><option key={item}>{item}</option>)}</select></label>
      <label className="field"><span>Data da venda</span><input className="input" type="date" value={quotedOn} onChange={(e)=>setQuotedOn(e.target.value)}/></label>
    </div></article>
    <article className="panel"><div className="panel-head"><div><h2>Itens</h2><p>Produto, tamanho e cor. O estoque só baixa na entrega.</p></div><button type="button" className="button ghost" onClick={()=>setItems((current)=>[...current,{key:key(),variantId:"",quantity:"1",unitPrice:""}])}><Plus size={16}/>Adicionar</button></div><div className="panel-body sale-form-items">{items.map((item,index)=>{const row=rowFor(item.variantId);return <div className="sale-form-item" key={item.key}><div className="sale-form-item-head"><strong>Item {index+1}</strong>{items.length>1&&<button type="button" className="icon-button" onClick={()=>setItems((current)=>current.filter((row)=>row.key!==item.key))}><Trash2 size={16}/></button>}</div><div className="sale-form-item-grid"><label className="field sale-product-field"><span>Produto</span><select className="select" value={item.variantId} onChange={(e)=>selectItem(item.key,e.target.value)}><option value="">Selecione</option>{options.map((option)=><option key={option.variant_id} value={option.variant_id}>{option.product_name} · {option.size} · {option.color}</option>)}</select></label><label className="field"><span>Qtd.</span><input className="input" type="number" min="1" step="1" value={item.quantity} onChange={(e)=>update(item.key,{quantity:e.target.value})}/></label><label className="field"><span>Preço</span><input className="input" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e)=>update(item.key,{unitPrice:e.target.value})}/></label></div>{row&&<div className="sale-stock-strip"><span>Disponível <strong>{row.available_quantity}</strong></span><span>Reservado <strong>{row.reserved_quantity}</strong></span><span>A caminho <strong>{row.incoming_quantity}</strong></span><span>Padrão <strong>{formatCurrency(row.sale_price)}</strong></span></div>}</div>})}</div></article>
    <article className="panel"><div className="panel-head"><div><h2>Observações</h2></div></div><div className="panel-body"><textarea className="textarea" rows={4} value={notes} onChange={(e)=>setNotes(e.target.value)}/></div></article>
  </div><aside className="new-sale-side">
    <article className="panel"><div className="panel-head"><div><h2>Pagamento</h2></div></div><div className="panel-body product-switch-list"><label className="field"><span>Situação</span><select className="select" value={paymentMode} onChange={(e)=>setPaymentMode(e.target.value)}><option value="receivable">A receber</option><option value="paid">Pago</option><option value="combined">Pagamento combinado</option></select></label>{paymentMode==="paid"&&<><label className="field"><span>Data</span><input className="input" type="date" value={paidOn} onChange={(e)=>setPaidOn(e.target.value)}/></label><label className="field"><span>Forma</span><select className="select" value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)}>{PAYMENT_METHODS.map((method)=><option key={method}>{method}</option>)}</select></label></>}{paymentMode==="combined"&&<label className="field"><span>Data combinada</span><input className="input" type="date" value={paymentDueOn} onChange={(e)=>setPaymentDueOn(e.target.value)}/></label>}</div></article>
    <article className="panel"><div className="panel-head"><div><h2>Entrega</h2></div></div><div className="panel-body product-switch-list"><label className="switch-row"><div><strong>Já foi entregue</strong><span>Baixa o estoque agora.</span></div><input type="checkbox" checked={delivered} onChange={(e)=>setDelivered(e.target.checked)}/></label>{delivered&&<label className="field"><span>Data</span><input className="input" type="date" value={deliveredOn} onChange={(e)=>setDeliveredOn(e.target.value)}/></label>}</div></article>
    <article className="panel product-editor-summary"><div className="panel-body"><dl><div><dt>Total</dt><dd>{formatCurrency(total)}</dd></div></dl>{message&&<p className="form-error visible">{message}</p>}<button className="button gold product-save-button" disabled={loading}>{loading?<LoaderCircle className="spin" size={17}/>:<Save size={17}/>}Salvar venda</button></div></article>
  </aside></form>;
}
