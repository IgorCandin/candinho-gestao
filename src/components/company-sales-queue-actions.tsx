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

export function CompanySalesQueueActions({ opportunity }: { opportunity: SalesOpportunity }) {
  const router = useRouter();
  const [loading, setLoading] = useState<WorkflowAction | null>(null);
  const [answered, setAnswered] = useState(false);
  const [nextDate, setNextDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const responseCheck = isResponseCheck(opportunity);

  async function save(action: WorkflowAction) {
    if (loading) return;
    if (["preferred_wait", "still_using", "no_money"].includes(action) && !nextDate) {
      setMessage("Escolha a data combinada com o cliente antes de salvar.");
      return;
    }
    setLoading(action);
    setMessage(null);
    try {
      const response = await fetch(`/api/customers/${opportunity.customer_id}/sales-opportunities`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflow_action: action, next_action_on: nextDate || null, recommended_product_id: opportunity.recommended_product_id, opportunity_group: opportunity.opportunity_group, opportunity_subtype: opportunity.opportunity_subtype }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar a fila.");
      setMessage(action === "called" ? "Contato registrado. Confira a resposta daqui a 6 dias, se não houver retorno antes." : action === "no_response" ? "Sem resposta registrado. Próxima tentativa limitada pela regra de 6/30 dias." : action === "lost_contact" || action === "stopped_using" ? "Retirado da fila ativa." : action === "converted_sale" ? "Conversão registrada." : nextDate ? `Próximo contato: ${nextDate}.` : "Resultado registrado.");
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

  return <div className="company-queue-workflow">
    {answered ? <>
      <div className="company-queue-stage"><Check size={13} /> Respondeu — qual foi o resultado?</div>
      <label className="company-queue-stage">Data combinada para voltar, quando aplicável <input type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} /></label>
      <div className="company-queue-actions">
        {button("converted_sale", "Virou venda", ShoppingBag, "success")}
        {button("product_ended", "Está acabando", ShoppingBag, "success")}
        {button("still_using", "Ainda está usando", CalendarClock)}
        {button("preferred_wait", "Comprar depois", CalendarClock)}
        {button("no_money", "Sem dinheiro agora", CalendarClock)}
        {button("stopped_using", "Parou de usar", ThumbsDown)}
        {button("not_interested_month", "Não quer", ThumbsDown)}
        <button type="button" className="company-queue-action quiet" onClick={() => setAnswered(false)}><ChevronLeft size={13} />Voltar</button>
      </div>
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
