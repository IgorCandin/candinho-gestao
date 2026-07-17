"use client";

import { CheckCircle2, LoaderCircle, RotateCcw, SearchCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function InventoryReconciliationActions({ attentionType, entityId, issueCode, currentStatus, currentNotes }: { attentionType: string; entityId: string; issueCode: string; currentStatus: string; currentNotes?: string | null }) {
  const router = useRouter();
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function update(status: "open" | "reviewing" | "resolved") {
    setLoading(status); setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("inventory_reconciliation_set_status", {
        p_attention_type: attentionType,
        p_entity_id: entityId,
        p_issue_code: issueCode,
        p_status: status,
        p_notes: notes.trim() || null,
      });
      if (error) throw error;
      setMessage(status === "resolved" ? "Marcado como resolvido. O estoque não foi alterado." : status === "reviewing" ? "Pendência colocada em análise." : "Pendência reaberta.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a pendência.");
    } finally { setLoading(null); }
  }

  return <div className="reconciliation-actions">
    <input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observação da conferência (opcional)"/>
    <div className="reconciliation-action-buttons">
      {currentStatus !== "reviewing" && <button className="button ghost compact-button" type="button" disabled={Boolean(loading)} onClick={() => update("reviewing")}>{loading === "reviewing" ? <LoaderCircle className="spin" size={14}/> : <SearchCheck size={14}/>}Em análise</button>}
      {currentStatus !== "resolved" && <button className="button gold compact-button" type="button" disabled={Boolean(loading)} onClick={() => update("resolved")}>{loading === "resolved" ? <LoaderCircle className="spin" size={14}/> : <CheckCircle2 size={14}/>}Resolver</button>}
      {currentStatus !== "open" && <button className="button ghost compact-button" type="button" disabled={Boolean(loading)} onClick={() => update("open")}>{loading === "open" ? <LoaderCircle className="spin" size={14}/> : <RotateCcw size={14}/>}Reabrir</button>}
    </div>
    {message && <small className="reconciliation-action-message">{message}</small>}
  </div>;
}
