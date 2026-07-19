"use client";

import { Bot, FileText, ImagePlus, LoaderCircle, MessageSquareText, Paperclip, Send, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CentralQuickReply } from "@/lib/central-data";
import { createClient } from "@/lib/supabase/client";

function safeFilename(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload?.error || "A operação não pôde ser concluída.");
  return payload;
}

export function CentralReplyComposer({ conversationId, provider, quickReplies = [] }: { conversationId: string; provider: string; quickReplies?: CentralQuickReply[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<"send" | "nexus" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function suggest() {
    setLoading("nexus"); setMessage(null); setWarning(null);
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
      setMessage(error instanceof Error ? error.message : "Não foi possível gerar a sugestão.");
    } finally {
      setLoading(null);
    }
  }

  async function send() {
    const text = body.trim();
    if (!text && !file) return;
    if (file && provider !== "whatsapp") {
      setMessage("Nesta versão, anexos pelo Inbox estão disponíveis para WhatsApp.");
      return;
    }

    setLoading("send"); setMessage(null); setWarning(null);
    let uploadedPath: string | null = null;

    try {
      if (file) {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) throw new Error("Sessão expirada.");

        uploadedPath = `outbox/${userId}/${conversationId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
        const upload = await supabase.storage.from("central-media").upload(uploadedPath, file, {
          upsert: false,
          contentType: file.type || undefined,
        });
        if (upload.error) throw upload.error;
      }

      await postJson<{ sent?: boolean }>("/api/central/meta-send", {
        conversation_id: conversationId,
        body: text,
        media_storage_path: uploadedPath,
        media_mime_type: file?.type || null,
        media_filename: file?.name || null,
      });

      setBody("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setMessage("Mensagem enviada e registrada no histórico.");
      router.refresh();
    } catch (error) {
      if (uploadedPath) {
        const supabase = createClient();
        await supabase.storage.from("central-media").remove([uploadedPath]);
      }
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a mensagem.");
    } finally {
      setLoading(null);
    }
  }

  const supported = ["whatsapp", "instagram", "facebook"].includes(provider);

  return <div className="central-reply-composer">
    {quickReplies.length > 0 && <div className="central-quick-reply-strip"><span><MessageSquareText size={14}/>Respostas rápidas</span><div>{quickReplies.slice(0, 8).map((reply) => <button type="button" key={reply.id} onClick={() => setBody(reply.body)} title={reply.body}>{reply.title}</button>)}</div></div>}

    {file && <div className="central-attachment-preview">
      <span>{file.type.startsWith("image/") ? <ImagePlus size={16}/> : <FileText size={16}/>}<strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB</small></span>
      <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}><X size={15}/></button>
    </div>}

    <textarea
      value={body}
      onChange={(event) => setBody(event.target.value)}
      placeholder={supported ? (file ? "Adicione uma legenda (opcional)..." : "Digite a resposta para o cliente...") : "Este canal ainda não aceita resposta pelo sistema."}
      maxLength={4096}
      disabled={!supported || loading === "send"}
      rows={3}
    />

    <input
      ref={fileRef}
      type="file"
      hidden
      accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"
      onChange={(event) => setFile(event.target.files?.[0] ?? null)}
    />

    <div className="central-reply-composer-footer">
      <div className="central-reply-composer-status">
        <small>{body.length}/4096</small>
        {warning && <span className="central-reply-warning"><TriangleAlert size={13}/>{warning}</span>}
        {message && <span>{message}</span>}
      </div>
      <div className="central-reply-composer-actions">
        {provider === "whatsapp" && <button type="button" className="button ghost compact-button" onClick={() => fileRef.current?.click()} disabled={Boolean(loading)}><Paperclip size={15}/>Anexar</button>}
        <button type="button" className="button ghost compact-button" onClick={suggest} disabled={!supported || Boolean(loading)}>{loading === "nexus" ? <LoaderCircle className="spin" size={15}/> : <Bot size={15}/>}Gerar com Nexus</button>
        <button type="button" className="button gold compact-button" onClick={send} disabled={!supported || (!body.trim() && !file) || Boolean(loading)}>{loading === "send" ? <LoaderCircle className="spin" size={15}/> : <Send size={15}/>}Enviar</button>
      </div>
    </div>
  </div>;
}
