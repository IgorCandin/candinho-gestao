"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type { CompletionOrder } from "@/components/company-completion-workspace";

type DifferenceMode = "exact" | "partial" | "discount" | "interest";
const methods = ["Pix", "Dinheiro", "Cartão", "Link de Pagamento", "Pagamento fracionado"];
const currency = (value: number) => Math.round(value * 100) / 100;
const outstanding = (row: CompletionOrder) => Number(row.outstanding_amount ?? (row.payment_status === "received" ? 0 : row.total_amount));
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function CompanyGroupedReceipt({ orders, onClose }: { orders: CompletionOrder[]; onClose: () => void }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(orders.map((row) => row.id));
  const [received, setReceived] = useState(() => currency(orders.reduce((sum, row) => sum + outstanding(row), 0)).toFixed(2));
  const [method, setMethod] = useState("Pix");
  const [date, setDate] = useState(today);
  const [remainingDueOn, setRemainingDueOn] = useState("");
  const [mode, setMode] = useState<DifferenceMode>("exact");
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchId] = useState(() => crypto.randomUUID());
  const chosen = useMemo(() => orders.filter((row) => selected.includes(row.id)), [orders, selected]);
  const total = currency(chosen.reduce((sum, row) => sum + outstanding(row), 0));
  const paid = currency(Number(received.replace(",", ".")));
  const difference = currency(Math.abs(total - paid));
  const effectiveMode: DifferenceMode = difference < .005 ? "exact" : mode;
  const validMode = difference < .005 || (paid < total ? mode === "partial" || mode === "discount" : mode === "interest");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (chosen.length < 2) { setError("Selecione pelo menos duas vendas."); return; }
    if (!Number.isFinite(paid) || paid <= 0) { setError("Informe o valor recebido."); return; }
    if (!validMode) { setError("Escolha como tratar a diferença antes de salvar."); return; }
    if (effectiveMode === "partial" && (!remainingDueOn || remainingDueOn < date)) { setError("Informe a data combinada para o saldo restante."); return; }
    setWorking(true); setError(null);
    try {
      const { error: rpcError } = await createClient().rpc("register_company_grouped_receipt_v2", {
        p_batch_id: batchId, p_sale_ids: chosen.map((row) => row.id), p_amount: paid,
        p_received_on: date, p_payment_method: method, p_difference_mode: effectiveMode,
        p_remaining_due_on: effectiveMode === "partial" ? remainingDueOn : null, p_notes: notes.trim() || null,
      });
      if (rpcError) throw rpcError;
      router.refresh();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível registrar o pagamento conjunto.");
    } finally { setWorking(false); }
  }

  return <div className="company-completion-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="company-completion-dialog company-grouped-receipt" role="dialog" aria-modal="true" aria-labelledby="grouped-receipt-title">
      <header><div><small>COMPANY · RECEBIMENTO CONJUNTO</small><h2 id="grouped-receipt-title">{orders[0]?.customer_name}</h2><p>Um pagamento, distribuído entre vendas do mesmo cliente.</p></div><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}>×</button></header>
      <form onSubmit={save} className="company-grouped-receipt-form">
        <fieldset><legend>Vendas incluídas</legend>{orders.map((row) => <label key={row.id} className="company-grouped-receipt-sale"><input type="checkbox" checked={selected.includes(row.id)} onChange={(event) => { setSelected(event.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id)); setMode("exact"); }}/><span><strong>{row.product_summary || "Venda"}</strong><small>{row.location_name}</small></span><b>{formatCurrency(outstanding(row))}</b></label>)}</fieldset>
        <p className="company-grouped-receipt-total">Total selecionado <strong>{formatCurrency(total)}</strong></p><p className="form-help">O valor é aplicado primeiro às vendas mais antigas. Se for parcial, o restante continua em aberto.</p>
        <div className="company-grouped-receipt-fields"><label>Valor recebido<input className="input" type="number" min="0.01" step="0.01" required value={received} onChange={(event) => { setReceived(event.target.value); setMode("exact"); }}/></label><label>Forma recebida<select className="select" value={method} onChange={(event) => setMethod(event.target.value)}>{methods.map((value) => <option key={value}>{value}</option>)}</select></label><label>Data<input className="input" type="date" required value={date} onChange={(event) => setDate(event.target.value)}/></label></div>
        {difference > .005 && <fieldset className="company-grouped-receipt-difference"><legend>Diferença de {formatCurrency(difference)} — escolha uma opção</legend>{paid < total ? <><label><input type="radio" checked={mode === "partial"} onChange={() => setMode("partial")}/> Pagamento parcial: manter saldo a receber</label><label><input type="radio" checked={mode === "discount"} onChange={() => setMode("discount")}/> Desconto: quitar e registrar a redução do preço</label></> : <label><input type="radio" checked={mode === "interest"} onChange={() => setMode("interest")}/> Juros da operação: acrescentar ao valor da venda</label>}</fieldset>}
        {mode === "partial" && difference > .005 && <label>Quando o cliente vai pagar o restante?<input className="input" type="date" min={date} required value={remainingDueOn} onChange={(event) => setRemainingDueOn(event.target.value)}/></label>}
        {(mode === "discount" || mode === "interest") && difference > .005 && <p className="form-help">O ajuste só é permitido em vendas sem recebimentos anteriores e sem parcelas. Entregas já realizadas continuam preservadas.</p>}
        <label>Observação (opcional)<textarea className="textarea" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)}/></label>
        {error && <p className="sale-action-message" role="alert">{error}</p>}
        <footer><button className="button ghost" type="button" onClick={onClose}>Cancelar</button><button className="button gold" type="submit" disabled={working || chosen.length < 2 || !validMode}>{working ? "Salvando..." : "Confirmar pagamento conjunto"}</button></footer>
      </form>
    </section>
  </div>;
}
