"use client";

import { LoaderCircle, Plus, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CentralContactCreateForm({ scopes }: { scopes: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      const payload = {
        operation_scope: String(form.get("operation_scope") || scopes[0] || "company"),
        display_name: String(form.get("display_name") || "").trim(),
        phone: String(form.get("phone") || "").trim() || null,
        email: String(form.get("email") || "").trim().toLowerCase() || null,
        instagram_username: String(form.get("instagram_username") || "").trim().replace(/^@/, "") || null,
        preferred_channel: String(form.get("preferred_channel") || "").trim() || null,
        notes: String(form.get("notes") || "").trim() || null,
      };
      if (!payload.display_name) throw new Error("Informe o nome do contato.");
      const { error } = await supabase.from("central_contacts").insert(payload);
      if (error) throw error;
      event.currentTarget.reset();
      setMessage("Contato criado no Candinho Central.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o contato.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="central-contact-create">
    <button type="button" className="button gold" onClick={() => setOpen((value) => !value)}>
      <UserRoundPlus size={16}/>{open ? "Fechar" : "Novo contato"}
    </button>
    {open && <form className="central-contact-create-form panel" onSubmit={submit}>
      <div className="panel-head"><div><h2>Novo contato</h2><p>Cadastre alguém manualmente antes mesmo de receber uma mensagem pela Meta.</p></div><Plus size={18}/></div>
      <div className="panel-body central-contact-create-grid">
        <label className="field"><span>Nome</span><input className="input" name="display_name" required placeholder="Nome do cliente"/></label>
        <label className="field"><span>Espaço</span><select className="select" name="operation_scope" defaultValue={scopes[0] ?? "company"}>{scopes.map((scope) => <option value={scope} key={scope}>{scope === "company" ? "Candinho Company" : scope === "supplements" ? "Suplementos" : "Fitness"}</option>)}</select></label>
        <label className="field"><span>Telefone</span><input className="input" name="phone" placeholder="(32) 99999-9999"/></label>
        <label className="field"><span>E-mail</span><input className="input" type="email" name="email" placeholder="cliente@email.com"/></label>
        <label className="field"><span>Instagram</span><input className="input" name="instagram_username" placeholder="@usuario"/></label>
        <label className="field"><span>Canal preferido</span><select className="select" name="preferred_channel" defaultValue=""><option value="">Não definido</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option></select></label>
        <label className="field central-contact-create-notes"><span>Observação</span><textarea className="textarea" name="notes" rows={3} placeholder="Objetivo, preferência ou contexto importante..."/></label>
        <div className="central-contact-create-actions"><button className="button gold" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16}/> : <Plus size={16}/>}Criar contato</button></div>
      </div>
    </form>}
    {message && <p className="central-action-message">{message}</p>}
  </div>;
}
