"use client";

import { ClipboardCheck, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FitnessStockRow } from "@/lib/types";

export function FitnessStockConferenceForm({ stock }: { stock: FitnessStockRow[] }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const changed = useMemo(() => stock.filter((item) => counts[item.variant_id] !== undefined && Number(counts[item.variant_id]) !== item.physical_quantity), [counts, stock]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setMessage(null);
    try {
      const { error } = await createClient().rpc("reconcile_fitness_stock", { p_items: changed.map((item) => ({ variant_id: item.variant_id, counted_quantity: Number(counts[item.variant_id]) })), p_notes: notes.trim() || null });
      if (error) throw error;
      setMessage(changed.length ? "Conferência registrada e saldos ajustados." : "Nenhuma diferença para ajustar.");
      setCounts({}); setNotes(""); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir a conferência."); }
    finally { setLoading(false); }
  }
  return <form className="panel" onSubmit={submit}><div className="panel-head"><div><h2>Conferência física</h2><p>Informe somente as variações cuja contagem real está diferente. O sistema cria ajustes auditáveis, sem apagar histórico.</p></div><ClipboardCheck size={20} /></div><div className="panel-body"><div className="table-wrap"><table><thead><tr><th>Produto</th><th>Variação</th><th>Saldo no sistema</th><th>Contagem física</th></tr></thead><tbody>{stock.map((item) => <tr key={item.variant_id}><td>{item.product_name}</td><td>{item.size} · {item.color}</td><td>{item.physical_quantity}</td><td><input className="input" type="number" min="0" placeholder={String(item.physical_quantity)} value={counts[item.variant_id] ?? ""} onChange={(event) => setCounts((current) => ({ ...current, [item.variant_id]: event.target.value }))} /></td></tr>)}</tbody></table></div><label className="field"><span>Observação da conferência</span><input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: conferência mensal da loja" /></label>{message && <p className="form-error visible">{message}</p>}<button className="button gold" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : <ClipboardCheck size={16} />}Concluir conferência{changed.length ? ` (${changed.length} ajuste${changed.length === 1 ? "" : "s"})` : ""}</button></div></form>;
}
