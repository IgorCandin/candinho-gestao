"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SOURCES = [
  { value: "supplier", label: "Cancelado pelo fornecedor" },
  { value: "company", label: "Cancelado pela Candinho" },
  { value: "registration_error", label: "Erro de cadastro" },
] as const;

export function PurchaseOrderCancelAction({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("supplier");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (status === "received" || status === "cancelled") return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!reason.trim()) {
      setMessage("Explique o motivo do cancelamento.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("cancel_purchase_order_v2", {
        p_order_id: orderId,
        p_source: source,
        p_reason: reason.trim(),
      });

      if (error) throw error;
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível cancelar o pedido.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="button danger" type="button" onClick={() => setOpen(true)}>
        <XCircle size={16} /> Cancelar pedido
      </button>
    );
  }

  return (
    <form className="sale-action-form danger-form" onSubmit={submit}>
      <div className="sale-action-form-head">
        <div>
          <strong>Cancelar pedido</strong>
          <span>O pedido continuará no histórico e o que já foi recebido será preservado.</span>
        </div>
        <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setOpen(false)}>
          <XCircle size={16} />
        </button>
      </div>

      <div className="sale-action-fields one-field">
        <label className="field">
          <span>Quem cancelou?</span>
          <select className="select" value={source} onChange={(event) => setSource(event.target.value)}>
            {SOURCES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Motivo do cancelamento</span>
          <textarea className="textarea" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: fornecedor informou indisponibilidade dos produtos" />
        </label>
      </div>

      <button className="button danger" type="submit" disabled={loading}>
        {loading ? <LoaderCircle className="spin" size={16} /> : <XCircle size={16} />}
        {loading ? "Cancelando" : "Confirmar cancelamento"}
      </button>
      {message && <p className="sale-action-message">{message}</p>}
    </form>
  );
}
