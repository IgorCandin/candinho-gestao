"use client";

import { LoaderCircle, RotateCcw, Trash2, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function QuoteStatusActions({ quoteId, status }: { quoteId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function changeStatus(nextStatus: "quoted" | "lost" | "cancelled") {
    const question = nextStatus === "quoted"
      ? "Reabrir este orçamento e devolver o lead para Cotação?"
      : nextStatus === "lost"
        ? "Marcar este orçamento como perdido? Nenhum estoque será alterado."
        : "Cancelar este orçamento? Nenhum estoque será alterado.";
    if (!window.confirm(question)) return;
    setLoading(nextStatus);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_budget_status", { p_quote_id: quoteId, p_status: nextStatus });
      if (error) throw error;
      setMessage(nextStatus === "quoted" ? "Orçamento reaberto." : nextStatus === "lost" ? "Orçamento marcado como perdido." : "Orçamento cancelado.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o orçamento.");
    } finally {
      setLoading(null);
    }
  }

  if (status === "confirmed") return null;
  return <div className="quote-status-actions">
    {status === "quoted" ? <>
      <button className="button ghost" type="button" disabled={Boolean(loading)} onClick={()=>changeStatus("lost")}>{loading==="lost"?<LoaderCircle className="spin" size={16}/>:<UserX size={16}/>}Marcar como perdido</button>
      <button className="button danger" type="button" disabled={Boolean(loading)} onClick={()=>changeStatus("cancelled")}>{loading==="cancelled"?<LoaderCircle className="spin" size={16}/>:<Trash2 size={16}/>}Cancelar orçamento</button>
    </> : <button className="button ghost" type="button" disabled={Boolean(loading)} onClick={()=>changeStatus("quoted")}>{loading==="quoted"?<LoaderCircle className="spin" size={16}/>:<RotateCcw size={16}/>}Reabrir orçamento</button>}
    {message&&<span className="quote-action-message">{message}</span>}
  </div>;
}
