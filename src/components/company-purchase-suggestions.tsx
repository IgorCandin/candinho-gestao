"use client";

import Link from "next/link";
import { Check, Dumbbell, PackagePlus, Search, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";

export type CompanyPurchaseSuggestion = {
  id: string;
  operation: "Suplementos" | "Fitness";
  productId: string;
  variantId?: string;
  name: string;
  detail: string;
  current: number;
  incoming: number;
  target: number;
  quantity: number;
};

export function CompanyPurchaseSuggestions({ suggestions }: { suggestions: CompanyPurchaseSuggestion[] }) {
  const [query, setQuery] = useState("");
  const [operation, setOperation] = useState<"all" | "Suplementos" | "Fitness">("all");
  const [selected, setSelected] = useState<string[]>(suggestions.map((item) => item.id));
  const visible = useMemo(() => suggestions.filter((item) => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return (operation === "all" || item.operation === operation) && (!needle || `${item.name} ${item.detail}`.toLocaleLowerCase("pt-BR").includes(needle));
  }), [operation, query, suggestions]);
  const selectedRows = suggestions.filter((item) => selected.includes(item.id));
  const supplementIds = selectedRows.filter((item) => item.operation === "Suplementos").map((item) => item.productId);
  const fitnessIds = selectedRows.filter((item) => item.operation === "Fitness" && item.variantId).map((item) => item.variantId as string);

  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }

  return <section className="company-orders-section company-purchase-suggestions">
    <div className="company-section-heading"><div><span>Nexus · Reposição</span><h2>Lista prática de compra</h2><p>Marque o que pretende comprar. Suplementos considera os grupos equivalentes; Fitness considera cada cor e tamanho.</p></div><div className="company-purchase-selection"><ShoppingCart size={17}/><strong>{selectedRows.length}</strong><span>item(ns) · {selectedRows.reduce((sum, item) => sum + item.quantity, 0)} un.</span></div></div>
    {suggestions.length ? <>
      <div className="company-purchase-toolbar"><div><button type="button" className={operation === "all" ? "active" : ""} onClick={() => setOperation("all")}>Todas</button><button type="button" className={operation === "Suplementos" ? "active" : ""} onClick={() => setOperation("Suplementos")}>Suplementos</button><button type="button" className={operation === "Fitness" ? "active" : ""} onClick={() => setOperation("Fitness")}>Fitness</button></div><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Produto, grupo, cor ou tamanho"/></label></div>
      <div className="company-purchase-checklist">{visible.map((item) => <button type="button" className={selected.includes(item.id) ? "is-selected" : ""} onClick={() => toggle(item.id)} key={item.id}><span className="company-purchase-check">{selected.includes(item.id) ? <Check size={15}/> : null}</span><span className={`company-purchase-operation ${item.operation === "Fitness" ? "fitness" : "supplements"}`}>{item.operation}</span><div><strong>{item.name}</strong><small>{item.detail}</small><span>Disponível {item.current} · chegando {item.incoming} · ideal {item.target}</span></div><b>Comprar {item.quantity}</b></button>)}</div>
      <div className="company-purchase-actions">
        <Link className={`button supplements ${supplementIds.length ? "" : "is-disabled"}`} aria-disabled={!supplementIds.length} href={supplementIds.length ? `/company/compras/novo/suplementos?produtos=${supplementIds.join(",")}` : "/company/compras"}><PackagePlus size={16}/>Montar pedido Suplementos · {supplementIds.length}</Link>
        <Link className={`button fitness ${fitnessIds.length ? "" : "is-disabled"}`} aria-disabled={!fitnessIds.length} href={fitnessIds.length ? `/company/compras/novo/fitness?variantes=${fitnessIds.join(",")}` : "/company/compras"}><Dumbbell size={16}/>Montar pedido Fitness · {fitnessIds.length}</Link>
      </div>
    </> : <div className="company-empty-state"><Check size={24}/><strong>Nenhuma compra sugerida agora</strong><span>Os estoques estão acima dos mínimos definidos.</span></div>}
  </section>;
}
