/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowRightLeft, Boxes, Building2, Layers3, MapPin, PackageSearch, Percent, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { ActivePromotionRow } from "@/lib/active-promotion-data";
import type { ProductComboRow } from "@/lib/types";
import "./company-completion-filters.css";
import "./company-products-workspace.css";

export type CompanyProductRow = {
  id: string; name: string; category: string; brand: string | null; image_url: string | null;
  sale_price: number; cost_price: number; physical_quantity: number; reserved_quantity: number; available_quantity: number;
  incoming_quantity: number; operation: "Suplementos" | "Fitness"; secondary_image_url?: string | null;
};

export type CompanyPartnerStockRow = {
  partnerId: string; partnerName: string; locationId: string; locationName: string; city: string | null;
  productId: string; productName: string; brand: string | null; category: string | null;
  imageUrl: string | null; costPrice: number; salePrice: number; quantity: number; updatedAt: string | null;
};

type Availability = "all" | "available" | "incoming" | "out";
type CatalogView = "all" | "Suplementos" | "Fitness" | "combos" | "promotions" | "partners";
function availabilityOf(product: CompanyProductRow): Exclude<Availability, "all"> { return product.available_quantity > 0 ? "available" : product.incoming_quantity > 0 ? "incoming" : "out"; }
function productHref(product: CompanyProductRow) { return product.operation === "Fitness" ? `/company/produtos/fitness/${product.id}` : `/company/produtos/${product.id}`; }

export function CompanyProductsWorkspace({ products, combos, promotions, partnerStock, initialView = "all", initialOperation = "all", allowedOperations = ["Suplementos", "Fitness"], canWriteSupplements = false, canWriteFitness = false }: { products: CompanyProductRow[]; combos: ProductComboRow[]; promotions: ActivePromotionRow[]; partnerStock: CompanyPartnerStockRow[]; initialView?: CatalogView; initialOperation?: "all" | "Suplementos" | "Fitness"; allowedOperations?: Array<"Suplementos" | "Fitness">; canWriteSupplements?: boolean; canWriteFitness?: boolean }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<CatalogView>(initialView === "Suplementos" || initialView === "Fitness" ? "all" : initialView);
  const [operation, setOperation] = useState<"all" | "Suplementos" | "Fitness">(initialView === "Suplementos" || initialView === "Fitness" ? initialView : initialOperation);
  const [availability, setAvailability] = useState<Availability>("all");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [preview, setPreview] = useState<CompanyProductRow | null>(null);
  const [partnerId, setPartnerId] = useState("all");
  useEffect(() => { if (!preview) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [preview]);
  const operationRows = useMemo(() => products.filter((product) => operation === "all" || product.operation === operation), [operation, products]);
  const categories = useMemo(() => [...new Set(operationRows.map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [operationRows]);
  const brands = useMemo(() => [...new Set(operationRows.map((product) => product.brand).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "pt-BR")), [operationRows]);
  const visible = useMemo(() => products.filter((product) => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return (operation === "all" || product.operation === operation) && (availability === "all" || availabilityOf(product) === availability) && (category === "all" || product.category === category) && (brand === "all" || product.brand === brand) && (!needle || `${product.name} ${product.category} ${product.brand ?? ""}`.toLocaleLowerCase("pt-BR").includes(needle));
  }), [availability, brand, category, operation, products, query]);
  const metricRows = operationRows;
  const available = metricRows.filter((product) => product.available_quantity > 0);
  const selectView = (nextView: CatalogView) => { setView(nextView); setCategory("all"); setBrand("all"); setPartnerId("all"); };
  const visibleCombos = useMemo(() => combos.filter((combo) => {
    const comboAvailability = combo.available_quantity > 0 ? "available" : combo.incoming_quantity > 0 ? "incoming" : "out";
    return operation !== "Fitness" && (availability === "all" || availability === comboAvailability) && (!query.trim() || `${combo.name} ${combo.description ?? ""} ${combo.component_summary ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));
  }), [availability, combos, operation, query]);
  const visiblePromotions = useMemo(() => promotions.filter((item) => {
    const promotionAvailability = item.available_quantity > 0 ? "available" : item.incoming_quantity > 0 ? "incoming" : "out";
    return (operation === "all" || (item.operation_scope === "fitness" ? "Fitness" : "Suplementos") === operation) && (availability === "all" || availability === promotionAvailability) && (!query.trim() || `${item.promotion_name} ${item.item_label} ${item.category ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));
  }), [availability, operation, promotions, query]);
  const partners = useMemo(() => [...new Map(partnerStock.map((row) => [row.partnerId, { id: row.partnerId, name: row.partnerName }])).values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [partnerStock]);
  const visiblePartnerStock = useMemo(() => partnerStock.filter((row) => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    const partnerAvailability = row.quantity > 0 ? "available" : "out";
    return operation !== "Fitness" && (partnerId === "all" || row.partnerId === partnerId) && (availability === "all" || availability === partnerAvailability) && (!needle || `${row.productName} ${row.brand ?? ""} ${row.category ?? ""} ${row.partnerName} ${row.locationName}`.toLocaleLowerCase("pt-BR").includes(needle));
  }), [availability, operation, partnerId, partnerStock, query]);
  const partnerUnits = visiblePartnerStock.reduce((sum, row) => sum + row.quantity, 0);
  const activeCombos = operation === "Fitness" ? [] : combos.filter((combo) => combo.active);
  const activePromotions = promotions.filter(item => operation === "all" || (item.operation_scope === "fitness" ? "Fitness" : "Suplementos") === operation);
  const productMetric = view === "combos" ? activeCombos.length : view === "promotions" ? activePromotions.length : view === "partners" ? new Set(visiblePartnerStock.map((row) => row.productId)).size : metricRows.length;
  const availableMetric = view === "combos" ? activeCombos.filter((combo) => combo.available_quantity > 0).length : view === "promotions" ? activePromotions.filter((item) => item.available_quantity > 0).length : view === "partners" ? new Set(visiblePartnerStock.filter((row) => row.quantity > 0).map((row) => row.productId)).size : available.length;
  const unitMetric = view === "combos" ? activeCombos.reduce((sum, combo) => sum + combo.available_quantity, 0) : view === "promotions" ? activePromotions.reduce((sum, item) => sum + item.available_quantity, 0) : view === "partners" ? partnerUnits : available.reduce((sum, product) => sum + product.available_quantity, 0);
  const primaryMetricLabel = view === "combos" ? "Combos ativos" : view === "promotions" ? "Produtos em promoção" : view === "partners" ? "Produtos nos parceiros" : "Produtos ativos";

  const canWrite = operation === "Suplementos" ? canWriteSupplements : operation === "Fitness" ? canWriteFitness : canWriteSupplements || canWriteFitness;
  const selectOperation = (next: "all" | "Suplementos" | "Fitness") => { setOperation(next); setCategory("all"); setBrand("all"); setPartnerId("all"); if (next === "Fitness" && (view === "combos" || view === "partners")) setView("all"); };
  return <div className="company-workspace-v2 company-queue-workspace company-products-workspace">
    <header className="company-workspace-head"><div><span>Company · Catálogo interno</span><h1>Produtos</h1><p>Escolha a operação para cadastrar produtos, editar informações e conferir o estoque de cada item.</p></div></header>
    <nav className="product-workflow-actions" aria-label="Ações de produtos">
      {canWrite && <Link href={operation === "all" ? "/company/produtos/novo" : `/company/produtos/novo/${operation === "Fitness" ? "fitness" : "suplementos"}`}><Plus/><span><strong>Cadastrar produto{operation !== "all" ? ` · ${operation}` : ""}</strong><small>{operation === "Fitness" ? "Peças, cores e tamanhos" : operation === "Suplementos" ? "Dados, sabores e preços" : "Escolher Suplementos ou Fitness"}</small></span></Link>}
      <a href="#catalogo-produtos"><PackageSearch/><span><strong>{canWrite ? "Consultar e editar" : "Consultar produtos"}</strong><small>Busque o produto e use as ações do card</small></span></a>
      {allowedOperations.filter(value => operation === "all" || operation === value).map(value => <Link key={value} href={`/company/estoque?operacao=${value === "Fitness" ? "fitness" : "supplements"}`}><Boxes/><span><strong>Conferir estoque · {value}</strong><small>{value === "Fitness" ? "Saldo por peça, tamanho e cor" : "Saldos, locais e lotes"}</small></span></Link>)}
      {canWriteSupplements && operation !== "Fitness" && <Link href="/company/produtos/transferencias"><ArrowRightLeft/><span><strong>Transferir Suplementos</strong><small>Movimentar entre locais de estoque</small></span></Link>}
    </nav>
    <section className="company-workspace-metrics company-product-metrics"><article><PackageSearch/><span>{primaryMetricLabel}</span><strong>{productMetric}</strong></article><article><Boxes/><span>Com disponibilidade</span><strong>{availableMetric}</strong></article><article><Boxes/><span>Unidades disponíveis</span><strong>{unitMetric}</strong></article></section>
    <section className="company-workspace-panel" id="catalogo-produtos">
      <div className="completion-filters">
        <fieldset className="completion-operation"><legend>Operação</legend><div className="completion-segments">{(["all", ...allowedOperations] as const).map(value => <button type="button" key={value} aria-pressed={operation === value} onClick={() => selectOperation(value)}><span>{value === "all" ? "Todas" : value}</span><span className="completion-filter-count">{products.filter(product => value === "all" || product.operation === value).length}</span></button>)}</div></fieldset>
        <label className="completion-search"><span>Buscar produto ou oferta</span><div><Search size={17}/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, categoria, marca ou parceiro"/>{query && <button type="button" aria-label="Limpar busca" onClick={() => setQuery("")}><X size={17}/></button>}</div></label>
        <fieldset className="completion-status"><legend>O que você quer consultar?</legend><div className="completion-segments">{[{id:"all",label:"Produtos"}, ...(operation !== "Fitness" && allowedOperations.includes("Suplementos") ? [{id:"combos",label:"Combos"},{id:"partners",label:"Nos parceiros"}] : []),{id:"promotions",label:"Promoções"}].map(item => <button type="button" key={item.id} aria-pressed={view === item.id} onClick={() => selectView(item.id as CatalogView)}>{item.label}</button>)}</div></fieldset>
      </div>
      <div className="company-product-filters"><label><span>Disponibilidade</span><select value={availability} onChange={(event) => setAvailability(event.target.value as Availability)}><option value="all">Todas</option><option value="available">Com estoque</option><option value="incoming">Somente a caminho</option><option value="out">Zerados</option></select></label>{view !== "combos" && view !== "promotions" && view !== "partners" ? <><label><span>Categoria</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas as categorias</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label><span>Marca</span><select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="all">Todas as marcas</option>{brands.map((item) => <option value={item} key={item}>{item}</option>)}</select></label></> : null}{(operation !== "all" || view !== "all" || availability !== "all" || category !== "all" || brand !== "all" || query) ? <button type="button" onClick={() => { setQuery(""); setAvailability("all"); setCategory("all"); setBrand("all"); setOperation("all"); setView("all"); setPartnerId("all"); }}>Limpar filtros</button> : null}</div>
      {view !== "combos" && view !== "promotions" && view !== "partners" ? <><p className="company-workspace-count" role="status" aria-live="polite">{visible.length} produto(s) · {operation === "all" ? "Todas as operações" : operation}</p>
      <div className="company-products-grid">{visible.map((product) => { const status = availabilityOf(product); return <article className={`company-product-card stock-${status} operation-${product.operation === "Fitness" ? "fitness" : "supplements"}`} key={`${product.operation}-${product.id}`}>
        <button type="button" className="company-product-card-visual" onClick={() => setPreview(product)} aria-label={`Ampliar foto de ${product.name}`}>{product.image_url ? <img src={product.image_url} alt={product.name}/> : <PackageSearch/>}<small>Ampliar</small></button>
        <Link href={productHref(product)}><span>{product.operation} · {product.category}{product.brand ? ` · ${product.brand}` : ""}</span><h2>{product.name}</h2><p><strong>{product.available_quantity}</strong> disponível · {product.reserved_quantity} reservado · {product.incoming_quantity} chegando<br/>{product.physical_quantity} no estoque físico</p><b>{formatCurrency(product.sale_price)}</b><small>Ver ficha completa</small></Link>
        <div className="product-card-actions">{(product.operation === "Fitness" ? canWriteFitness : canWriteSupplements) && <Link href={`${productHref(product)}/editar`}>Editar cadastro</Link>}<Link href={`${productHref(product)}#${product.operation === "Fitness" ? "variacoes" : "estoque"}`}>Conferir estoque</Link></div>
      </article>; })}</div>{!visible.length && <div className="company-empty-state"><PackageSearch/><strong>Nenhum produto neste filtro</strong><span>Altere a operação, disponibilidade ou busca para localizar o cadastro.</span></div>}</> : null}
      {view === "combos" ? <><div className="company-catalog-view-head"><div><Layers3/><span><strong>Combos</strong><small>Ofertas montadas com estoque real dos componentes.</small></span></div>{canWriteSupplements && <Link className="button company-blue" href="/company/produtos/combos/novo"><Plus size={15}/>Novo combo</Link>}</div><div className="company-products-grid company-combo-grid">{visibleCombos.map((combo) => <Link className={`company-catalog-special-card ${combo.available_quantity > 0 ? "available" : combo.incoming_quantity > 0 ? "incoming" : "out"}`} href={`/company/produtos/combos/${combo.id}/editar`} key={combo.id}>{combo.image_url ? <img src={combo.image_url} alt={combo.name}/> : <Layers3/>}<span><small>{combo.active ? "Ativo" : "Inativo"} · {combo.component_count} produto(s)</small><strong>{combo.name}</strong><p>{combo.component_summary ?? combo.description ?? "Configure os produtos deste combo."}</p><b>{formatCurrency(combo.sale_price)}</b><em>{combo.available_quantity} disponível · {combo.incoming_quantity} a caminho</em></span></Link>)}{visibleCombos.length === 0 ? <div className="company-empty-state"><Layers3/><strong>Nenhum combo encontrado</strong><span>Cadastre um combo ou altere a busca.</span></div> : null}</div></> : null}
      {view === "promotions" ? <><div className="company-catalog-view-head"><div><Percent/><span><strong>Promoções ativas</strong><small>Suplementos e Fitness reunidos na Company.</small></span></div></div><div className="company-products-grid company-promotion-grid">{visiblePromotions.map((item) => { const exhausted = item.available_quantity <= 0 && item.incoming_quantity <= 0; return <article className={`company-catalog-special-card ${item.available_quantity > 0 ? "available" : item.incoming_quantity > 0 ? "incoming" : "out"}`} key={item.promotion_item_id}>{item.image_url ? <img src={item.image_url} alt={item.item_label}/> : <Percent/>}<span><small>{item.operation_scope === "fitness" ? "Fitness" : "Suplementos"} · {item.promotion_name}</small><strong>{item.item_label}</strong><p>{item.effective_discount_pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% de desconto</p><b><s>{formatCurrency(item.current_price)}</s> {formatCurrency(item.effective_promotional_price)}</b><em className={exhausted ? "promotion-exhausted" : ""}>{exhausted ? "Promoção vigente · produto esgotado" : `${item.available_quantity} disponível · ${item.incoming_quantity} a caminho`}</em></span></article>; })}{visiblePromotions.length === 0 ? <div className="company-empty-state"><Percent/><strong>Nenhuma promoção ativa</strong><span>Quando uma promoção entrar em vigor, ela aparecerá aqui.</span></div> : null}</div></> : null}
      {view === "partners" ? <><div className="company-catalog-view-head"><div><Building2/><span><strong>Estoque nos parceiros</strong><small>Saldo físico fora dos estoques próprios da Company.</small></span></div></div><div className="company-partner-stock-tabs"><button className={partnerId === "all" ? "active" : ""} type="button" onClick={() => setPartnerId("all")}>Saldo total · {partnerStock.reduce((sum, row) => sum + row.quantity, 0)}</button>{partners.map((partner) => <button className={partnerId === partner.id ? "active" : ""} type="button" onClick={() => setPartnerId(partner.id)} key={partner.id}>{partner.name}</button>)}</div><p className="company-workspace-count">{visiblePartnerStock.length} produto(s) · {partnerUnits} unidade(s)</p><div className="company-products-grid company-partner-stock-grid">{visiblePartnerStock.map((row) => <article className="company-partner-stock-card" key={`${row.locationId}-${row.productId}`}>{row.imageUrl ? <img src={row.imageUrl} alt={row.productName}/> : <PackageSearch/>}<span><small><MapPin size={12}/>{row.partnerName}{row.city ? ` · ${row.city}` : ""}</small><strong>{row.productName}</strong><p>{[row.category, row.brand].filter(Boolean).join(" · ") || row.locationName}</p><b>{row.quantity} unidade(s)</b><em>{formatCurrency(row.salePrice)}</em></span></article>)}{visiblePartnerStock.length === 0 ? <div className="company-empty-state"><Building2/><strong>Nenhum saldo encontrado</strong><span>Este parceiro não possui produtos com saldo registrado.</span></div> : null}</div></> : null}
      {view === "promotions" && canWrite ? <div className="company-promotion-create-shortcut"><Link className="button company-blue" href="/company/gestao/central/promocoes#nova-promocao"><Plus size={15}/>Adicionar promoção</Link></div> : null}
    </section>
    {preview ? <div className="company-product-click-preview" role="dialog" aria-modal="true" aria-label={`Fotos de ${preview.name}`} onClick={() => setPreview(null)}><article onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setPreview(null)} aria-label="Fechar"><X/></button><header><span>{preview.operation}</span><strong>{preview.name}</strong></header><div className={preview.secondary_image_url ? "has-secondary" : ""}>{preview.image_url ? <figure><img src={preview.image_url} alt={preview.name}/><figcaption>Produto</figcaption></figure> : null}{preview.secondary_image_url ? <figure><img src={preview.secondary_image_url} alt={`Tabela nutricional de ${preview.name}`}/><figcaption>Tabela nutricional</figcaption></figure> : null}</div></article></div> : null}
  </div>;
}
