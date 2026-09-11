"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ProductLabelPrintButton, type ProductLabel } from "@/components/product-label-print-button";

export type LabelCatalogItem = ProductLabel & { id: string; search: string };

export function LabelPrintCenter({ items }: { items: LabelCatalogItem[] }) {
  const [query, setQuery] = useState("");
  const [copies, setCopies] = useState("1");
  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return !needle ? items : items.filter((item) => item.search.toLocaleLowerCase("pt-BR").includes(needle));
  }, [items, query]);
  const quantity = Math.max(1, Math.min(100, Number(copies) || 1));
  return <article className="panel">
    <div className="panel-head"><div><h2>Central de etiquetas</h2><p>Etiquetas térmicas em preto e branco, no formato vertical de 80 × 150 mm.</p></div></div>
    <div className="panel-body">
      <div className="form-grid-two">
        <label className="field"><span>Buscar produto, código Candinho ou código de barras</span><div className="input-with-icon"><Search size={16}/><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: creatina, 12345 ou 200..."/></div></label>
        <label className="field"><span>Quantidade de cópias</span><input className="input" type="number" min="1" max="100" value={copies} onChange={(event) => setCopies(event.target.value)}/><small className="form-help">A quantidade vale para cada etiqueta que você abrir.</small></label>
      </div>
      <div className="table-wrap" style={{ marginTop: 18 }}><table><thead><tr><th>Operação</th><th>Produto</th><th>Código</th><th>Preço</th><th></th></tr></thead><tbody>{rows.slice(0, 100).map((item) => <tr key={item.id}><td>{item.operation}</td><td><strong>{item.name}</strong>{item.operation === "Fitness" ? <small className="crm-cell-note">{item.size} · {item.color}</small> : null}</td><td>{item.internalCode ?? "Gerando…"}<small className="crm-cell-note">{item.barcodeValue ?? ""}</small></td><td>{item.cashPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td><ProductLabelPrintButton label={item} copies={quantity}/></td></tr>)}{rows.length === 0 ? <tr><td colSpan={5}>Nenhuma etiqueta encontrada.</td></tr> : null}</tbody></table></div>
    </div>
  </article>;
}
