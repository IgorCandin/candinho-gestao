"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, PackageCheck, Truck } from "lucide-react";
import type { SupplierOrderSummary } from "@/lib/types";
import { formatCurrency, formatDateOnly } from "@/lib/format";

function statusLabel(status: string) {
  if (status === "received") return "Recebido";
  if (status === "partial") return "Parcial";
  if (status === "cancelled") return "Cancelado";
  return "A caminho";
}

export function SupplierOrdersTable({ orders }: { orders: SupplierOrderSummary[] }) {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [sort, setSort] = useState<"date" | "supplier" | "pending">("date");
  const rows = useMemo(() => {
    const filtered = orders.filter((order) => tab === "pending" ? ["pending", "partial"].includes(order.status) : ["received", "cancelled"].includes(order.status));
    return [...filtered].sort((a, b) => {
      if (sort === "supplier") return a.supplier_name.localeCompare(b.supplier_name, "pt-BR");
      if (sort === "pending") return b.pending_units - a.pending_units;
      return b.ordered_on.localeCompare(a.ordered_on);
    });
  }, [orders, sort, tab]);

  return (
    <>
      <nav className="period-tabs" aria-label="Situação dos pedidos de fornecedor">
        <button className={`period-tab ${tab === "pending" ? "active" : ""}`} type="button" onClick={() => setTab("pending")}>Pendentes</button>
        <button className={`period-tab ${tab === "history" ? "active" : ""}`} type="button" onClick={() => setTab("history")}>Histórico</button>
      </nav>
      <article className="panel">
        <div className="supplier-table-toolbar">
          <span>{rows.length} {rows.length === 1 ? "pedido" : "pedidos"}</span>
          <div>
            <ArrowUpDown size={15} />
            <select className="select compact-select" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
              <option value="date">Mais recente</option>
              <option value="supplier">Fornecedor A–Z</option>
              <option value="pending">Mais unidades pendentes</option>
            </select>
          </div>
        </div>
        {rows.length === 0 ? <div className="empty"><strong>Nenhum pedido nesta situação</strong>Os pedidos aparecerão aqui quando forem registrados.</div> : (
          <div className="table-wrap">
            <table className="table supplier-orders-table">
              <thead><tr><th>Fornecedor</th><th>Produtos</th><th>Data</th><th>Destino</th><th>Recebimento</th><th>Vendas aguardando</th><th>Total</th></tr></thead>
              <tbody>{rows.map((order) => (
                <tr key={order.id}>
                  <td><Link className="supplier-order-row-link" href={`/pedidos-fornecedor/${order.id}`}><span className={`supplier-order-icon ${order.status}`}>{order.status === "received" ? <PackageCheck size={18} /> : <Truck size={18} />}</span><span><strong>{order.supplier_name}</strong><small>{statusLabel(order.status)}</small></span></Link></td>
                  <td><Link className="table-link" href={`/pedidos-fornecedor/${order.id}`}>{order.product_summary ?? "—"}</Link></td>
                  <td>{formatDateOnly(order.ordered_on)}</td>
                  <td>{order.destination_code}</td>
                  <td><span className={`date-status ${order.status === "received" ? "green" : "orange"}`}>{order.received_units}/{order.ordered_units} un.</span></td>
                  <td>{order.waiting_sales_count > 0 ? <span className="date-status orange">{order.waiting_sales_count} venda(s)</span> : <span className="muted-value">—</span>}</td>
                  <td><strong>{formatCurrency(order.order_total)}</strong></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </article>
    </>
  );
}
