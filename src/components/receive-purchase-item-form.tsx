"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, PackageCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SupplierOrderItem } from "@/lib/types";

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function ReceivePurchaseItemForm({ item }: { item: SupplierOrderItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(item.quantity_pending));
  const [receivedOn, setReceivedOn] = useState(todayBrazil());
  const [unitCost, setUnitCost] = useState(String(item.unit_cost.toFixed(2)));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("receive_purchase_order_item", {
        p_item_id: item.id,
        p_quantity: Number(quantity),
        p_received_on: receivedOn,
        p_unit_cost: Number(unitCost),
        p_notes: notes.trim() || null,
      });
      if (error) throw error;
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível receber o item.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return <button className="button gold" type="button" onClick={() => setOpen(true)}><PackageCheck size={16} />Receber item</button>;

  return (
    <form className="receive-item-form" onSubmit={submit}>
      <div className="sale-action-form-head"><div><strong>Receber {item.product_name}</strong><span>Pode receber apenas parte da quantidade pendente.</span></div><button className="icon-button" type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X size={16} /></button></div>
      <div className="receive-item-fields">
        <label className="field"><span>Quantidade recebida</span><input className="input" type="number" min="1" max={item.quantity_pending} required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
        <label className="field"><span>Data do recebimento</span><input className="input" type="date" required value={receivedOn} onChange={(event) => setReceivedOn(event.target.value)} /></label>
        <label className="field"><span>Custo unitário final</span><input className="input" type="number" min="0" step="0.01" required value={unitCost} onChange={(event) => setUnitCost(event.target.value)} /></label>
        <label className="field"><span>Observação</span><input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Lote, nota, diferença de custo..." /></label>
      </div>
      <button className="button gold" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : <PackageCheck size={16} />}{loading ? "Recebendo" : "Confirmar recebimento"}</button>
      {message && <p className="sale-action-message">{message}</p>}
    </form>
  );
}
