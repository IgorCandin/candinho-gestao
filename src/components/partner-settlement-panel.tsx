"use client";

import { CheckCircle2, LoaderCircle, WalletCards, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { PartnerOverview, PartnerSettlement } from "@/lib/types";

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function PartnerSettlementPanel({
  partner,
  settlements,
}: {
  partner: PartnerOverview;
  settlements: PartnerSettlement[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [settledOn, setSettledOn] = useState(todayInSaoPaulo());
  const [periodEnd, setPeriodEnd] = useState(todayInSaoPaulo());
  const [amount, setAmount] = useState(partner.estimated_reward_amount ? String(partner.estimated_reward_amount) : "");
  const [description, setDescription] = useState(partner.reward_description ?? "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (["gift_per_sales", "none"].includes(partner.reward_type)) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("register_partner_settlement", {
        p_partner_id: partner.id,
        p_settled_on: settledOn,
        p_period_end: periodEnd,
        p_reward_amount: amount ? Number(amount) : null,
        p_reward_description: description || null,
        p_notes: notes || null,
      });
      if (error) throw error;
      setMessage("Acerto financeiro registrado.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar o acerto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="panel partner-settlement-panel">
      <div className="panel-head">
        <div>
          <h2>Acertos financeiros</h2>
          <p>Use esta área somente quando a parceria envolve pagamento, comissão ou fechamento financeiro.</p>
        </div>
        <button className="button gold compact-button" type="button" onClick={() => setOpen(!open)}>
          <WalletCards size={16} /> Registrar acerto
        </button>
      </div>
      <div className="panel-body partner-settlement-body">
        {open && (
          <form className="crm-action-form" onSubmit={submit}>
            <div className="sale-action-form-head">
              <div><strong>Novo acerto financeiro</strong><span>Período iniciado em {formatDateOnly(partner.cycle_start)}.</span></div>
              <button className="icon-button" type="button" onClick={() => setOpen(false)}><X size={17} /></button>
            </div>
            <div className="form-grid-two">
              <label className="field"><span>Data do acerto</span><input className="input" type="date" required value={settledOn} onChange={(e) => setSettledOn(e.target.value)} /></label>
              <label className="field"><span>Contabilizar vendas até</span><input className="input" type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></label>
              {!['fixed_per_sale', 'percentage'].includes(partner.reward_type) && (
                <label className="field"><span>Valor pago (opcional)</span><input className="input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              )}
              <label className="field field-span-two"><span>Descrição</span><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
              <label className="field field-span-two"><span>Observações</span><textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            </div>
            <button className="button gold" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
              {loading ? "Salvando" : "Confirmar acerto"}
            </button>
          </form>
        )}
        {message && <p className="sale-action-message">{message}</p>}
        {settlements.length === 0 ? (
          <div className="empty compact"><WalletCards size={24} /><strong>Nenhum acerto financeiro registrado</strong>O primeiro ciclo começa em {formatDateOnly(partner.cycle_start)}.</div>
        ) : (
          <div className="partner-settlement-list">
            {settlements.map((item) => (
              <div className="partner-settlement-item" key={item.id}>
                <div>
                  <strong>{formatDateOnly(item.settled_on)}</strong>
                  <span>{formatDateOnly(item.period_start)} a {formatDateOnly(item.period_end)} · {item.sale_count} venda(s)</span>
                  <small>{item.reward_description ?? "Acerto registrado"}{item.notes ? ` · ${item.notes}` : ""}</small>
                </div>
                <div><strong>{formatCurrency(item.reward_amount)}</strong><span>{formatCurrency(item.gross_sales)} em vendas</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
