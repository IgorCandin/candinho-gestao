"use client";

import { LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { FitnessStockRow, FitnessSupplierRow } from "@/lib/types";

type Row = { key: string; variantId: string; quantity: string; unitCost: string; notes: string };
const key = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function FitnessPurchaseOrderForm({ stock, suppliers, responsible, companyMode = false, initialVariantIds = [] }: { stock: FitnessStockRow[]; suppliers: FitnessSupplierRow[]; responsible: string; companyMode?: boolean; initialVariantIds?: string[] }) {
  const router = useRouter();
  const options = useMemo(() => stock.filter((row) => row.variant_active && row.product_active), [stock]);
  const seededRows = initialVariantIds.map((variantId) => { const item = stock.find((row) => row.variant_id === variantId); return item ? { key: key(), variantId, quantity: String(Math.max(item.suggested_reorder_quantity, 1)), unitCost: String(item.cost_price), notes: "" } : null; }).filter((row): row is Row => Boolean(row));
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [orderedOn, setOrderedOn] = useState(today);
  const [expectedOn, setExpectedOn] = useState("");
  const [freight, setFreight] = useState("0");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>(seededRows.length ? seededRows : [{ key: key(), variantId: "", quantity: "1", unitCost: "0", notes: "" }]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const update = (itemKey: string, change: Partial<Row>) => setRows((current) => current.map((row) => row.key === itemKey ? { ...row, ...change } : row));

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage(null);
    try {
      if (!supplierId && !supplierName.trim()) throw new Error("Informe o fornecedor.");
      if (rows.some((row) => !row.variantId || Number(row.quantity) <= 0 || Number(row.unitCost) < 0)) throw new Error("Revise os itens.");
      const { data, error } = await createClient().rpc("create_fitness_purchase_order_v2", { p_supplier_id: supplierId || null, p_supplier_name: supplierName.trim() || null, p_ordered_on: orderedOn, p_expected_on: expectedOn || null, p_freight: Number(freight) || 0, p_responsible: responsible, p_items: rows.map((row) => ({ variant_id: row.variantId, quantity: Number(row.quantity), unit_cost: Number(row.unitCost), notes: row.notes.trim() || null })), p_notes: notes.trim() || null });
      if (error) throw error;
      router.push(companyMode ? `/company/compras/fitness/${String(data)}` : `/fitness/pedidos/${String(data)}`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível criar o pedido."); }
    finally { setLoading(false); }
  }

  return <form className="new-sale-layout" onSubmit={submit}>
    <div className="new-sale-main">
      <article className="panel"><div className="panel-head"><div><h2>Fornecedor</h2><p>Use um cadastrado ou digite um novo marketplace/fornecedor.</p></div></div><div className="panel-body form-grid-two">
        <label className="field"><span>Fornecedor cadastrado</span><select className="select" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); const supplier = suppliers.find((item) => item.id === event.target.value); if (supplier) setSupplierName(supplier.name); }}><option value="">Novo fornecedor</option>{suppliers.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field"><span>Nome / marketplace</span><input className="input" value={supplierName} onChange={(event) => { setSupplierName(event.target.value); if (supplierId && suppliers.find((item) => item.id === supplierId)?.name !== event.target.value) setSupplierId(""); }}/></label>
        <label className="field"><span>Data do pedido</span><input className="input" type="date" value={orderedOn} onChange={(event) => setOrderedOn(event.target.value)}/></label>
        <label className="field"><span>Previsão de chegada</span><input className="input" type="date" value={expectedOn} onChange={(event) => setExpectedOn(event.target.value)}/></label>
        <label className="field"><span>Frete</span><input className="input" type="number" min="0" step="0.01" value={freight} onChange={(event) => setFreight(event.target.value)}/></label>
      </div></article>
      <article className="panel"><div className="panel-head"><div><h2>Itens</h2><p>Cor e tamanho são controlados separadamente.</p></div><button type="button" className="button ghost" onClick={() => setRows((current) => [...current, { key: key(), variantId: "", quantity: "1", unitCost: "0", notes: "" }])}><Plus size={16}/>Adicionar</button></div><div className="panel-body sale-form-items">{rows.map((row, index) => <div className="sale-form-item" key={row.key}><div className="sale-form-item-head"><strong>Item {index + 1}</strong>{rows.length > 1 ? <button type="button" className="icon-button" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}><Trash2 size={16}/></button> : null}</div><div className="sale-form-item-grid">
        <label className="field sale-product-field"><span>Produto · tamanho · cor</span><select className="select" value={row.variantId} onChange={(event) => { const selected = options.find((item) => item.variant_id === event.target.value); update(row.key, { variantId: event.target.value, unitCost: selected ? String(selected.cost_price) : row.unitCost }); }}><option value="">Selecione</option>{options.map((item) => <option key={item.variant_id} value={item.variant_id}>{item.product_name} · {item.size} · {item.color}</option>)}</select></label>
        <label className="field"><span>Quantidade</span><input className="input" type="number" min="1" value={row.quantity} onChange={(event) => update(row.key, { quantity: event.target.value })}/></label>
        <label className="field"><span>Custo unitário</span><input className="input" type="number" min="0" step="0.01" value={row.unitCost} onChange={(event) => update(row.key, { unitCost: event.target.value })}/></label>
      </div></div>)}</div></article>
    </div>
    <aside className="new-sale-side"><article className="panel"><div className="panel-head"><div><h2>Observações</h2></div></div><div className="panel-body"><textarea className="textarea" rows={5} value={notes} onChange={(event) => setNotes(event.target.value)}/></div></article><article className="panel"><div className="panel-body">{message ? <p className="form-error visible">{message}</p> : null}<button className="button gold product-save-button" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16}/> : <Save size={16}/>}Criar pedido</button></div></article></aside>
  </form>;
}
