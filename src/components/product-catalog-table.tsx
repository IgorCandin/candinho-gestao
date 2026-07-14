/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpDown, ImageOff, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { ProductCatalogRow } from "@/lib/types";

type SortKey = "name" | "category" | "available" | "incoming" | "cash" | "installment" | "status";
type SortDirection = "asc" | "desc";

function stockLabel(status: string) {
  if (status === "healthy") return { label: "Disponível", tone: "green" };
  if (status === "incoming") return { label: "Com reposição", tone: "blue" };
  if (status === "incoming_only") return { label: "A caminho", tone: "blue" };
  if (status === "fully_reserved") return { label: "Reservado", tone: "orange" };
  if (status === "below_minimum") return { label: "Baixo", tone: "orange" };
  if (status === "inactive") return { label: "Inativo", tone: "gray" };
  return { label: "Sem estoque", tone: "red" };
}

function compare(a: ProductCatalogRow, b: ProductCatalogRow, key: SortKey) {
  if (key === "name") return a.name.localeCompare(b.name, "pt-BR");
  if (key === "category") return a.category.localeCompare(b.category, "pt-BR");
  if (key === "available") return a.available_quantity - b.available_quantity;
  if (key === "incoming") return a.incoming_quantity - b.incoming_quantity;
  if (key === "cash") return a.sale_price - b.sale_price;
  if (key === "installment") return a.installment_price - b.installment_price;
  return stockLabel(a.stock_status).label.localeCompare(stockLabel(b.stock_status).label, "pt-BR");
}

function HeaderButton({ label, sortKey, currentKey, onSort }: { label: string; sortKey: SortKey; currentKey: SortKey; onSort: (key: SortKey) => void }) {
  return <button className={currentKey === sortKey ? "active" : ""} type="button" onClick={() => onSort(sortKey)}>{label}<ArrowUpDown size={13} /></button>;
}

export function ProductCatalogTable({ products, categories }: { products: ProductCatalogRow[]; categories: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("active");
  const [stock, setStock] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return products
      .filter((product) => !normalized || `${product.name} ${product.category} ${product.brand ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalized))
      .filter((product) => category === "all" || product.category === category)
      .filter((product) => status === "all" || (status === "active" ? product.active : !product.active))
      .filter((product) => stock === "all" || (stock === "available" ? product.available_quantity > 0 : stock === "incoming" ? product.incoming_quantity > 0 : product.available_quantity === 0))
      .sort((a, b) => {
        const value = compare(a, b, sortKey);
        return sortDirection === "asc" ? value : -value;
      });
  }, [products, query, category, status, stock, sortKey, sortDirection]);

  function sort(key: SortKey) {
    if (key === sortKey) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection("asc"); }
  }

  return (
    <article className="panel product-catalog-panel">
      <div className="product-catalog-toolbar">
        <label className="product-catalog-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto, marca ou categoria" /></label>
        <select className="select product-filter-select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas as categorias</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select className="select product-filter-select" value={stock} onChange={(event) => setStock(event.target.value)}><option value="all">Todos os estoques</option><option value="available">Disponíveis</option><option value="incoming">A caminho</option><option value="empty">Sem disponibilidade</option></select>
        <select className="select product-filter-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option></select>
        <span className="product-result-count">{filtered.length} produto{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><strong>Nenhum produto encontrado</strong>Altere os filtros ou a busca.</div>
      ) : (
        <div className="table-wrap">
          <table className="products-table product-catalog-table">
            <thead><tr>
              <th><HeaderButton label="Produto" sortKey="name" currentKey={sortKey} onSort={sort} /></th>
              <th><HeaderButton label="Disponível" sortKey="available" currentKey={sortKey} onSort={sort} /></th>
              <th><HeaderButton label="A caminho" sortKey="incoming" currentKey={sortKey} onSort={sort} /></th>
              <th><HeaderButton label="À vista" sortKey="cash" currentKey={sortKey} onSort={sort} /></th>
              <th><HeaderButton label="A prazo" sortKey="installment" currentKey={sortKey} onSort={sort} /></th>
              <th><HeaderButton label="Situação" sortKey="status" currentKey={sortKey} onSort={sort} /></th>
              <th aria-label="Abrir produto" />
            </tr></thead>
            <tbody>{filtered.map((product) => {
              const state = stockLabel(product.stock_status);
              return <tr key={product.id}>
                <td><Link className="product-cell product-link" href={`/produtos/${product.id}`}>
                  {product.thumbnail_url ? <img className="product-thumb" src={product.thumbnail_url} alt="" loading="lazy" /> : <span className="product-avatar">{product.image_url ? <ImageOff size={17} /> : product.name.slice(0, 2).toUpperCase()}</span>}
                  <div><div className="cell-main">{product.name}</div><div className="cell-sub">{product.category}{product.brand ? ` · ${product.brand}` : ""}</div></div>
                </Link></td>
                <td><strong className={product.available_quantity > 0 ? "positive" : "muted-number"}>{product.available_quantity}</strong>{product.reserved_quantity > 0 && <div className="cell-sub">{product.reserved_quantity} reservada{product.reserved_quantity === 1 ? "" : "s"}</div>}</td>
                <td><strong className={product.incoming_quantity > 0 ? "blue-text" : "muted-number"}>{product.incoming_quantity}</strong>{product.awaiting_sales_quantity > 0 && <div className="cell-sub">{product.awaiting_sales_quantity} aguardando</div>}</td>
                <td className="amount">{formatCurrency(product.sale_price)}</td>
                <td className="amount">{formatCurrency(product.installment_price)}</td>
                <td><span className={`badge ${state.tone}`}><span className="dot" />{state.label}</span></td>
                <td><Link className="icon-link" href={`/produtos/${product.id}`} aria-label={`Abrir ${product.name}`}><ArrowRight size={18} /></Link></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </article>
  );
}
