"use client";

import Link from "next/link";
import { Link2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { UnassignedPartnershipSale } from "@/lib/types";

export function PartnerUnassignedSales({ partnerId, sales }: { partnerId: string; sales: UnassignedPartnershipSale[] }) {
  const router = useRouter(); const [loadingId, setLoadingId] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);
  async function assign(saleId: string) { setLoadingId(saleId); setMessage(null); try { const supabase=createClient(); const { error }=await supabase.rpc("assign_sale_partner",{p_sale_id:saleId,p_partner_id:partnerId}); if(error) throw error; router.refresh(); } catch(error){setMessage(error instanceof Error?error.message:"Não foi possível vincular a venda.");} finally{setLoadingId(null);} }
  if (sales.length === 0) return null;
  return <article className="panel partner-unassigned-panel"><div className="panel-head"><div><h2>Vendas antigas sem parceiro definido</h2><p>Revise somente as que realmente pertencem a esta parceria.</p></div><strong>{sales.length}</strong></div>{message&&<p className="form-message">{message}</p>}<div className="table-wrap"><table className="table partner-unassigned-table"><thead><tr><th>Cliente</th><th>Produto</th><th>Data</th><th>Origem</th><th>Valor</th><th /></tr></thead><tbody>{sales.map((sale)=><tr key={sale.id}><td><Link className="table-link" href={`/vendas/${sale.id}`}><strong>{sale.customer_name}</strong></Link></td><td>{sale.product_summary??"—"}</td><td>{formatDateOnly(sale.sale_date)}</td><td>{sale.location_code}</td><td>{formatCurrency(sale.total_amount)}</td><td><button className="button ghost compact-button" type="button" disabled={loadingId===sale.id} onClick={()=>assign(sale.id)}>{loadingId===sale.id?<LoaderCircle className="spin" size={15}/>:<Link2 size={15}/>}Vincular</button></td></tr>)}</tbody></table></div></article>;
}
