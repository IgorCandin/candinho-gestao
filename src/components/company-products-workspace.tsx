/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { Boxes, PackageSearch, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { formatCurrency } from "@/lib/format";
export type CompanyProductRow = {
  id: string; name: string; category: string; brand: string | null; image_url: string | null;
  sale_price: number; physical_quantity: number; reserved_quantity: number; available_quantity: number;
  incoming_quantity: number; operation: "Suplementos" | "Fitness";
  secondary_image_url?: string | null;
};

export function CompanyProductsWorkspace({ products }: { products: CompanyProductRow[] }) {
  const [query, setQuery] = useState("");
  const [stockOnly, setStockOnly] = useState(false);
  const [operation, setOperation] = useState<"all" | "Suplementos" | "Fitness">("all");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [preview, setPreview] = useState<CompanyProductRow | null>(null);
  const categories = useMemo(() => [...new Set(products.filter((product) => operation === "all" || product.operation === operation).map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [operation, products]);
  const brands = useMemo(() => [...new Set(products.filter((product) => operation === "all" || product.operation === operation).map((product) => product.brand).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "pt-BR")), [operation, products]);
  const visible = useMemo(() => products.filter((product) => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return (operation === "all" || product.operation === operation) && (category === "all" || product.category === category) && (brand === "all" || product.brand === brand) && (!stockOnly || product.available_quantity > 0) && (!needle || `${product.name} ${product.category} ${product.brand ?? ""}`.toLocaleLowerCase("pt-BR").includes(needle));
  }), [brand, category, operation, products, query, stockOnly]);
  const available = products.filter((product) => product.available_quantity > 0);

  return <div className="company-workspace-v2">
    <header className="company-workspace-head"><div><span>COMPANY · CATÁLOGO INTERNO</span><h1>Produtos</h1><p>Veja rapidamente o que pode ser vendido, quanto está disponível e o preço atual.</p></div></header>
    <section className="company-workspace-metrics company-product-metrics"><article><PackageSearch/><span>Produtos ativos</span><strong>{products.length}</strong></article><article><Boxes/><span>Com disponibilidade</span><strong>{available.length}</strong></article><article><Boxes/><span>Unidades disponíveis</span><strong>{available.reduce((sum, product) => sum + product.available_quantity, 0)}</strong></article></section>
    <section className="company-workspace-panel"><div className="company-workspace-toolbar"><div><button className={operation === "all" ? "active" : ""} onClick={() => { setOperation("all"); setCategory("all"); setBrand("all"); }}>Todas</button><button className={operation === "Suplementos" ? "active" : ""} onClick={() => { setOperation("Suplementos"); setCategory("all"); setBrand("all"); }}>Suplementos</button><button className={operation === "Fitness" ? "active" : ""} onClick={() => { setOperation("Fitness"); setCategory("all"); setBrand("all"); }}>Fitness</button><button className={stockOnly ? "active" : ""} onClick={() => setStockOnly((value) => !value)}>Com estoque</button></div><label><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: pré-treino, whey, creatina..."/></label></div>
      <div className="company-product-filters"><label><span>Categoria</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas as categorias</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label><span>Marca</span><select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="all">Todas as marcas</option>{brands.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>{(category !== "all" || brand !== "all" || query) ? <button type="button" onClick={() => { setQuery(""); setCategory("all"); setBrand("all"); }}>Limpar filtros</button> : null}</div><p className="company-workspace-count">{visible.length} produto(s)</p>
      <div className="company-products-grid">{visible.map((product) => <Link href={product.operation === "Fitness" ? `/company/produtos/fitness/${product.id}` : `/company/produtos/${product.id}`} className="company-product-card" key={`${product.operation}-${product.id}`} onFocus={() => setPreview(product)} onBlur={() => setPreview(null)} onPointerMove={(event: ReactPointerEvent<HTMLAnchorElement>) => { const rect = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--product-rx", `${(.5 - (event.clientY - rect.top) / rect.height) * 5}deg`); event.currentTarget.style.setProperty("--product-ry", `${((event.clientX - rect.left) / rect.width - .5) * 6}deg`); }} onPointerLeave={(event) => { setPreview(null); event.currentTarget.style.setProperty("--product-rx", "0deg"); event.currentTarget.style.setProperty("--product-ry", "0deg"); }} style={{ "--product-rx": "0deg", "--product-ry": "0deg" } as CSSProperties}>
        <div className="company-product-card-visual" onPointerEnter={() => setPreview(product)} onPointerLeave={() => setPreview(null)}>{product.image_url ? <img src={product.image_url} alt={product.name}/> : <PackageSearch/>}</div>
        <section><span>{product.operation} · {product.category}{product.brand ? ` · ${product.brand}` : ""}</span><h2>{product.name}</h2><p><strong>{product.available_quantity}</strong> disponível · {product.reserved_quantity} reservado · {product.incoming_quantity} chegando</p><b>{formatCurrency(product.sale_price)}</b><small>Abrir informações →</small></section>
      </Link>)}</div>
    </section>
    {preview?.image_url ? <div className={`company-product-hover-preview ${preview.secondary_image_url ? "has-secondary" : ""}`} aria-hidden="true"><figure><img src={preview.image_url} alt=""/><figcaption>Produto</figcaption></figure>{preview.secondary_image_url ? <figure><img src={preview.secondary_image_url} alt=""/><figcaption>Tabela nutricional</figcaption></figure> : null}</div> : null}
  </div>;
}
