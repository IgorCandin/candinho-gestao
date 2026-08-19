"use client";

import { LoaderCircle, PackageMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FitnessStockRow } from "@/lib/types";

export function FitnessOperationalOutflowForm({ stock }: { stock: FitnessStockRow[] }) {
  const router = useRouter();
  const available = stock.filter((item) => item.available_quantity > 0);
  const [variantId, setVariantId] = useState(available[0]?.variant_id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("loss_damage");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await createClient().rpc("record_fitness_operational_outflow", {
        p_variant_id: variantId,
        p_quantity: Number(quantity),
        p_reason: reason,
        p_notes: notes.trim() || null,
      });
      if (error) throw error;
      setQuantity("1");
      setNotes("");
      setMessage("Baixa registrada. Não foi criada nenhuma venda.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar a baixa.");
    } finally {
      setLoading(false);
    }
  }

  return <form className="panel" onSubmit={submit}>
    <div className="panel-head"><div><h2>Baixa operacional</h2><p>Retire uma peça sem gerar venda. O custo fica registrado no histórico de estoque.</p></div><PackageMinus size={20} /></div>
    <div className="panel-body form-grid-two">
      <label className="field"><span>Produto / variação</span><select className="input" value={variantId} onChange={(event) => setVariantId(event.target.value)} required><option value="">Selecione</option>{available.map((item) => <option key={item.variant_id} value={item.variant_id}>{item.product_name} · {item.size} · {item.color} ({item.available_quantity} disponível)</option>)}</select></label>
      <label className="field"><span>Motivo</span><select className="input" value={reason} onChange={(event) => setReason(event.target.value)}><option value="loss_damage">Perda ou avaria</option><option value="internal_use">Uso interno</option></select></label>
      <label className="field"><span>Quantidade</span><input className="input" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>
      <label className="field"><span>Observação</span><input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: avaria recebida na entrega" /></label>
      {message && <p className="form-error visible field-span-two">{message}</p>}
      <button className="button gold field-span-two" disabled={loading || !variantId}>{loading ? <LoaderCircle className="spin" size={16} /> : <PackageMinus size={16} />}Registrar baixa</button>
    </div>
  </form>;
}
