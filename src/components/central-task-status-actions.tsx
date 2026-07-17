"use client";

import { CheckCircle2, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CentralTaskStatusActions({ taskId, status }: { taskId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function update(next: string) {
    setLoading(next); setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("central_update_operational_task_status", { p_task_id: taskId, p_status: next });
      if (error) throw error;
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a tarefa."); }
    finally { setLoading(null); }
  }
  return <div className="central-task-actions">
    {status === "planned" ? <>
      <button type="button" className="button ghost compact-button" onClick={() => update("completed")} disabled={Boolean(loading)}>{loading === "completed" ? <LoaderCircle className="spin" size={14}/> : <CheckCircle2 size={14}/>}Concluir</button>
      <button type="button" className="button ghost compact-button" onClick={() => update("cancelled")} disabled={Boolean(loading)}>{loading === "cancelled" ? <LoaderCircle className="spin" size={14}/> : <XCircle size={14}/>}Cancelar</button>
    </> : <button type="button" className="button ghost compact-button" onClick={() => update("planned")} disabled={Boolean(loading)}>{loading === "planned" ? <LoaderCircle className="spin" size={14}/> : <RotateCcw size={14}/>}Reabrir</button>}
    {message && <small className="central-action-message">{message}</small>}
  </div>;
}
