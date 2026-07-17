"use client";

import { CalendarPlus, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CentralAgendaUser, CentralContact } from "@/lib/central-data";

const categoryOptions = [
  ["task", "Tarefa"], ["delivery", "Entrega"], ["payment", "Cobrança"], ["follow_up", "Retorno"],
  ["post_sale", "Pós-venda"], ["supplier", "Fornecedor"], ["other", "Outro"],
];

export function CentralTaskCreateForm({ scopes, contacts, users }: { scopes: string[]; contacts: CentralContact[]; users: CentralAgendaUser[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const date = String(form.get("due_date") || "");
      const time = String(form.get("due_time") || "12:00");
      if (!date) throw new Error("Informe a data da tarefa.");
      const supabase = createClient();
      const { error } = await supabase.rpc("central_create_operational_task", {
        p_title: String(form.get("title") || "").trim(),
        p_category: String(form.get("category") || "task"),
        p_due_at: new Date(`${date}T${time}:00-03:00`).toISOString(),
        p_priority: String(form.get("priority") || "normal"),
        p_operation_scope: String(form.get("operation_scope") || scopes[0] || "company"),
        p_central_contact_id: String(form.get("central_contact_id") || "") || null,
        p_assigned_to: String(form.get("assigned_to") || "") || null,
        p_notes: String(form.get("notes") || "").trim() || null,
      });
      if (error) throw error;
      event.currentTarget.reset();
      setMessage("Tarefa criada na Agenda Central.");
      setOpen(false);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível criar a tarefa."); }
    finally { setLoading(false); }
  }

  return <div className="central-task-create">
    <button type="button" className="button gold" onClick={() => setOpen((v) => !v)}><CalendarPlus size={16}/>{open ? "Fechar" : "Nova tarefa"}</button>
    {open && <form className="central-task-create-form panel" onSubmit={submit}>
      <div className="panel-head"><div><h2>Nova tarefa</h2><p>Crie uma pendência para Company, Suplementos, Fitness ou Marketing.</p></div><Plus size={18}/></div>
      <div className="panel-body central-task-create-grid">
        <label className="field field-span-two"><span>Título</span><input className="input" name="title" required placeholder="Ex.: Retornar para cliente sobre creatina"/></label>
        <label className="field"><span>Operação</span><select className="select" name="operation_scope" defaultValue={scopes[0] ?? "company"}>{scopes.map((scope) => <option key={scope} value={scope}>{scope === "company" ? "Candinho Company" : scope === "supplements" ? "Suplementos" : scope === "fitness" ? "Fitness" : "Marketing"}</option>)}</select></label>
        <label className="field"><span>Categoria</span><select className="select" name="category" defaultValue="task">{categoryOptions.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="field"><span>Data</span><input className="input" type="date" name="due_date" required/></label>
        <label className="field"><span>Horário</span><input className="input" type="time" name="due_time" defaultValue="12:00"/></label>
        <label className="field"><span>Prioridade</span><select className="select" name="priority" defaultValue="normal"><option value="normal">Normal</option><option value="attention">Atenção</option><option value="urgent">Urgente</option></select></label>
        <label className="field"><span>Contato</span><select className="select" name="central_contact_id" defaultValue=""><option value="">Sem contato</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}</select></label>
        <label className="field"><span>Responsável</span><select className="select" name="assigned_to" defaultValue=""><option value="">Não definido</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label className="field field-span-two"><span>Observações</span><textarea className="textarea" name="notes" rows={3} placeholder="Contexto importante da tarefa..."/></label>
        <div className="central-task-create-actions field-span-two"><button className="button gold" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16}/> : <Plus size={16}/>}Criar tarefa</button></div>
      </div>
    </form>}
    {message && <p className="central-action-message">{message}</p>}
  </div>;
}
