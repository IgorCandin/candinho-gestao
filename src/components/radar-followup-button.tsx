"use client";

import { CalendarClock, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function tomorrowMorningValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RadarFollowupButton({ customerId, customerName, suggestedAction, compact = false }: { customerId: string; customerName: string; suggestedAction?: string | null; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dueAt, setDueAt] = useState(tomorrowMorningValue());
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function schedule() {
    if (!dueAt) return;
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("central_schedule_radar_followup", {
        p_customer_id: customerId,
        p_due_at: new Date(dueAt).toISOString(),
        p_priority: priority,
        p_notes: suggestedAction || null,
      });
      if (error) throw error;
      setMessage("Retorno salvo na Agenda.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível agendar o retorno.");
    } finally {
      setLoading(false);
    }
  }

  return <div className={`radar-followup ${compact ? "compact" : ""}`}>
    <button type="button" className="button ghost compact-button" onClick={() => setOpen((value) => !value)} title={`Agendar retorno para ${customerName}`}><CalendarClock size={14}/>{compact ? "Agendar" : "Criar retorno"}</button>
    {open && <div className="radar-followup-popover">
      <strong>Retorno · {customerName}</strong>
      <label><span>Quando</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)}/></label>
      <label><span>Prioridade</span><select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="normal">Normal</option><option value="attention">Atenção</option><option value="urgent">Urgente</option></select></label>
      <button type="button" className="button gold compact-button" onClick={schedule} disabled={loading || !dueAt}>{loading ? <LoaderCircle className="spin" size={14}/> : <CalendarClock size={14}/>}Salvar na Agenda</button>
    </div>}
    {message && <small className="radar-followup-message">{message}</small>}
  </div>;
}
