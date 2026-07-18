"use client";

import { LoaderCircle, MessageSquarePlus, Power, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CentralQuickReply } from "@/lib/central-data";

const scopeLabels: Record<string, string> = { company: "Company", supplements: "Suplementos", fitness: "Fitness", marketing: "Marketing" };

export function CentralQuickRepliesManager({ initialReplies }: { initialReplies: CentralQuickReply[] }) {
  const router = useRouter();
  const [scope, setScope] = useState("company");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createReply() {
    if (!title.trim() || !body.trim()) return;
    setLoading("create"); setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("central_quick_replies").insert({ operation_scope: scope, title: title.trim(), body: body.trim(), sort_order: 100 });
      if (error) throw error;
      setTitle(""); setBody("");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível criar a resposta rápida."); }
    finally { setLoading(null); }
  }

  async function toggle(reply: CentralQuickReply) {
    setLoading(reply.id); setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("central_quick_replies").update({ active: !reply.active }).eq("id", reply.id);
      if (error) throw error;
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a resposta."); }
    finally { setLoading(null); }
  }

  async function remove(reply: CentralQuickReply) {
    if (!window.confirm(`Excluir a resposta rápida “${reply.title}”?`)) return;
    setLoading(reply.id); setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("central_quick_replies").delete().eq("id", reply.id);
      if (error) throw error;
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível excluir a resposta."); }
    finally { setLoading(null); }
  }

  return <>
    <article className="panel quick-reply-create-panel">
      <div className="panel-head"><div><h2>Nova resposta rápida</h2><p>Crie textos reutilizáveis para agilizar o atendimento sem automatizar o envio.</p></div><MessageSquarePlus size={20}/></div>
      <div className="panel-body quick-reply-create-form">
        <label className="field"><span>Operação</span><select className="input" value={scope} onChange={(event) => setScope(event.target.value)}><option value="company">Company</option><option value="supplements">Suplementos</option><option value="fitness">Fitness</option><option value="marketing">Marketing</option></select></label>
        <label className="field"><span>Título</span><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Entender objetivo" maxLength={80}/></label>
        <label className="field quick-reply-body-field"><span>Mensagem</span><textarea className="input" rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Texto que será carregado no campo de resposta" maxLength={2000}/></label>
        <button className="button gold" type="button" onClick={createReply} disabled={loading === "create" || !title.trim() || !body.trim()}>{loading === "create" ? <LoaderCircle className="spin" size={15}/> : <MessageSquarePlus size={15}/>}Criar resposta</button>
        {message && <p className="form-error">{message}</p>}
      </div>
    </article>

    <section className="quick-reply-list">
      {initialReplies.length === 0 ? <article className="panel"><div className="empty"><MessageSquarePlus size={24}/><strong>Nenhuma resposta rápida</strong>Crie a primeira acima.</div></article> : initialReplies.map((reply) => <article className={`panel quick-reply-card ${reply.active ? "" : "inactive"}`} key={reply.id}>
        <div className="panel-head"><div><span className="badge gray">{scopeLabels[reply.operation_scope] ?? reply.operation_scope}</span><h3>{reply.title}</h3></div><span className={`badge ${reply.active ? "green" : "gray"}`}>{reply.active ? "Ativa" : "Pausada"}</span></div>
        <div className="panel-body"><p>{reply.body}</p><div className="quick-reply-card-actions"><button className="button ghost compact-button" type="button" onClick={() => toggle(reply)} disabled={loading === reply.id}>{loading === reply.id ? <LoaderCircle className="spin" size={14}/> : <Power size={14}/>} {reply.active ? "Pausar" : "Ativar"}</button><button className="button ghost compact-button danger-button" type="button" onClick={() => remove(reply)} disabled={loading === reply.id}><Trash2 size={14}/>Excluir</button></div></div>
      </article>)}
    </section>
  </>;
}
