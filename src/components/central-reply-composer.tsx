"use client";

import { Bot, LoaderCircle, MessageSquareText, Send, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CentralQuickReply } from "@/lib/central-data";

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload?.error || "A operação não pôde ser concluída.");
  }
  return payload;
}

export function CentralReplyComposer({ conversationId, provider, quickReplies = [] }: { conversationId: string; provider: string; quickReplies?: CentralQuickReply[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState<"send" | "nexus" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function suggest() {
    setLoading("nexus");
    setMessage(null);
    setWarning(null);
    try {
      const data = await postJson<{ suggestion?: { suggested_reply?: string; requires_human?: boolean; reason?: string } }>(
        "/api/central/nexus-suggest",
        { conversation_id: conversationId },
      );
      const suggestion = data?.suggestion;
      if (typeof suggestion?.suggested_reply === "string") setBody(suggestion.suggested_reply);
      if (suggestion?.requires_human) setWarning(`Revisão humana necessária${suggestion?.reason ? `: ${suggestion.reason}` : "."}`);
      else setMessage("Sugestão do Nexus carregada. Revise antes de enviar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gerar a sugestão. Verifique a configuração da OpenAI.");
    } finally {
      setLoading(null);
    }
  }

  async function send() {
    const text = body.trim();
    if (!text) return;
    setLoading("send");
    setMessage(null);
    setWarning(null);
    try {
      await postJson<{ sent?: boolean }>("/api/central/meta-send", {
        conversation_id: conversationId,
        body: text,
      });
      setBody("");
      setMessage("Mensagem enviada e registrada no histórico.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a mensagem.");
    } finally {
      setLoading(null);
    }
  }

  const supported = ["whatsapp", "instagram", "facebook"].includes(provider);

  return <div className="central-reply-composer">
    {quickReplies.length > 0 && <div className="central-quick-reply-strip"><span><MessageSquareText size={14}/>Respostas rápidas</span><div>{quickReplies.slice(0, 8).map((reply) => <button type="button" key={reply.id} onClick={() => setBody(reply.body)} title={reply.body}>{reply.title}</button>)}</div></div>}
    <textarea
      value={body}
      onChange={(event) => setBody(event.target.value)}
      placeholder={supported ? "Digite a resposta para o cliente..." : "Este canal ainda não aceita resposta pelo sistema."}
      maxLength={4096}
      disabled={!supported || loading === "send"}
      rows={3}
    />
    <div className="central-reply-composer-footer">
      <div className="central-reply-composer-status">
        <small>{body.length}/4096</small>
        {warning && <span className="central-reply-warning"><TriangleAlert size={13}/>{warning}</span>}
        {message && <span>{message}</span>}
      </div>
      <div className="central-reply-composer-actions">
        <button type="button" className="button ghost compact-button" onClick={suggest} disabled={!supported || Boolean(loading)}>{loading === "nexus" ? <LoaderCircle className="spin" size={15}/> : <Bot size={15}/>}Gerar com Nexus</button>
        <button type="button" className="button gold compact-button" onClick={send} disabled={!supported || !body.trim() || Boolean(loading)}>{loading === "send" ? <LoaderCircle className="spin" size={15}/> : <Send size={15}/>}Enviar</button>
      </div>
    </div>
  </div>;
}
