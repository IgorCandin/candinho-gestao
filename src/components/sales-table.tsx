/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import type { SaleRow } from "@/lib/types";

export function SalesTable({sales}:{sales:SaleRow[]}){
 const router=useRouter();
 return <div className="table-wrap"><table className="sales-history-table"><thead><tr><th>Venda</th><th>Produto</th><th>Data do orçamento</th><th>Pagamento</th><th>Entrega</th><th>Estoque</th><th>Total</th><th>Lucro</th></tr></thead><tbody>{sales.map((sale)=><tr key={sale.id} className="clickable-order-row" role="link" tabIndex={0} onClick={()=>router.push(`/vendas/${sale.id}`)} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();router.push(`/vendas/${sale.id}`)}}}>
  <td><div className="pending-order-customer"><div className="pending-order-thumb">{sale.primary_image_url?<img src={sale.primary_image_url} alt={sale.product_summary??"Produto"}/>:<ImageIcon size={20}/>}</div><div>{sale.customer_id?<Link className="cell-main table-link" href={`/clientes/${sale.customer_id}`} onClick={(event)=>event.stopPropagation()}>{sale.customer_name}</Link>:<div className="cell-main">{sale.customer_name}</div>}<div className="cell-sub">{sale.price_condition??"Clique para abrir os detalhes"}</div></div></div></td>
  <td className="multiline">{sale.product_summary??"—"}</td><td>{formatDate(sale.quoted_at)}</td>
  <td>{sale.paid_at?<span className="date-status green">{formatDate(sale.paid_at)}</span>:sale.payment_due_at?<span className="date-status orange">{formatDateOnly(sale.payment_due_at)}</span>:<Badge value={sale.payment_status}/>}</td>
  <td>{sale.delivered_at?<span className="date-status green">{formatDate(sale.delivered_at)}</span>:<Badge value={sale.delivery_status}/>}</td>
  <td><div className="cell-main">{sale.location_code}</div>{sale.reservation_status&&<div className={`cell-sub reservation-${sale.reservation_status}`}>{sale.reservation_status.replaceAll("_"," ")}</div>}</td>
  <td className="amount">{formatCurrency(sale.total_amount)}</td><td className="amount positive">{formatCurrency(sale.total_profit)}</td>
 </tr>)}</tbody></table></div>;
}
