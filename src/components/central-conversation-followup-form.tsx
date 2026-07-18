"use client";

import { CalendarClock, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function localDateTimeValue(hoursAhead = 24) {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CentralConversationFollowupForm({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dueAt, setDueAt] = useState(localDateTimeValue());
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createFollowup() {
    if (!dueAt) return;
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("central_create_conversation_followup", {
        p_conversation_id: conversationId,
        p_due_at: new Date(dueAt).toISOString(),
        p_priority: priority,
        p_notes: notes.trim() || null,
      });
      if (error) throw error;
      setMessage("Retorno criado na Agenda e conversa marcada como pendente.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o retorno.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="central-followup-wrap">
    <button type="button" className="button ghost compact-button" onClick={() => setOpen((value) => !value)}><CalendarClock size={15}/>Agendar retorno</button>
    {open && <div className="central-followup-popover">
      <label><span>Quando retornar</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)}/></label>
      <label><span>Prioridade</span><select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="normal">Normal</option><option value="attention">Atenção</option><option value="urgent">Urgente</option></select></label>
      <label className="central-followup-notes"><span>Observação</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: confirmar se o produto acabou"/></label>
      <div><button type="button" className="button gold compact-button" onClick={createFollowup} disabled={loading || !dueAt}>{loading ? <LoaderCircle className="spin" size={14}/> : <CalendarClock size={14}/>}Criar retorno</button></div>
    </div>}
    {message && <small className="central-followup-message">{message}</small>}
  </div>;
}
