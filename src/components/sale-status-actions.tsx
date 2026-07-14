"use client";

import { useState } from "react";
import { CalendarCheck2, CircleDollarSign, LoaderCircle, PackageCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PAYMENT_METHODS = [
  "Pix",
  "Dinheiro",
  "Cartão",
  "Link de Pagamento",
  "Pagamento fracionado",
] as const;

type ActionMode = "received" | "delivered" | null;

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export function SaleStatusActions({
  saleId,
  paymentStatus,
  deliveryStatus,
}: {
  saleId: string;
  paymentStatus: string;
  deliveryStatus: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ActionMode>(null);
  const [receivedDate, setReceivedDate] = useState(todayInSaoPaulo);
  const [deliveredDate, setDeliveredDate] = useState(todayInSaoPaulo);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("Pix");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canReceive = paymentStatus === "receivable";
  const canDeliver = deliveryStatus === "to_deliver";

  async function markReceived(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("mark_sale_received", {
        p_sale_id: saleId,
        p_received_on: receivedDate,
        p_payment_method: paymentMethod,
      });
      if (error) throw error;
      setMessage("Pagamento marcado como recebido.");
      setMode(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o pagamento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markDelivered(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("mark_sale_delivered", {
        p_sale_id: saleId,
        p_delivered_on: deliveredDate,
      });
      if (error) throw error;
      setMessage("Pedido marcado como entregue.");
      setMode(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a entrega.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canReceive && !canDeliver) {
    return (
      <div className="sale-actions-complete">
        <CalendarCheck2 size={22} />
        <div><strong>Venda finalizada</strong><span>Pagamento e entrega já foram registrados.</span></div>
      </div>
    );
  }

  return (
    <div className="sale-status-actions">
      <div className="sale-action-buttons">
        {canReceive && (
          <button className="button gold" type="button" onClick={() => setMode(mode === "received" ? null : "received")}>
            <CircleDollarSign size={17} />Recebido
          </button>
        )}
        {canDeliver && (
          <button className="button ghost" type="button" onClick={() => setMode(mode === "delivered" ? null : "delivered")}>
            <PackageCheck size={17} />Entregue
          </button>
        )}
      </div>

      {mode === "received" && (
        <form className="sale-action-form" onSubmit={markReceived}>
          <div className="sale-action-form-head">
            <div><strong>Registrar recebimento</strong><span>A data de hoje já vem selecionada, mas pode ser alterada.</span></div>
            <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setMode(null)}><X size={17} /></button>
          </div>
          <div className="sale-action-fields">
            <label className="field"><span>Data do recebimento</span><input className="input" type="date" required value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} /></label>
            <label className="field"><span>Forma de pagamento</span><select className="select" required value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as (typeof PAYMENT_METHODS)[number])}>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
          </div>
          <button className="button gold" disabled={isSubmitting} type="submit">{isSubmitting ? <LoaderCircle className="spin" size={17} /> : <CircleDollarSign size={17} />}{isSubmitting ? "Salvando" : "Confirmar recebimento"}</button>
        </form>
      )}

      {mode === "delivered" && (
        <form className="sale-action-form" onSubmit={markDelivered}>
          <div className="sale-action-form-head">
            <div><strong>Registrar entrega</strong><span>A data de hoje já vem selecionada, mas pode ser alterada.</span></div>
            <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setMode(null)}><X size={17} /></button>
          </div>
          <div className="sale-action-fields one-field">
            <label className="field"><span>Data da entrega</span><input className="input" type="date" required value={deliveredDate} onChange={(event) => setDeliveredDate(event.target.value)} /></label>
          </div>
          <button className="button gold" disabled={isSubmitting} type="submit">{isSubmitting ? <LoaderCircle className="spin" size={17} /> : <PackageCheck size={17} />}{isSubmitting ? "Salvando" : "Confirmar entrega"}</button>
        </form>
      )}

      {message && <p className="sale-action-message" aria-live="polite">{message}</p>}
    </div>
  );
}
