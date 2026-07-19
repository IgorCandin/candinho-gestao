"use client";
import { FileDown } from "lucide-react";
import { useMemo,useState } from "react";
import type { FitnessStockRow } from "@/lib/types";

export function FitnessPdfBuilder({stock}:{stock:FitnessStockRow[]}){
 const options=useMemo(()=>stock.filter(r=>r.product_active&&r.variant_active).sort((a,b)=>`${a.product_name}${a.size}${a.color}`.localeCompare(`${b.product_name}${b.size}${b.color}`,"pt-BR")),[stock]);
 const[selected,setSelected]=useState<string[]>([]);const[incoming,setIncoming]=useState(true);
 const toggle=(id:string)=>setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
 function open(selectedOnly:boolean){const q=new URLSearchParams();q.set("incoming",incoming?"1":"0");if(selectedOnly&&selected.length)q.set("variants",selected.join(","));window.open(`/api/fitness/catalogo/pdf?${q.toString()}`,"_blank","noopener,noreferrer")}
 return <><article className="panel"><div className="panel-head"><div><h2>PDF automático</h2><p>Gera um catálogo com todas as peças disponíveis e, opcionalmente, o que está a caminho.</p></div></div><div className="panel-body product-switch-list"><label className="switch-row"><div><strong>Incluir produtos a caminho</strong><span>Mostra também variações sem saldo disponível que possuem pedido pendente.</span></div><input type="checkbox" checked={incoming} onChange={e=>setIncoming(e.target.checked)}/></label><button className="button gold" type="button" onClick={()=>open(false)}><FileDown size={16}/>Gerar PDF automático</button></div></article>
 <article className="panel"><div className="panel-head"><div><h2>Selecionar produtos</h2><p>Marque somente as peças que deseja mandar para a cliente.</p></div><button type="button" className="button ghost" onClick={()=>setSelected(selected.length===options.length?[]:options.map(x=>x.variant_id))}>{selected.length===options.length?"Limpar":"Selecionar todos"}</button></div><div className="panel-body" style={{display:"grid",gap:8}}>{options.map(o=><label key={o.variant_id} className="switch-row"><div><strong>{o.product_name} · {o.size} · {o.color}</strong><span>Disponível {o.available_quantity} · A caminho {o.incoming_quantity}</span></div><input type="checkbox" checked={selected.includes(o.variant_id)} onChange={()=>toggle(o.variant_id)}/></label>)}{options.length===0&&<p>Nenhuma variação ativa.</p>}<button className="button gold" type="button" disabled={!selected.length} onClick={()=>open(true)}><FileDown size={16}/>Gerar PDF com {selected.length} selecionado(s)</button></div></article></>
}
