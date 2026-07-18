/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowRight, ImageOff, LayoutGrid, Rows3, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { FitnessProductRow } from "@/lib/types";

type ViewMode = "deck" | "gallery";

export function FitnessProductCatalog({
  products,
  salesMode = false,
}: {
  products: FitnessProductRow[];
  salesMode?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("deck");

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return products
      .filter((product) => !q || `${product.name} ${product.category} ${product.description ?? ""}`.toLocaleLowerCase("pt-BR").includes(q))
      .filter((product) => category === "all" || product.category === category)
      .filter((product) =>
        stock === "all"
          ? true
          : stock === "available"
            ? product.available_quantity > 0
            : stock === "incoming"
              ? product.incoming_quantity > 0
              : product.available_quantity === 0 && product.incoming_quantity === 0,
      )
      .sort((a, b) =>
        Number(b.available_quantity > 0) - Number(a.available_quantity > 0)
        || Number(b.incoming_quantity > 0) - Number(a.incoming_quantity > 0)
        || a.category.localeCompare(b.category, "pt-BR")
        || a.name.localeCompare(b.name, "pt-BR"),
      );
  }, [products, query, category, stock]);

  function priceLabel(product: FitnessProductRow) {
    return product.min_sale_price === product.max_sale_price
      ? formatCurrency(product.min_sale_price)
      : `${formatCurrency(product.min_sale_price)} – ${formatCurrency(product.max_sale_price)}`;
  }

  return (
    <article className="panel product-catalog-panel">
      <div className="product-catalog-toolbar">
        <label className="product-catalog-search">
          <Search size={16}/>
          <input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Buscar peça, modelo ou categoria..." />
        </label>

        <select className="select product-filter-select" value={category} onChange={(event)=>setCategory(event.target.value)}>
          <option value="all">Todas as categorias</option>
          {categories.map((item)=><option key={item} value={item}>{item}</option>)}
        </select>

        <select className="select product-filter-select" value={stock} onChange={(event)=>setStock(event.target.value)}>
          <option value="all">Todos os estoques</option>
          <option value="available">Disponíveis</option>
          <option value="incoming">A caminho</option>
          <option value="empty">Sem disponibilidade</option>
        </select>

        <div className="product-view-toggle" aria-label="Modo de visualização">
          <button className={viewMode==="deck"?"active":""} type="button" onClick={()=>setViewMode("deck")}><Rows3 size={15}/>Deck</button>
          <button className={viewMode==="gallery"?"active":""} type="button" onClick={()=>setViewMode("gallery")}><LayoutGrid size={15}/>Gallery</button>
        </div>

        <span className="product-result-count">{filtered.length} produto{filtered.length===1?"":"s"}</span>
      </div>

      {salesMode && (
        <div className="sales-profile-note">
          <strong>Perfil Vendas</strong>
          <span>Consulta comercial de preço e disponibilidade. Custos e alterações permanecem ocultos.</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty"><strong>Nenhum produto encontrado</strong>Altere os filtros ou a busca.</div>
      ) : viewMode === "gallery" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))",
            gap: 12,
            padding: 14,
          }}
        >
          {filtered.map((product)=>(
            <Link
              key={product.id}
              href={salesMode ? "/fitness/produtos" : `/fitness/produtos/${product.id}`}
              style={{
                minWidth: 0,
                display: "grid",
                gridTemplateRows: "170px minmax(0,1fr)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                overflow: "hidden",
                background: "rgba(255,255,255,.016)",
              }}
            >
              <div style={{ display: "grid", placeItems: "center", background: "rgba(255,255,255,.025)", overflow: "hidden" }}>
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain" }}/>
                  : <ImageOff size={30}/>}
              </div>
              <div style={{ padding: 13, display: "grid", gap: 9 }}>
                <div>
                  <strong style={{ display: "block", fontSize: 12 }}>{product.name}</strong>
                  <small style={{ color: "var(--muted)", fontSize: 9 }}>{product.category} · {product.variant_count} variação(ões)</small>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  <span style={{ padding: 8, border: "1px solid var(--line)", borderRadius: 9, color: "var(--muted)", fontSize: 8 }}>
                    Disponível <b style={{ display: "block", color: "var(--text)", fontSize: 12 }}>{product.available_quantity}</b>
                  </span>
                  <span style={{ padding: 8, border: "1px solid var(--line)", borderRadius: 9, color: "var(--muted)", fontSize: 8 }}>
                    A caminho <b style={{ display: "block", color: "var(--text)", fontSize: 12 }}>{product.incoming_quantity}</b>
                  </span>
                </div>
                <strong style={{ fontSize: 14 }}>{priceLabel(product)}</strong>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th><th>Categoria</th><th>Variações</th><th>Disponível</th><th>Reservado</th><th>A caminho</th><th>Faixa de preço</th><th/>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product)=>(
                <tr key={product.id}>
                  <td>
                    {salesMode
                      ? <strong>{product.name}</strong>
                      : <Link className="table-link" href={`/fitness/produtos/${product.id}`}>{product.name}</Link>}
                    <small>{product.active?"Ativo":"Inativo"}</small>
                  </td>
                  <td>{product.category}</td>
                  <td>{product.variant_count}</td>
                  <td>{product.available_quantity}</td>
                  <td>{product.reserved_quantity}</td>
                  <td>{product.incoming_quantity}</td>
                  <td>{priceLabel(product)}</td>
                  <td>{!salesMode&&<Link className="icon-link" href={`/fitness/produtos/${product.id}`}><ArrowRight size={17}/></Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
