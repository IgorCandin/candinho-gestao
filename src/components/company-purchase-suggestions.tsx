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

export function CompanyPurchaseSuggestions({ suggestions, leanMode = false, controlledOperation, searchQuery, hideToolbar = false, canWriteSupplements = true, canWriteFitness = true }: { suggestions: CompanyPurchaseSuggestion[]; leanMode?: boolean; controlledOperation?: "all" | "Suplementos" | "Fitness"; searchQuery?: string; hideToolbar?: boolean; canWriteSupplements?: boolean; canWriteFitness?: boolean }) {
  const [localQuery, setQuery] = useState("");
  const [localOperation, setOperation] = useState<"all" | "Suplementos" | "Fitness">("all");
  const query = searchQuery ?? localQuery;
  const operation = controlledOperation ?? localOperation;
  const [selected, setSelected] = useState<string[]>(suggestions.map((item) => item.id));
  const visible = useMemo(() => suggestions.filter((item) => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return (operation === "all" || item.operation === operation) && (!needle || `${item.name} ${item.detail}`.toLocaleLowerCase("pt-BR").includes(needle));
  }), [operation, query, suggestions]);
  const selectedRows = visible.filter((item) => selected.includes(item.id));
  const supplementIds = selectedRows.filter((item) => item.operation === "Suplementos").map((item) => item.productId);
  const fitnessIds = selectedRows.filter((item) => item.operation === "Fitness" && item.variantId).map((item) => item.variantId as string);

  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }

  return <section className="company-orders-section company-purchase-suggestions">
    <div className="company-section-heading"><div><span>Nexus · Reposição</span><h2>Lista prática de compra</h2><p>{leanMode ? "Caixa enxuto: Suplementos repõe somente essenciais A até o mínimo, descontando reservas e mercadoria a caminho." : "Suplementos considera produtos equivalentes e o estoque ideal cadastrado."} Fitness confere somente os tamanhos totalmente ausentes.</p></div><div className="company-purchase-selection"><ShoppingCart size={17}/><strong>{selectedRows.length}</strong><span>item(ns) · {selectedRows.reduce((sum, item) => sum + item.quantity, 0)} un.</span></div></div>
    {suggestions.length ? <>
      {!hideToolbar && <div className="company-purchase-toolbar"><div><button type="button" className={operation === "all" ? "active" : ""} onClick={() => setOperation("all")}>Todas</button><button type="button" className={operation === "Suplementos" ? "active" : ""} onClick={() => setOperation("Suplementos")}>Suplementos</button><button type="button" className={operation === "Fitness" ? "active" : ""} onClick={() => setOperation("Fitness")}>Fitness</button></div><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Produto, grupo, cor ou tamanho"/></label></div>}
      <div className="company-purchase-checklist">{visible.map((item) => <button type="button" aria-pressed={selected.includes(item.id)} className={selected.includes(item.id) ? "is-selected" : ""} onClick={() => toggle(item.id)} key={item.id}><span className="company-purchase-check">{selected.includes(item.id) ? <Check size={15}/> : null}</span><span className={`company-purchase-operation ${item.operation === "Fitness" ? "fitness" : "supplements"}`}>{item.operation}</span><div><strong>{item.name}</strong><small>{item.detail}</small><span>Disponível {item.current} · chegando {item.incoming} · {item.operation === "Fitness" ? "meta da grade" : leanMode ? "mínimo enxuto" : "ideal"} {item.target}</span></div><b>Comprar {item.quantity}</b></button>)}</div>
      {!visible.length && <p role="status">Nenhuma sugestão corresponde a esta operação ou busca.</p>}
      <div className="company-purchase-actions">
        {canWriteSupplements && (operation === "all" || operation === "Suplementos") && <Link className={`button supplements ${supplementIds.length ? "" : "is-disabled"}`} aria-disabled={!supplementIds.length} href={supplementIds.length ? `/company/compras/novo/suplementos?produtos=${supplementIds.join(",")}` : "/company/compras"}><PackagePlus size={16}/>Montar pedido Suplementos · {supplementIds.length}</Link>}
        {canWriteFitness && (operation === "all" || operation === "Fitness") && <Link className={`button fitness ${fitnessIds.length ? "" : "is-disabled"}`} aria-disabled={!fitnessIds.length} href={fitnessIds.length ? `/company/compras/novo/fitness?variantes=${fitnessIds.join(",")}` : "/company/compras"}><Dumbbell size={16}/>Montar pedido Fitness · {fitnessIds.length}</Link>}
      </div>
    </> : <div className="company-empty-state"><Check size={24}/><strong>Nenhuma compra sugerida agora</strong><span>Nenhum item atende aos critérios atuais de reposição.</span></div>}
  </section>;
}
