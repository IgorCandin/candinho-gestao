"use client";

import { Bot, CheckCheck, Clock3, LoaderCircle } from "lucide-react";
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

  return <div className="central-conversation-actions">
    <button type="button" className="button ghost compact-button" onClick={markRead} disabled={Boolean(loading)}>{loading === "read" ? <LoaderCircle className="spin" size={15}/> : <CheckCheck size={15}/>}Marcar lida</button>
    <button type="button" className="button ghost compact-button" onClick={() => setStatus(status === "pending" ? "open" : "pending")} disabled={Boolean(loading)}>{loading === "pending" || loading === "open" ? <LoaderCircle className="spin" size={15}/> : <Clock3 size={15}/>} {status === "pending" ? "Reabrir" : "Pendente"}</button>
    <button type="button" className="button gold compact-button" onClick={suggestReply} disabled={Boolean(loading)}>{loading === "nexus" ? <LoaderCircle className="spin" size={15}/> : <Bot size={15}/>}Sugerir com Nexus</button>
    {message && <p className="central-action-message">{message}</p>}
  </div>;
}
