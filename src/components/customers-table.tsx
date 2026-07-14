"use client";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { SortableHeader } from "@/components/sortable-header";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Customer } from "@/lib/types";
type SortKey="name"|"city"|"purchase_count"|"lead_count"|"total_spent"|"last_purchase_at"; type SortState={key:SortKey;direction:"asc"|"desc"};
const wa=(phone:string)=>`https://wa.me/${(phone.replace(/\D/g,"").startsWith("55")?phone.replace(/\D/g,""):`55${phone.replace(/\D/g,"")}`)}`;
export function CustomersTable({customers}:{customers:Customer[]}){
 const[sort,setSort]=useState<SortState>({key:"last_purchase_at",direction:"desc"});
 const rows=useMemo(()=>[...customers].sort((a,b)=>{let r=0;if(sort.key==="name"||sort.key==="city"||sort.key==="last_purchase_at")r=(a[sort.key]??"").localeCompare(b[sort.key]??"","pt-BR",{sensitivity:"base",numeric:true});else r=Number(a[sort.key])-Number(b[sort.key]);return sort.direction==="asc"?r:-r;}),[customers,sort]);
 const change=(key:SortKey)=>setSort(c=>({key,direction:c.key===key&&c.direction==="asc"?"desc":"asc"}));
 return <div className="table-wrap"><table className="customers-table"><thead><tr><th><SortableHeader label="Cliente" active={sort.key==="name"} direction={sort.direction} onClick={()=>change("name")}/></th><th><SortableHeader label="Cidade" active={sort.key==="city"} direction={sort.direction} onClick={()=>change("city")}/></th><th>Telefone</th><th><SortableHeader label="Compras" active={sort.key==="purchase_count"} direction={sort.direction} onClick={()=>change("purchase_count")}/></th><th><SortableHeader label="Leads" active={sort.key==="lead_count"} direction={sort.direction} onClick={()=>change("lead_count")}/></th><th><SortableHeader label="Total gasto" active={sort.key==="total_spent"} direction={sort.direction} onClick={()=>change("total_spent")}/></th><th><SortableHeader label="Última compra" active={sort.key==="last_purchase_at"} direction={sort.direction} onClick={()=>change("last_purchase_at")}/></th><th>Ação</th></tr></thead><tbody>{rows.map(c=><tr key={c.id}><td><Link className="product-cell product-link" href={`/clientes/${c.id}`}><span className="product-avatar">{c.name.slice(0,2).toUpperCase()}</span><div><div className="cell-main">{c.name}</div>{c.pending_sales_count>0&&<div className="cell-sub">{c.pending_sales_count} pedido(s) pendente(s)</div>}</div></Link></td><td>{c.city??"—"}</td><td>{c.phone??"—"}</td><td>{c.purchase_count}</td><td>{c.lead_count}</td><td className="amount">{formatCurrency(c.total_spent)}</td><td>{formatDate(c.last_purchase_at)}</td><td><div className="table-actions">{c.phone&&<a className="icon-link" href={wa(c.phone)} target="_blank" rel="noreferrer"><MessageCircle size={17}/></a>}<Link className="icon-link" href={`/clientes/${c.id}`}><ArrowRight size={18}/></Link></div></td></tr>)}</tbody></table></div>;
}
