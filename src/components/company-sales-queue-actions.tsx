"use client";

import { CalendarClock, Check, ChevronLeft, LoaderCircle, MessageCircle, PhoneOff, RotateCcw, ShoppingBag, SkipForward, ThumbsDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";

type WorkflowAction = "called" | "skipped" | "lost_contact" | "no_response" | "converted_sale" | "preferred_wait" | "not_interested_month";

function isResponseCheck(opportunity: SalesOpportunity) {
  if (opportunity.last_feedback_status !== "contacted") return false;
  if (!opportunity.feedback_next_action_on) return true;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return opportunity.feedback_next_action_on <= today;
}

export function CompanySalesQueueActions({ opportunity, relatedOpportunities = [opportunity] }: { opportunity: SalesOpportunity; relatedOpportunities?: SalesOpportunity[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<WorkflowAction | null>(null);
  const [answered, setAnswered] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const responseCheck = isResponseCheck(opportunity);

  async function save(action: WorkflowAction) {
    if (loading) return;
    setLoading(action);
    setMessage(null);
    try {
      const responses = await Promise.all(relatedOpportunities.map(async (item) => {
        const response = await fetch(`/api/customers/${item.customer_id}/sales-opportunities`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflow_action: action, recommended_product_id: item.recommended_product_id, opportunity_group: item.opportunity_group, opportunity_subtype: item.opportunity_subtype }) });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar a fila.");
        return payload;
      }));
      void responses;
      setMessage(action === "called" ? "Contato registrado. Retorno criado para amanhã." : action === "lost_contact" ? "Retirado da fila ativa." : action === "converted_sale" ? "Conversão registrada." : "Cliente movido para a fila de 30 dias.");
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
    {responseCheck ? answered ? <>
      <div className="company-queue-stage"><Check size={13} /> Respondeu — qual foi o resultado?</div>
      <div className="company-queue-actions">
        {button("converted_sale", "Virou venda", ShoppingBag, "success")}
        {button("preferred_wait", "Preferiu esperar", CalendarClock)}
        {button("not_interested_month", "Não quer", ThumbsDown)}
        <button type="button" className="company-queue-action quiet" onClick={() => setAnswered(false)}><ChevronLeft size={13} />Voltar</button>
      </div>
    </> : <>
      <div className="company-queue-stage"><RotateCcw size={13} /> Retorno do contato</div>
      <div className="company-queue-actions">
        <button type="button" className="company-queue-action success" onClick={() => setAnswered(true)}><Check size={13} />Respondeu</button>
        {button("no_response", "Não respondeu", MessageCircle)}
      </div>
    </> : <div className="company-queue-actions">
      {button("called", "Chamei", MessageCircle, "primary")}
      {button("skipped", "Pular", SkipForward)}
      {button("lost_contact", "Perdi contato", PhoneOff, "danger")}
    </div>}
    {message ? <small className="company-queue-message">{message}</small> : null}
  </div>;
}
