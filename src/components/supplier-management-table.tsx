"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { SupplierManagementRow } from "@/lib/types";

type SortKey = "spend" | "concentration" | "name" | "score";

function scoreLabel(row: SupplierManagementRow) {
  if (row.operational_score === null) return "Sem amostra";
  return `${row.operational_score}/100`;
}

export function SupplierManagementTable({ suppliers }: { suppliers: SupplierManagementRow[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("spend");

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    const filtered = suppliers.filter((supplier) =>
      !normalized || supplier.name.toLocaleLowerCase("pt-BR").includes(normalized),
    );
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
      if (sort === "concentration") return b.purchase_concentration_pct - a.purchase_concentration_pct;
      if (sort === "score") return (b.operational_score ?? -1) - (a.operational_score ?? -1);
      return b.purchase_value_365d - a.purchase_value_365d;
    });
  }, [query, sort, suppliers]);

  return (
    <article className="panel supplier-management-panel">
      <div className="supplier-management-toolbar">
        <label className="supplier-search">
          <Search size={17} />
          <input
            aria-label="Buscar fornecedor"
            placeholder="Buscar fornecedor"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="supplier-sort">
          <ArrowUpDown size={16} />
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="spend">Maior compra em 12 meses</option>
            <option value="concentration">Maior concentração</option>
            <option value="score">Melhor score operacional</option>
            <option value="name">Fornecedor A–Z</option>
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="empty"><strong>Nenhum fornecedor encontrado</strong>Ajuste o termo de busca.</div>
      ) : (
        <div className="table-wrap">
          <table className="table supplier-management-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Compras · 12 meses</th>
                <th>Concentração</th>
                <th>Preço</th>
                <th>Operação</th>
                <th>Próxima compra</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <Link className="supplier-management-name" href={`/fornecedores/${supplier.id}`}>
                      <strong>{supplier.name}</strong>
                      <small>
                        {supplier.order_count} pedido(s) · última compra {supplier.last_order_on ? formatDateOnly(supplier.last_order_on) : "sem histórico"}
                      </small>
                    </Link>
                  </td>
                  <td>
                    <strong>{formatCurrency(supplier.purchase_value_365d)}</strong>
                    <small>{formatCurrency(supplier.historical_purchase_value)} no histórico</small>
                  </td>
                  <td>
                    <strong>{supplier.purchase_concentration_pct.toLocaleString("pt-BR")}%</strong>
                    <small>do valor comprado</small>
                  </td>
                  <td>
                    <strong>{supplier.priced_product_count} produto(s)</strong>
                    <small>{supplier.products_at_best_recent_price} no melhor preço recente</small>
                  </td>
                  <td>
                    <span className={`supplier-score ${supplier.operational_score === null ? "pending" : "ready"}`}>
                      {supplier.operational_score === null ? <TriangleAlert size={14} /> : <ShieldCheck size={14} />}
                      {scoreLabel(supplier)}
                    </span>
                    <small>{supplier.promised_delivery_sample} entrega(s) com promessa medida</small>
                  </td>
                  <td>
                    <strong>{formatCurrency(supplier.suggested_order_cost)}</strong>
                    <small>{supplier.suggested_units} un. sugerida(s)</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
