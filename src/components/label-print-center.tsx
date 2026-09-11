"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ProductLabelBatchPrintButton, ProductLabelPrintButton, type ProductLabel } from "@/components/product-label-print-button";

export type LabelCatalogItem = ProductLabel & { id: string; search: string };

export function LabelPrintCenter({ items }: { items: LabelCatalogItem[] }) {
  const [query, setQuery] = useState("");
  const [copies, setCopies] = useState("1");
  const [selected, setSelected] = useState<string[]>([]);
  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return (!needle ? items : items.filter((item) => item.search.toLocaleLowerCase("pt-BR").includes(needle))).slice(0, 100);
  }, [items, query]);
  const quantity = Math.max(1, Math.min(100, Number(copies) || 1));
  const readyRows = rows.filter((item) => item.internalCode && item.barcodeValue);
  const selectedRows = readyRows.filter((item) => selected.includes(item.id));
  const allVisibleSelected = readyRows.length > 0 && readyRows.every((item) => selected.includes(item.id));
  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  function toggleVisible() { setSelected((current) => allVisibleSelected ? current.filter((id) => !readyRows.some((row) => row.id === id)) : [...new Set([...current, ...readyRows.map((row) => row.id)])]); }

  return <article className="panel">
    <div className="panel-head"><div><h2>Central de etiquetas</h2><p>Etiquetas térmicas em preto e branco, no formato vertical de 80 × 101,5 mm.</p></div></div>
    <div className="panel-body">
      <div className="form-grid-two">
        <label className="field"><span>Buscar produto, código Candinho ou código de barras</span><div className="input-with-icon"><Search size={16}/><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: creatina, 12345 ou 200..."/></div></label>
        <label className="field"><span>Quantidade de cópias</span><input className="input" type="number" min="1" max="100" value={copies} onChange={(event) => setCopies(event.target.value)}/><small className="form-help">A quantidade vale para cada etiqueta selecionada.</small></label>
      </div>
      <div className="page-header-actions" style={{ marginTop: 18 }}>
        <button type="button" className="button ghost" disabled={!readyRows.length} onClick={toggleVisible}>{allVisibleSelected ? "Limpar seleção visível" : "Selecionar visíveis"}</button>
        <ProductLabelBatchPrintButton labels={selectedRows} copies={quantity}/>
      </div>
      <div className="table-wrap" style={{ marginTop: 18 }}><table><thead><tr><th><input type="checkbox" aria-label="Selecionar todos os produtos visíveis" checked={allVisibleSelected} disabled={!readyRows.length} onChange={toggleVisible}/></th><th>Operação</th><th>Produto</th><th>Código</th><th>Preço</th><th></th></tr></thead><tbody>{rows.map((item) => { const ready = Boolean(item.internalCode && item.barcodeValue); return <tr key={item.id}><td><input type="checkbox" aria-label={`Selecionar ${item.name}`} checked={selected.includes(item.id)} disabled={!ready} onChange={() => toggle(item.id)}/></td><td>{item.operation}</td><td><strong>{item.name}</strong>{item.operation === "Fitness" ? <small className="crm-cell-note">{item.size} · {item.color}</small> : null}</td><td>{item.internalCode ?? "Gerando…"}<small className="crm-cell-note">{item.barcodeValue ?? ""}</small></td><td>{item.cashPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td><ProductLabelPrintButton label={item} copies={quantity}/></td></tr>; })}{rows.length === 0 ? <tr><td colSpan={6}>Nenhuma etiqueta encontrada.</td></tr> : null}</tbody></table></div>
    </div>
  </article>;
}
