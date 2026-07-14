"use client";

import { CalendarClock, CheckCircle2, LoaderCircle, MessageCircle, NotebookPen, RotateCcw, SearchX, ShoppingBag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import type { CustomerInteraction, SaleRow } from "@/lib/types";

type Mode = "contact" | "follow_up" | "post_sale" | "lost" | null;
const CHANNELS = ["WhatsApp", "Ligação", "Instagram", "Presencial", "Outro"] as const;

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

const labels: Record<string, string> = {
  contact: "Contato",
  follow_up: "Retorno",
  post_sale: "Pós-venda",
  note: "Anotação",
  lost: "Contato perdido",
};

export function CustomerCRMPanel({ customerId, sales, interactions }: { customerId: string; sales: SaleRow[]; interactions: CustomerInteraction[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [followupId, setFollowupId] = useState<string | null>(null);
  const [contactOn, setContactOn] = useState(todayInSaoPaulo);
  const [dueOn, setDueOn] = useState(todayInSaoPaulo);
  const [nextContactOn, setNextContactOn] = useState("");
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("WhatsApp");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [saleId, setSaleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const planned = useMemo(() => interactions.filter((item) => item.status === "planned"), [interactions]);
  const history = useMemo(() => interactions.filter((item) => item.status !== "planned"), [interactions]);

  function reset(nextMode: Mode = null) {
    setMode(nextMode);
    setFollowupId(null);
    setOutcome("");
    setNotes("");
    setSaleId("");
    setNextContactOn("");
    setMessage(null);
  }

  function completeFollowup(item: CustomerInteraction) {
    reset("contact");
    setFollowupId(item.id);
    setNotes(item.notes ?? "");
  }

  async function submitFollowup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("schedule_customer_followup", {
        p_customer_id: customerId,
        p_due_on: dueOn,
        p_notes: notes.trim() || null,
      });
      if (error) throw error;
      setMessage("Retorno agendado.");
      reset(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível agendar o retorno.");
    } finally {
      setLoading(false);
    }
  }

  async function submitInteraction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode || mode === "follow_up") return;
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("register_customer_interaction", {
        p_customer_id: customerId,
        p_interaction_type: mode,
        p_contact_on: contactOn,
        p_channel: channel,
        p_outcome: outcome.trim() || null,
        p_notes: notes.trim() || null,
        p_sale_id: mode === "post_sale" && saleId ? saleId : null,
        p_next_contact_on: nextContactOn || null,
        p_followup_id: followupId,
      });
      if (error) throw error;
      setMessage(mode === "lost" ? "Contato marcado como perdido." : "Interação registrada.");
      reset(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar a interação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="panel customer-crm-panel">
      <div className="panel-head">
        <div><h2>Relacionamento e pós-venda</h2><p>Registre contatos e não deixe retornos se perderem.</p></div>
        <strong>{interactions.length}</strong>
      </div>
      <div className="panel-body customer-crm-body">
        <div className="customer-crm-actions">
          <button className={`button ${mode === "contact" ? "gold" : "ghost"}`} type="button" onClick={() => reset(mode === "contact" ? null : "contact")}><MessageCircle size={16} />Registrar contato</button>
          <button className={`button ${mode === "follow_up" ? "gold" : "ghost"}`} type="button" onClick={() => reset(mode === "follow_up" ? null : "follow_up")}><CalendarClock size={16} />Agendar retorno</button>
          <button className={`button ${mode === "post_sale" ? "gold" : "ghost"}`} type="button" onClick={() => reset(mode === "post_sale" ? null : "post_sale")}><ShoppingBag size={16} />Pós-venda</button>
          <button className={`button ${mode === "lost" ? "danger" : "ghost"}`} type="button" onClick={() => reset(mode === "lost" ? null : "lost")}><SearchX size={16} />Contato perdido</button>
        </div>

        {mode === "follow_up" && (
          <form className="crm-action-form" onSubmit={submitFollowup}>
            <div className="sale-action-form-head"><div><strong>Agendar retorno</strong><span>O cliente aparecerá automaticamente no radar na data escolhida.</span></div><button className="icon-button" type="button" aria-label="Fechar" onClick={() => reset()}><X size={17} /></button></div>
            <div className="form-grid-two">
              <label className="field"><span>Data do retorno</span><input className="input" type="date" required value={dueOn} onChange={(event) => setDueOn(event.target.value)} /></label>
              <label className="field field-span-two"><span>Motivo ou lembrete</span><textarea className="textarea" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            </div>
            <button className="button gold" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <CalendarClock size={17} />}{loading ? "Salvando" : "Agendar retorno"}</button>
          </form>
        )}

        {mode && mode !== "follow_up" && (
          <form className={`crm-action-form ${mode === "lost" ? "danger-form" : ""}`} onSubmit={submitInteraction}>
            <div className="sale-action-form-head">
              <div><strong>{followupId ? "Concluir retorno" : labels[mode]}</strong><span>{mode === "post_sale" ? "Vincule a venda e registre como o cliente está usando o produto." : mode === "lost" ? "Use quando não houver mais perspectiva de contato." : "Registre o que aconteceu e já deixe o próximo passo marcado."}</span></div>
              <button className="icon-button" type="button" aria-label="Fechar" onClick={() => reset()}><X size={17} /></button>
            </div>
            <div className="form-grid-two">
              <label className="field"><span>Data</span><input className="input" type="date" required value={contactOn} onChange={(event) => setContactOn(event.target.value)} /></label>
              <label className="field"><span>Canal</span><select className="select" value={channel} onChange={(event) => setChannel(event.target.value as (typeof CHANNELS)[number])}>{CHANNELS.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
              {mode === "post_sale" && <label className="field field-span-two"><span>Venda relacionada</span><select className="select" value={saleId} onChange={(event) => setSaleId(event.target.value)}><option value="">Sem venda específica</option>{sales.map((sale) => <option value={sale.id} key={sale.id}>{formatDateOnly(sale.business_date)} · {sale.product_summary ?? "Venda"} · {formatCurrency(sale.total_amount)}</option>)}</select></label>}
              <label className="field field-span-two"><span>{mode === "lost" ? "Motivo" : "Resultado do contato"}</span><input className="input" required={mode === "lost"} value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder={mode === "lost" ? "Ex.: não responde, desistiu, número inválido" : "Ex.: pediu para retornar, gostou do produto, fechou compra"} /></label>
              <label className="field field-span-two"><span>Observações</span><textarea className="textarea" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
              {mode !== "lost" && <label className="field"><span>Próximo retorno (opcional)</span><input className="input" type="date" value={nextContactOn} onChange={(event) => setNextContactOn(event.target.value)} /></label>}
            </div>
            <button className={`button ${mode === "lost" ? "danger" : "gold"}`} disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : mode === "lost" ? <SearchX size={17} /> : <CheckCircle2 size={17} />}{loading ? "Salvando" : followupId ? "Concluir retorno" : "Registrar"}</button>
          </form>
        )}

        {message && <p className="sale-action-message">{message}</p>}

        {planned.length > 0 && (
          <section className="crm-followup-section">
            <div className="crm-section-title"><div><CalendarClock size={17} /><strong>Retornos agendados</strong></div><span>{planned.length}</span></div>
            <div className="crm-followup-list">
              {planned.map((item) => (
                <div className="crm-followup-item" key={item.id}>
                  <div><strong>{formatDateOnly(item.due_at)}</strong><span>{item.notes ?? "Retorno agendado"}</span></div>
                  <button className="button ghost compact-button" type="button" onClick={() => completeFollowup(item)}><CheckCircle2 size={15} />Concluir</button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="crm-timeline-section">
          <div className="crm-section-title"><div><NotebookPen size={17} /><strong>Histórico de relacionamento</strong></div><span>{history.length}</span></div>
          {history.length === 0 ? <div className="empty compact"><strong>Nenhum contato registrado</strong>Use os botões acima para iniciar o histórico.</div> : (
            <div className="crm-timeline">
              {history.map((item) => (
                <div className="crm-timeline-item" key={item.id}>
                  <div className="crm-timeline-marker"><RotateCcw size={14} /></div>
                  <div className="crm-timeline-copy">
                    <div><Badge value={item.interaction_type} /><time>{formatDate(item.occurred_at ?? item.completed_at ?? item.created_at)}</time></div>
                    <strong>{item.outcome ?? labels[item.interaction_type] ?? "Interação"}</strong>
                    {item.notes && <p>{item.notes}</p>}
                    <small>{[item.channel, item.sale_product_summary, item.created_by_name].filter(Boolean).join(" · ")}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
