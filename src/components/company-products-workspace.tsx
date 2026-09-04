/* eslint-disable @next/next/no-img-element */
"use client";

import { Boxes, PackageSearch, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { InventoryOverviewRow } from "@/lib/types";

export function CompanyProductsWorkspace({ products }: { products: InventoryOverviewRow[] }) {
  const [query, setQuery] = useState("");
  const [stockOnly, setStockOnly] = useState(true);
  const visible = useMemo(() => products.filter((product) => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return (!stockOnly || product.available_quantity > 0) && (!needle || `${product.product_name} ${product.category} ${product.brand ?? ""}`.toLocaleLowerCase("pt-BR").includes(needle));
  }), [products, query, stockOnly]);
  const available = products.filter((product) => product.available_quantity > 0);

  return <div className="company-workspace-v2">
    <header className="company-workspace-head"><div><span>COMPANY · CATÁLOGO INTERNO</span><h1>Produtos</h1><p>Veja rapidamente o que pode ser vendido, quanto está disponível e o preço atual.</p></div></header>
    <section className="company-workspace-metrics company-product-metrics"><article><PackageSearch/><span>Produtos ativos</span><strong>{products.length}</strong></article><article><Boxes/><span>Com disponibilidade</span><strong>{available.length}</strong></article><article><Boxes/><span>Unidades disponíveis</span><strong>{available.reduce((sum, product) => sum + product.available_quantity, 0)}</strong></article></section>
    <section className="company-workspace-panel"><div className="company-workspace-toolbar"><div><button className={stockOnly ? "active" : ""} onClick={() => setStockOnly(true)}>Disponíveis</button><button className={!stockOnly ? "active" : ""} onClick={() => setStockOnly(false)}>Todos</button></div><label><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Produto, marca ou categoria"/></label></div><p className="company-workspace-count">{visible.length} produto(s)</p>
      <div className="company-products-grid">{visible.map((product) => <article className="company-product-card" key={product.product_id}><div>{product.image_url ? <img src={product.image_url} alt={product.product_name}/> : <PackageSearch/>}</div><section><span>{product.category}{product.brand ? ` · ${product.brand}` : ""}</span><h2>{product.product_name}</h2><p><strong>{product.available_quantity}</strong> disponível · {product.reserved_quantity} reservado · {product.incoming_quantity} chegando</p><b>{formatCurrency(product.sale_price)}</b></section></article>)}</div>
    </section>
  </div>;
}
