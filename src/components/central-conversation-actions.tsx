"use client";

import { Bot, CheckCheck, CircleCheckBig, Clock3, LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CentralConversationActions({ conversationId, status }: { conversationId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function markRead() {
    setLoading("read"); setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("central_mark_conversation_read", { p_conversation_id: conversationId });
      if (error) throw error;
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível marcar como lida."); }
    finally { setLoading(null); }
  }

  async function setStatus(nextStatus: string) {
    setLoading(nextStatus); setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("central_set_conversation_status", { p_conversation_id: conversationId, p_status: nextStatus });
      if (error) throw error;
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o status."); }
    finally { setLoading(null); }
  }

  async function suggestReply() {
    setLoading("nexus"); setMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("central-nexus-suggest", { body: { conversation_id: conversationId } });
      if (error) throw error;
      const suggestion = data?.suggestion?.suggested_reply;
      setMessage(suggestion ? `Nexus: ${suggestion}` : "Sugestão gerada e salva no Nexus.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível gerar a sugestão. Verifique a chave da OpenAI."); }
    finally { setLoading(null); }
  }

  const isClosed = status === "closed" || status === "archived";

  return <div className="central-conversation-actions">
    <div className="central-conversation-action-buttons">
      <button type="button" className="button ghost compact-button" onClick={markRead} disabled={Boolean(loading)}>{loading === "read" ? <LoaderCircle className="spin" size={15}/> : <CheckCheck size={15}/>}Marcar lida</button>
      {!isClosed && <button type="button" className="button ghost compact-button" onClick={() => setStatus(status === "pending" ? "open" : "pending")} disabled={Boolean(loading)}>{loading === "pending" || loading === "open" ? <LoaderCircle className="spin" size={15}/> : <Clock3 size={15}/>} {status === "pending" ? "Reabrir" : "Pendente"}</button>}
      <button type="button" className="button ghost compact-button" onClick={() => setStatus(isClosed ? "open" : "closed")} disabled={Boolean(loading)}>{loading === "closed" || loading === "open" ? <LoaderCircle className="spin" size={15}/> : isClosed ? <RotateCcw size={15}/> : <CircleCheckBig size={15}/>} {isClosed ? "Reabrir" : "Concluir"}</button>
      <button type="button" className="button gold compact-button" onClick={suggestReply} disabled={Boolean(loading)}>{loading === "nexus" ? <LoaderCircle className="spin" size={15}/> : <Bot size={15}/>}Sugerir com Nexus</button>
    </div>
    {message && <p className="central-action-message">{message}</p>}
  </div>;
}
