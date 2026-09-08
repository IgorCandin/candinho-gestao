/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { Boxes, PackageSearch, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

export type CompanyProductRow = {
  id: string; name: string; category: string; brand: string | null; image_url: string | null;
  sale_price: number; physical_quantity: number; reserved_quantity: number; available_quantity: number;
  incoming_quantity: number; operation: "Suplementos" | "Fitness"; secondary_image_url?: string | null;
};

type Availability = "all" | "available" | "incoming" | "out";
function availabilityOf(product: CompanyProductRow): Exclude<Availability, "all"> { return product.available_quantity > 0 ? "available" : product.incoming_quantity > 0 ? "incoming" : "out"; }
function productHref(product: CompanyProductRow) { return product.operation === "Fitness" ? `/company/produtos/fitness/${product.id}` : `/company/produtos/${product.id}`; }

export function CompanyProductsWorkspace({ products, initialOperation = "all" }: { products: CompanyProductRow[]; initialOperation?: "all" | "Suplementos" | "Fitness" }) {
  const [query, setQuery] = useState("");
  const [operation, setOperation] = useState<"all" | "Suplementos" | "Fitness">(initialOperation);
  const [availability, setAvailability] = useState<Availability>("all");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [preview, setPreview] = useState<CompanyProductRow | null>(null);
  useEffect(() => { if (!preview) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [preview]);
  const operationRows = useMemo(() => products.filter((product) => operation === "all" || product.operation === operation), [operation, products]);
  const categories = useMemo(() => [...new Set(operationRows.map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [operationRows]);
  const brands = useMemo(() => [...new Set(operationRows.map((product) => product.brand).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "pt-BR")), [operationRows]);
  const visible = useMemo(() => products.filter((product) => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return (operation === "all" || product.operation === operation) && (availability === "all" || availabilityOf(product) === availability) && (category === "all" || product.category === category) && (brand === "all" || product.brand === brand) && (!needle || `${product.name} ${product.category} ${product.brand ?? ""}`.toLocaleLowerCase("pt-BR").includes(needle));
  }), [availability, brand, category, operation, products, query]);
  const available = products.filter((product) => product.available_quantity > 0);
  const resetDimensions = (nextOperation: typeof operation) => { setOperation(nextOperation); setCategory("all"); setBrand("all"); };

  return <div className="company-workspace-v2">
    <header className="company-workspace-head"><div><span>COMPANY · CATÁLOGO INTERNO</span><h1>Produtos</h1><p>Clique na foto para ampliar; clique nos dados para abrir todas as informações.</p></div><Link className="button company-blue" href="/company/produtos/novo"><Plus size={16}/>Novo produto</Link></header>
    <section className="company-workspace-metrics company-product-metrics"><article><PackageSearch/><span>Produtos ativos</span><strong>{products.length}</strong></article><article><Boxes/><span>Com disponibilidade</span><strong>{available.length}</strong></article><article><Boxes/><span>Unidades disponíveis</span><strong>{available.reduce((sum, product) => sum + product.available_quantity, 0)}</strong></article></section>
    <section className="company-workspace-panel"><div className="company-workspace-toolbar"><div><button className={operation === "all" ? "active" : ""} onClick={() => resetDimensions("all")}>Todas</button><button className={operation === "Suplementos" ? "active" : ""} onClick={() => resetDimensions("Suplementos")}>Suplementos</button><button className={operation === "Fitness" ? "active" : ""} onClick={() => resetDimensions("Fitness")}>Fitness</button></div><label><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: pré-treino, whey, creatina..."/></label></div>
      <div className="company-product-filters"><label><span>Disponibilidade</span><select value={availability} onChange={(event) => setAvailability(event.target.value as Availability)}><option value="all">Todas</option><option value="available">Com estoque</option><option value="incoming">Somente a caminho</option><option value="out">Zerados</option></select></label><label><span>Categoria</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas as categorias</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label><span>Marca</span><select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="all">Todas as marcas</option>{brands.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>{(availability !== "all" || category !== "all" || brand !== "all" || query) ? <button type="button" onClick={() => { setQuery(""); setAvailability("all"); setCategory("all"); setBrand("all"); }}>Limpar filtros</button> : null}</div><p className="company-workspace-count">{visible.length} produto(s)</p>
      <div className="company-products-grid">{visible.map((product) => { const status = availabilityOf(product); return <article className={`company-product-card stock-${status} operation-${product.operation === "Fitness" ? "fitness" : "supplements"}`} key={`${product.operation}-${product.id}`}>
        <button type="button" className="company-product-card-visual" onClick={() => setPreview(product)} aria-label={`Ampliar foto de ${product.name}`}>{product.image_url ? <img src={product.image_url} alt={product.name}/> : <PackageSearch/>}<small>Ampliar</small></button>
        <Link href={productHref(product)}><span>{product.operation} · {product.category}{product.brand ? ` · ${product.brand}` : ""}</span><h2>{product.name}</h2><p><strong>{product.available_quantity}</strong> disponível · {product.reserved_quantity} reservado · {product.incoming_quantity} chegando</p><b>{formatCurrency(product.sale_price)}</b><small>Abrir informações →</small></Link>
      </article>; })}</div>
    </section>
    {preview ? <div className="company-product-click-preview" role="dialog" aria-modal="true" aria-label={`Fotos de ${preview.name}`} onClick={() => setPreview(null)}><article onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setPreview(null)} aria-label="Fechar"><X/></button><header><span>{preview.operation}</span><strong>{preview.name}</strong></header><div className={preview.secondary_image_url ? "has-secondary" : ""}>{preview.image_url ? <figure><img src={preview.image_url} alt={preview.name}/><figcaption>Produto</figcaption></figure> : null}{preview.secondary_image_url ? <figure><img src={preview.secondary_image_url} alt={`Tabela nutricional de ${preview.name}`}/><figcaption>Tabela nutricional</figcaption></figure> : null}</div></article></div> : null}
  </div>;
}
