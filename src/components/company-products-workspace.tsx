/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { Boxes, Layers3, PackageSearch, Percent, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { ActivePromotionRow } from "@/lib/active-promotion-data";
import type { ProductComboRow } from "@/lib/types";

export type CompanyProductRow = {
  id: string; name: string; category: string; brand: string | null; image_url: string | null;
  sale_price: number; physical_quantity: number; reserved_quantity: number; available_quantity: number;
  incoming_quantity: number; operation: "Suplementos" | "Fitness"; secondary_image_url?: string | null;
};

type Availability = "all" | "available" | "incoming" | "out";
type CatalogView = "all" | "Suplementos" | "Fitness" | "combos" | "promotions";
function availabilityOf(product: CompanyProductRow): Exclude<Availability, "all"> { return product.available_quantity > 0 ? "available" : product.incoming_quantity > 0 ? "incoming" : "out"; }
function productHref(product: CompanyProductRow) { return product.operation === "Fitness" ? `/company/produtos/fitness/${product.id}` : `/company/produtos/${product.id}`; }

export function CompanyProductsWorkspace({ products, combos, promotions, initialView = "all" }: { products: CompanyProductRow[]; combos: ProductComboRow[]; promotions: ActivePromotionRow[]; initialView?: CatalogView }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<CatalogView>(initialView);
  const [availability, setAvailability] = useState<Availability>("all");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [preview, setPreview] = useState<CompanyProductRow | null>(null);
  useEffect(() => { if (!preview) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [preview]);
  const operation = view === "Suplementos" || view === "Fitness" ? view : "all";
  const operationRows = useMemo(() => products.filter((product) => operation === "all" || product.operation === operation), [operation, products]);
  const categories = useMemo(() => [...new Set(operationRows.map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [operationRows]);
  const brands = useMemo(() => [...new Set(operationRows.map((product) => product.brand).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "pt-BR")), [operationRows]);
  const visible = useMemo(() => products.filter((product) => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return (operation === "all" || product.operation === operation) && (availability === "all" || availabilityOf(product) === availability) && (category === "all" || product.category === category) && (brand === "all" || product.brand === brand) && (!needle || `${product.name} ${product.category} ${product.brand ?? ""}`.toLocaleLowerCase("pt-BR").includes(needle));
  }), [availability, brand, category, operation, products, query]);
  const available = products.filter((product) => product.available_quantity > 0);
  const selectView = (nextView: CatalogView) => { setView(nextView); setCategory("all"); setBrand("all"); };
  const visibleCombos = useMemo(() => combos.filter((combo) => !query.trim() || `${combo.name} ${combo.description ?? ""} ${combo.component_summary ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))), [combos, query]);
  const visiblePromotions = useMemo(() => promotions.filter((item) => !query.trim() || `${item.promotion_name} ${item.item_label} ${item.category ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))), [promotions, query]);

  return <div className="company-workspace-v2">
    <header className="company-workspace-head"><div><span>COMPANY · CATÁLOGO INTERNO</span><h1>Produtos</h1><p>Clique na foto para ampliar; clique nos dados para abrir todas as informações.</p></div><Link className="button company-blue" href="/company/produtos/novo"><Plus size={16}/>Novo produto</Link></header>
    <section className="company-workspace-metrics company-product-metrics"><article><PackageSearch/><span>Produtos ativos</span><strong>{products.length}</strong></article><article><Boxes/><span>Com disponibilidade</span><strong>{available.length}</strong></article><article><Boxes/><span>Unidades disponíveis</span><strong>{available.reduce((sum, product) => sum + product.available_quantity, 0)}</strong></article></section>
    <section className="company-workspace-panel"><div className="company-workspace-toolbar"><div><button className={view === "all" ? "active" : ""} onClick={() => selectView("all")}>Todas</button><button className={view === "Suplementos" ? "active" : ""} onClick={() => selectView("Suplementos")}>Suplementos</button><button className={view === "Fitness" ? "active" : ""} onClick={() => selectView("Fitness")}>Fitness</button><button className={view === "combos" ? "active" : ""} onClick={() => selectView("combos")}>Combos</button><button className={view === "promotions" ? "active" : ""} onClick={() => selectView("promotions")}>Promoções</button></div><label><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto, combo ou promoção..."/></label></div>
      {view !== "combos" && view !== "promotions" ? <><div className="company-product-filters"><label><span>Disponibilidade</span><select value={availability} onChange={(event) => setAvailability(event.target.value as Availability)}><option value="all">Todas</option><option value="available">Com estoque</option><option value="incoming">Somente a caminho</option><option value="out">Zerados</option></select></label><label><span>Categoria</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas as categorias</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label><span>Marca</span><select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="all">Todas as marcas</option>{brands.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>{(availability !== "all" || category !== "all" || brand !== "all" || query) ? <button type="button" onClick={() => { setQuery(""); setAvailability("all"); setCategory("all"); setBrand("all"); }}>Limpar filtros</button> : null}</div><p className="company-workspace-count">{visible.length} produto(s)</p>
      <div className="company-products-grid">{visible.map((product) => { const status = availabilityOf(product); return <article className={`company-product-card stock-${status} operation-${product.operation === "Fitness" ? "fitness" : "supplements"}`} key={`${product.operation}-${product.id}`}>
        <button type="button" className="company-product-card-visual" onClick={() => setPreview(product)} aria-label={`Ampliar foto de ${product.name}`}>{product.image_url ? <img src={product.image_url} alt={product.name}/> : <PackageSearch/>}<small>Ampliar</small></button>
        <Link href={productHref(product)}><span>{product.operation} · {product.category}{product.brand ? ` · ${product.brand}` : ""}</span><h2>{product.name}</h2><p><strong>{product.available_quantity}</strong> disponível · {product.reserved_quantity} reservado · {product.incoming_quantity} chegando</p><b>{formatCurrency(product.sale_price)}</b><small>Abrir informações →</small></Link>
      </article>; })}</div></> : null}
      {view === "combos" ? <><div className="company-catalog-view-head"><div><Layers3/><span><strong>Combos</strong><small>Ofertas montadas com estoque real dos componentes.</small></span></div><Link className="button company-blue" href="/company/produtos/combos/novo"><Plus size={15}/>Novo combo</Link></div><div className="company-products-grid company-combo-grid">{visibleCombos.map((combo) => <Link className={`company-catalog-special-card ${combo.available_quantity > 0 ? "available" : combo.incoming_quantity > 0 ? "incoming" : "out"}`} href={`/company/produtos/combos/${combo.id}/editar`} key={combo.id}>{combo.image_url ? <img src={combo.image_url} alt={combo.name}/> : <Layers3/>}<span><small>{combo.active ? "Ativo" : "Inativo"} · {combo.component_count} produto(s)</small><strong>{combo.name}</strong><p>{combo.component_summary ?? combo.description ?? "Configure os produtos deste combo."}</p><b>{formatCurrency(combo.sale_price)}</b><em>{combo.available_quantity} disponível · {combo.incoming_quantity} a caminho</em></span></Link>)}{visibleCombos.length === 0 ? <div className="company-empty-state"><Layers3/><strong>Nenhum combo encontrado</strong><span>Cadastre um combo ou altere a busca.</span></div> : null}</div></> : null}
      {view === "promotions" ? <><div className="company-catalog-view-head"><div><Percent/><span><strong>Promoções ativas</strong><small>Suplementos e Fitness reunidos na Company.</small></span></div></div><div className="company-products-grid company-promotion-grid">{visiblePromotions.map((item) => <article className={`company-catalog-special-card ${item.available_quantity > 0 ? "available" : item.incoming_quantity > 0 ? "incoming" : "out"}`} key={item.promotion_item_id}>{item.image_url ? <img src={item.image_url} alt={item.item_label}/> : <Percent/>}<span><small>{item.operation_scope === "fitness" ? "Fitness" : "Suplementos"} · {item.promotion_name}</small><strong>{item.item_label}</strong><p>{item.effective_discount_pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% de desconto</p><b><s>{formatCurrency(item.current_price)}</s> {formatCurrency(item.effective_promotional_price)}</b><em>{item.available_quantity} disponível · {item.incoming_quantity} a caminho</em></span></article>)}{visiblePromotions.length === 0 ? <div className="company-empty-state"><Percent/><strong>Nenhuma promoção ativa</strong><span>Quando uma promoção entrar em vigor, ela aparecerá aqui.</span></div> : null}</div></> : null}
      {view === "promotions" ? <div className="company-promotion-create-shortcut"><Link className="button company-blue" href="/company/gestao/central/promocoes#nova-promocao"><Plus size={15}/>Adicionar promoção</Link></div> : null}
    </section>
    {preview ? <div className="company-product-click-preview" role="dialog" aria-modal="true" aria-label={`Fotos de ${preview.name}`} onClick={() => setPreview(null)}><article onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setPreview(null)} aria-label="Fechar"><X/></button><header><span>{preview.operation}</span><strong>{preview.name}</strong></header><div className={preview.secondary_image_url ? "has-secondary" : ""}>{preview.image_url ? <figure><img src={preview.image_url} alt={preview.name}/><figcaption>Produto</figcaption></figure> : null}{preview.secondary_image_url ? <figure><img src={preview.secondary_image_url} alt={`Tabela nutricional de ${preview.name}`}/><figcaption>Tabela nutricional</figcaption></figure> : null}</div></article></div> : null}
  </div>;
}
