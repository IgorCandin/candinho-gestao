"use client";

import { useState } from "react";
import { CalendarCheck2, CircleDollarSign, LoaderCircle, PackageCheck, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão", "Link de Pagamento", "Pagamento fracionado"] as const;

type ActionMode = "paid" | "delivered" | "cancel" | null;

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function FitnessSaleActions({
  saleId,
  generalStatus,
  paymentStatus,
  deliveryStatus,
}: {
  saleId: string;
  generalStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ActionMode>(null);
  const [paidOn, setPaidOn] = useState(todayInSaoPaulo);
  const [deliveredOn, setDeliveredOn] = useState(todayInSaoPaulo);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("Pix");
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const cancelled = generalStatus === "cancelled";
  const canPay = !cancelled && paymentStatus !== "received";
  const canDeliver = !cancelled && deliveryStatus !== "delivered";

  async function runRpc(name: string, args: Record<string, unknown>, success: string) {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await createClient().rpc(name, args);
      if (error) throw error;
      setMessage(success);
      setMode(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setLoading(false);
    }
  }

  if (cancelled) {
    return (
      <div className="sale-actions-complete">
        <Trash2 size={22} />
        <div><strong>Venda cancelada</strong><span>Reservas e estoque foram ajustados automaticamente.</span></div>
      </div>
    );
  }

  return (
    <div className="sale-status-actions">
      {!canPay && !canDeliver ? (
        <div className="sale-actions-complete">
          <CalendarCheck2 size={22} />
          <div><strong>Venda finalizada</strong><span>Pagamento e entrega já foram registrados.</span></div>
        </div>
      ) : (
        <div className="sale-action-buttons">
          {canPay && <button className="button gold" type="button" onClick={() => setMode(mode === "paid" ? null : "paid")}><CircleDollarSign size={17} />Recebido</button>}
          {canDeliver && <button className="button ghost" type="button" onClick={() => setMode(mode === "delivered" ? null : "delivered")}><PackageCheck size={17} />Entregue</button>}
        </div>
      )}

      <div className="sale-action-buttons">
        <button className="button danger" type="button" onClick={() => setMode(mode === "cancel" ? null : "cancel")}><Trash2 size={17} />Cancelar venda</button>
      </div>

      {mode === "paid" && (
        <form className="sale-action-form" onSubmit={(event) => { event.preventDefault(); void runRpc("mark_fitness_sale_paid", { p_sale_id: saleId, p_paid_on: paidOn, p_payment_method: paymentMethod }, "Pagamento registrado."); }}>
          <div className="sale-action-form-head"><div><strong>Registrar recebimento</strong><span>Informe quando e como o pagamento entrou.</span></div><button className="icon-button" type="button" aria-label="Fechar" onClick={() => setMode(null)}><X size={17} /></button></div>
          <div className="sale-action-fields">
            <label className="field"><span>Data</span><input className="input" type="date" required value={paidOn} onChange={(event) => setPaidOn(event.target.value)} /></label>
            <label className="field"><span>Forma</span><select className="select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as (typeof PAYMENT_METHODS)[number])}>{PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}</select></label>
          </div>
          <button className="button gold" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <CircleDollarSign size={17} />}Confirmar recebimento</button>
        </form>
      )}

      {mode === "delivered" && (
        <form className="sale-action-form" onSubmit={(event) => { event.preventDefault(); void runRpc("mark_fitness_sale_delivered", { p_sale_id: saleId, p_delivered_on: deliveredOn }, "Entrega registrada e estoque atualizado."); }}>
          <div className="sale-action-form-head"><div><strong>Registrar entrega</strong><span>A entrega efetiva a baixa das reservas no estoque.</span></div><button className="icon-button" type="button" aria-label="Fechar" onClick={() => setMode(null)}><X size={17} /></button></div>
          <div className="sale-action-fields one-field"><label className="field"><span>Data</span><input className="input" type="date" required value={deliveredOn} onChange={(event) => setDeliveredOn(event.target.value)} /></label></div>
          <button className="button gold" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <PackageCheck size={17} />}Confirmar entrega</button>
        </form>
      )}

      {mode === "cancel" && (
        <form className="sale-action-form danger-form" onSubmit={(event) => { event.preventDefault(); void runRpc("cancel_fitness_sale", { p_sale_id: saleId, p_reason: cancelReason.trim() || null }, "Venda cancelada e estoque ajustado."); }}>
          <div className="sale-action-form-head"><div><strong>Cancelar venda</strong><span>Reservas ou baixas de estoque serão estornadas automaticamente.</span></div><button className="icon-button" type="button" aria-label="Fechar" onClick={() => setMode(null)}><X size={17} /></button></div>
          <div className="sale-action-fields one-field"><label className="field"><span>Motivo</span><textarea className="textarea" rows={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></label></div>
          <button className="button danger" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}Confirmar cancelamento</button>
        </form>
      )}

      {message && <p className="sale-action-message" aria-live="polite">{message}</p>}
    </div>
  );
}
