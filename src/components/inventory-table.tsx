/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowDownUp, ImageIcon, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { InventoryOverviewRow } from "@/lib/types";

type SortKey = "product" | "physical" | "reserved" | "available" | "incoming" | "status";

type StatusMeta = { label: string; color: string };
const STATUS: Record<string, StatusMeta> = {
  healthy: { label: "Saudável", color: "green" },
  below_minimum: { label: "Repor", color: "orange" },
  out_of_stock: { label: "Zerado", color: "red" },
  fully_reserved: { label: "Todo reservado", color: "orange" },
  incoming: { label: "A caminho", color: "blue" },
  incoming_only: { label: "A caminho", color: "blue" },
};

export function InventoryTable({ rows }: { rows: InventoryOverviewRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("product");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  function sortBy(key: SortKey) {
    if (sortKey === key) setDirection((value) => value === "asc" ? "desc" : "asc");
    else { setSortKey(key); setDirection(key === "product" ? "asc" : "desc"); }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return rows
      .filter((row) => !query || `${row.product_name} ${row.category} ${row.brand ?? ""}`.toLocaleLowerCase("pt-BR").includes(query))
      .filter((row) => status === "all" || row.stock_status === status)
      .sort((a, b) => {
        let result = 0;
        if (sortKey === "product") result = a.product_name.localeCompare(b.product_name, "pt-BR");
        if (sortKey === "physical") result = a.physical_quantity - b.physical_quantity;
        if (sortKey === "reserved") result = a.reserved_quantity - b.reserved_quantity;
        if (sortKey === "available") result = a.available_quantity - b.available_quantity;
        if (sortKey === "incoming") result = a.incoming_quantity - b.incoming_quantity;
        if (sortKey === "status") result = (STATUS[a.stock_status]?.label ?? a.stock_status).localeCompare(STATUS[b.stock_status]?.label ?? b.stock_status, "pt-BR");
        return direction === "asc" ? result : -result;
      });
  }, [rows, search, status, sortKey, direction]);

  return <>
    <div className="inventory-toolbar">
      <label className="inventory-search"><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto, categoria ou marca" /></label>
      <select className="select inventory-status-filter" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="all">Todos os status</option>
        <option value="healthy">Saudável</option>
        <option value="below_minimum">Repor</option>
        <option value="out_of_stock">Zerado</option>
        <option value="fully_reserved">Todo reservado</option>
        <option value="incoming">A caminho</option>
        <option value="incoming_only">Somente a caminho</option>
      </select>
      <span className="inventory-result-count">{filtered.length} produto(s)</span>
    </div>

    <div className="table-wrap"><table className="inventory-control-table"><thead><tr>
      <th><button type="button" onClick={() => sortBy("product")}>Produto <ArrowDownUp size={13}/></button></th>
      <th><button type="button" onClick={() => sortBy("physical")}>Físico <ArrowDownUp size={13}/></button></th>
      <th><button type="button" onClick={() => sortBy("reserved")}>Reservado <ArrowDownUp size={13}/></button></th>
      <th><button type="button" onClick={() => sortBy("available")}>Disponível <ArrowDownUp size={13}/></button></th>
      <th><button type="button" onClick={() => sortBy("incoming")}>A caminho <ArrowDownUp size={13}/></button></th>
      <th>Mínimo</th><th>Valor de custo</th>
      <th><button type="button" onClick={() => sortBy("status")}>Situação <ArrowDownUp size={13}/></button></th>
    </tr></thead><tbody>
      {filtered.map((row) => {
        const meta = STATUS[row.stock_status] ?? { label: row.stock_status, color: "gray" };
        return <tr key={row.product_id}>
          <td><Link className="inventory-product-link" href={`/estoque/${row.product_id}`}>
            <span className="inventory-product-thumb">{row.image_url ? <img src={row.image_url} alt={row.product_name}/> : <ImageIcon size={20}/>}</span>
            <span><strong>{row.product_name}</strong><small>{[row.category, row.brand].filter(Boolean).join(" · ")}</small></span>
          </Link></td>
          <td className="amount">{row.physical_quantity}</td>
          <td className={`amount ${row.reserved_quantity > 0 ? "warning-text" : ""}`}>{row.reserved_quantity}</td>
          <td className={`amount ${row.available_quantity > 0 ? "positive" : "warning-text"}`}>{row.available_quantity}</td>
          <td className={`amount ${row.incoming_quantity > 0 ? "blue-text" : ""}`}>{row.incoming_quantity}</td>
          <td>{row.min_stock}</td>
          <td>{formatCurrency(row.stock_cost_value)}</td>
          <td><span className={`badge ${meta.color}`}><span className="dot"/>{meta.label}</span></td>
        </tr>;
      })}
    </tbody></table></div>
    {filtered.length === 0 && <div className="empty"><strong>Nenhum produto encontrado</strong>Ajuste a busca ou o filtro de situação.</div>}
  </>;
}
