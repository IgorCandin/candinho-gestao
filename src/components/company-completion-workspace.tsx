/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { CircleDollarSign, Clock3, ImageIcon, PackageCheck, Search, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { PendingOrderRow } from "@/lib/types";

type CompletionOrder = PendingOrderRow & { outstanding_amount?: number | null; payment_state?: string | null; next_payment_due_at?: string | null };
type Filter = "all" | "both" | "receive" | "deliver" | "late";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Todas" }, { id: "both", label: "Receber e entregar" },
  { id: "receive", label: "Só receber" }, { id: "deliver", label: "Só entregar" }, { id: "late", label: "Vencidas" },
];

function amount(order: CompletionOrder) { return Number(order.outstanding_amount ?? (order.payment_status === "paid" ? 0 : order.total_amount)); }
function needsDelivery(order: CompletionOrder) { return order.delivery_status === "to_deliver" || order.delivery_status === "pending"; }

type SaleItemMedia = { productId: string; name: string; imageUrl: string | null; quantity: number };

export function CompanyCompletionWorkspace({ orders, itemMedia }: { orders: CompletionOrder[]; itemMedia: Record<string, SaleItemMedia[]> }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const metrics = useMemo(() => ({
    value: orders.reduce((sum, order) => sum + amount(order), 0),
    receive: orders.filter((order) => amount(order) > .005).length,
    deliver: orders.filter(needsDelivery).length,
    both: orders.filter((order) => amount(order) > .005 && needsDelivery(order)).length,
  }), [orders]);
  const visible = useMemo(() => orders.filter((order) => {
    const receive = amount(order) > .005;
    const deliver = needsDelivery(order);
    const due = order.next_payment_due_at ?? order.payment_due_at;
    const matchesFilter = filter === "all" || (filter === "both" && receive && deliver) || (filter === "receive" && receive && !deliver) || (filter === "deliver" && deliver && !receive) || (filter === "late" && receive && !!due && due.slice(0, 10) < today);
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return matchesFilter && (!needle || `${order.customer_name} ${order.product_summary ?? ""} ${order.location_name}`.toLocaleLowerCase("pt-BR").includes(needle));
  }), [filter, orders, query, today]);

  return <div className="company-workspace-v2">
    <header className="company-workspace-head"><div><span>COMPANY · OPERAÇÃO</span><h1>Concluir vendas</h1><p>Pagamento e entrega juntos, para nenhuma venda ficar pela metade.</p></div></header>
    <section className="company-workspace-metrics">
      <article><CircleDollarSign/><span>A receber</span><strong>{formatCurrency(metrics.value)}</strong></article>
      <article><Clock3/><span>Pagamentos</span><strong>{metrics.receive}</strong></article>
      <article><Truck/><span>Entregas</span><strong>{metrics.deliver}</strong></article>
      <article><PackageCheck/><span>As duas etapas</span><strong>{metrics.both}</strong></article>
    </section>
    <section className="company-workspace-panel">
      <div className="company-workspace-toolbar"><div>{FILTERS.map((item) => <button key={item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div><label><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou produto"/></label></div>
      <p className="company-workspace-count">{visible.length} venda(s) nesta fila</p>
      <div className="company-completion-grid">{visible.map((order) => {
        const receive = amount(order) > .005; const deliver = needsDelivery(order); const due = order.next_payment_due_at ?? order.payment_due_at;
        return <article className="company-completion-card" key={order.id}>
          <div className="company-completion-products">{(itemMedia[order.id] ?? []).slice(0, 5).map((item) => <span key={item.productId} title={`${item.name} ×${item.quantity}`}>{item.imageUrl ? <img src={item.imageUrl} alt={item.name}/> : <ImageIcon/>}{item.quantity > 1 && <b>{item.quantity}×</b>}</span>)}</div>
          <div className="company-completion-body"><div className="company-completion-flags">{receive && <span className="receive">Receber</span>}{deliver && <span className="deliver">Entregar</span>}</div><h2>{order.customer_name}</h2><p>{order.product_summary ?? "Venda sem resumo de produtos"}</p><small>{order.location_name} · {formatDateOnly(order.business_date)}</small>{due && receive && <small>Vencimento: {formatDateOnly(due)}</small>}</div>
          <div className="company-completion-value"><span>Pendente</span><strong>{formatCurrency(amount(order))}</strong><Link href={`/company/concluir/${order.id}`}>Concluir venda →</Link></div>
        </article>;
      })}</div>
      {visible.length === 0 && <div className="company-empty-state"><PackageCheck/><strong>Nenhuma pendência aqui.</strong><span>Troque o filtro ou faça outra busca.</span></div>}
    </section>
  </div>;
}
