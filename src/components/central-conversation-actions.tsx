"use client";

import { CheckCheck, CircleCheckBig, Clock3, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
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

  async function deleteFromInbox() {
    const confirmed = window.confirm(
      "Excluir esta conversa somente da Candinho Central?\n\n" +
      "Isso remove o histórico salvo no Inbox e os anexos próprios desta conversa, mas NÃO apaga nada do WhatsApp.\n\n" +
      "Se o contato mandar uma nova mensagem, a conversa aparecerá novamente."
    );
    if (!confirmed) return;

    setLoading("delete");
    setMessage(null);

    try {
      const response = await fetch("/api/central/delete-conversation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Não foi possível excluir a conversa do Inbox.");
      }

      router.push("/central/inbox");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir a conversa do Inbox.");
    } finally {
      setLoading(null);
    }
  }

  const isClosed = status === "closed" || status === "archived";

  return <div className="central-conversation-actions">
    <div className="central-conversation-action-buttons">
      <button type="button" className="button ghost compact-button" onClick={markRead} disabled={Boolean(loading)}>
        {loading === "read" ? <LoaderCircle className="spin" size={15}/> : <CheckCheck size={15}/>}
        Marcar lida
      </button>

      {!isClosed && (
        <button
          type="button"
          className="button ghost compact-button"
          onClick={() => setStatus(status === "pending" ? "open" : "pending")}
          disabled={Boolean(loading)}
        >
          {loading === "pending" || loading === "open" ? <LoaderCircle className="spin" size={15}/> : <Clock3 size={15}/>}
          {status === "pending" ? "Reabrir" : "Pendente"}
        </button>
      )}

      <button
        type="button"
        className="button ghost compact-button"
        onClick={() => setStatus(isClosed ? "open" : "closed")}
        disabled={Boolean(loading)}
      >
        {loading === "closed" || loading === "open" ? <LoaderCircle className="spin" size={15}/> : isClosed ? <RotateCcw size={15}/> : <CircleCheckBig size={15}/>}
        {isClosed ? "Reabrir" : "Concluir"}
      </button>

      <button
        type="button"
        className="button ghost compact-button danger"
        onClick={deleteFromInbox}
        disabled={Boolean(loading)}
        title="Apaga somente o histórico local da Candinho Central. Não apaga a conversa no WhatsApp."
      >
        {loading === "delete" ? <LoaderCircle className="spin" size={15}/> : <Trash2 size={15}/>}
        Excluir do Inbox
      </button>
    </div>

    {message && <p className="central-action-message">{message}</p>}
  </div>;
}
