"use client";

import { CalendarClock, Check, ChevronLeft, LoaderCircle, MessageCircle, PhoneOff, RotateCcw, ShoppingBag, SkipForward, ThumbsDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";

type WorkflowAction = "called" | "skipped" | "lost_contact" | "no_response" | "converted_sale" | "preferred_wait" | "not_interested_month" | "still_using" | "product_ended" | "no_money" | "stopped_using";

function isResponseCheck(opportunity: SalesOpportunity) {
  if (opportunity.last_feedback_status !== "contacted") return false;
  if (!opportunity.feedback_next_action_on) return true;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return opportunity.feedback_next_action_on <= today;
}

function brazilTomorrow() {
  const date = new Date(Date.now() + 86_400_000);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function CompanySalesQueueActions({ opportunity }: { opportunity: SalesOpportunity }) {
  const router = useRouter();
  const [loading, setLoading] = useState<WorkflowAction | null>(null);
  const [answered, setAnswered] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<WorkflowAction | null>(null);
  const [nextDate, setNextDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const responseCheck = isResponseCheck(opportunity);
  const tomorrow = brazilTomorrow();

  async function save(action: WorkflowAction) {
    if (loading) return;
    if (["preferred_wait", "still_using", "no_money"].includes(action) && (!nextDate || nextDate < tomorrow)) {
      setMessage("Escolha a data combinada com o cliente antes de salvar.");
      return;
    }
    setLoading(action);
    setMessage(null);
    try {
      const response = await fetch(`/api/customers/${opportunity.customer_id}/sales-opportunities`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflow_action: action, next_action_on: nextDate || null, recommended_product_id: opportunity.recommended_product_id, opportunity_group: opportunity.opportunity_group, opportunity_subtype: opportunity.opportunity_subtype }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar a fila.");
      setMessage(action === "called" ? "Contato registrado. Confira a resposta daqui a 6 dias, se não houver retorno antes." : action === "no_response" ? "Sem resposta registrado. Próxima tentativa limitada pela regra de 6/30 dias." : action === "lost_contact" || action === "stopped_using" ? "Retirado da fila ativa." : action === "converted_sale" ? "Conversão registrada." : ["preferred_wait", "still_using", "no_money"].includes(action) ? `Próximo contato: ${nextDate}.` : "Resultado registrado.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a fila.");
    } finally {
      setLoading(null);
    }
  }

  const button = (action: WorkflowAction, label: string, Icon: typeof Check, tone = "") => (
    <button type="button" className={`company-queue-action ${tone}`} disabled={Boolean(loading)} onClick={() => void save(action)}>
      {loading === action ? <LoaderCircle className="spin" size={13} /> : <Icon size={13} />}{label}
    </button>
  );

  const scheduleChoice = (action: WorkflowAction, label: string, Icon: typeof Check) => (
    <button type="button" className={`company-queue-action ${selectedOutcome === action ? "selected" : ""}`} aria-pressed={selectedOutcome === action} disabled={Boolean(loading)} onClick={() => { setSelectedOutcome(action); setMessage(null); }}>
      <Icon size={15} />{label}
    </button>
  );

  const dateHint = selectedOutcome === "still_using" ? "Quando será melhor perguntar se o produto está acabando?" : selectedOutcome === "no_money" ? "Em que dia a pessoa pediu para conversar de novo?" : "Qual foi a data combinada para a próxima conversa?";

  return <div className="company-queue-workflow">
    {answered ? <>
      <div className="company-queue-heading"><div><span>O cliente respondeu</span><strong>Como terminou a conversa?</strong></div><button type="button" className="company-queue-action quiet" onClick={() => { setAnswered(false); setSelectedOutcome(null); setMessage(null); }}><ChevronLeft size={14} />Voltar</button></div>
      <div className="company-queue-outcomes">
        {button("converted_sale", "Virou venda", ShoppingBag, "success")}
        {button("product_ended", "Produto acabando", Check, "success")}
        {scheduleChoice("still_using", "Ainda está usando", CalendarClock)}
        {scheduleChoice("preferred_wait", "Comprar depois", CalendarClock)}
        {scheduleChoice("no_money", "Sem dinheiro agora", CalendarClock)}
        {button("stopped_using", "Parou de usar", ThumbsDown)}
        {button("not_interested_month", "Não tem interesse", ThumbsDown)}
      </div>
      {selectedOutcome ? <div className="company-queue-schedule"><label htmlFor={`next-contact-${opportunity.customer_id}`}>{dateHint}</label><div><input id={`next-contact-${opportunity.customer_id}`} type="date" min={tomorrow} value={nextDate} onChange={(event) => { setNextDate(event.target.value); setMessage(null); }} /><button type="button" disabled={Boolean(loading) || !nextDate || nextDate < tomorrow} onClick={() => void save(selectedOutcome)}>{loading === selectedOutcome ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Salvar retorno</button></div><small>Até essa data, o cliente fica fora de “Falar agora”.</small></div> : null}
    </> : responseCheck ? <>
      <div className="company-queue-stage"><RotateCcw size={13} /> Retorno do contato</div>
      <div className="company-queue-actions">
        <button type="button" className="company-queue-action success" onClick={() => setAnswered(true)}><Check size={13} />Respondeu</button>
        {button("no_response", "Não respondeu", MessageCircle)}
      </div>
    </> : <div className="company-queue-actions">
      {button("called", "Chamei", MessageCircle, "primary")}
      <button type="button" className="company-queue-action success" onClick={() => setAnswered(true)}><Check size={13} />Respondeu</button>
      {button("skipped", "Pular", SkipForward)}
      {button("lost_contact", "Perdi contato", PhoneOff, "danger")}
    </div>}
    {message ? <small className="company-queue-message">{message}</small> : null}
  </div>;
}
