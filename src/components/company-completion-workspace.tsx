/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { CircleDollarSign, Clock3, ImageIcon, PackageCheck, Search, Truck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { FitnessSaleActions } from "@/components/fitness-sale-actions";
import { CompanyGroupedReceipt } from "@/components/company-grouped-receipt";
import { SalePaymentPanel } from "@/components/sale-payment-panel";
import { SaleStatusActions } from "@/components/sale-status-actions";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { PendingOrderRow } from "@/lib/types";

export type CompletionOrder = PendingOrderRow & { outstanding_amount?: number | null; payment_state?: string | null; next_payment_due_at?: string | null; operation?: "Suplementos" | "Fitness"; details_href?: string; customer_key?: string; incoming_order_id?: string | null };
type Filter = "all" | "receive" | "deliver" | "late";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Todas" }, { id: "receive", label: "Receber" },
  { id: "deliver", label: "Entregar" }, { id: "late", label: "Vencidas" },
];

function amount(order: CompletionOrder) { return Number(order.outstanding_amount ?? (["paid", "received"].includes(order.payment_status) ? 0 : order.total_amount)); }
function needsDelivery(order: CompletionOrder) { return !["delivered", "received"].includes(order.delivery_status); }

type SaleItemMedia = { id: string; productId: string; name: string; imageUrl: string | null; quantity: number; deliveredQuantity: number };

export function CompanyCompletionWorkspace({ orders, itemMedia }: { orders: CompletionOrder[]; itemMedia: Record<string, SaleItemMedia[]> }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CompletionOrder | null>(null);
  const [groupCustomerId, setGroupCustomerId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const metrics = useMemo(() => ({
    value: orders.reduce((sum, order) => sum + amount(order), 0),
    receive: orders.filter((order) => amount(order) > .005).length,
    deliver: orders.filter(needsDelivery).length,
    both: orders.filter((order) => amount(order) > .005 && needsDelivery(order)).length,
  }), [orders]);
  const visible = useMemo(() => {
    const filtered = orders.filter((order) => {
    const receive = amount(order) > .005;
    const deliver = needsDelivery(order);
    const due = order.next_payment_due_at ?? order.payment_due_at;
    const matchesFilter = filter === "all" || (filter === "receive" && receive) || (filter === "deliver" && deliver) || (filter === "late" && receive && !!due && due.slice(0, 10) < today);
    const needle = query.trim().toLocaleLowerCase("pt-BR");
      return matchesFilter && (!needle || `${order.customer_name} ${order.product_summary ?? ""} ${order.location_name}`.toLocaleLowerCase("pt-BR").includes(needle));
    });
    const firstPosition = new Map<string, number>();
    filtered.forEach((order, index) => { if (!firstPosition.has(order.customer_key ?? order.customer_name)) firstPosition.set(order.customer_key ?? order.customer_name, index); });
    return filtered.map((order, index) => ({ order, index })).sort((a, b) => (firstPosition.get(a.order.customer_key ?? a.order.customer_name) ?? a.index) - (firstPosition.get(b.order.customer_key ?? b.order.customer_name) ?? b.index) || a.index - b.index).map(({ order }) => order);
  }, [filter, orders, query, today]);
  const payableByCustomer = useMemo(() => {
    const groups = new Map<string, CompletionOrder[]>();
    for (const order of orders) {
      if (!order.customer_id || order.operation === "Fitness" || amount(order) <= .005) continue;
      groups.set(order.customer_id, [...(groups.get(order.customer_id) ?? []), order]);
    }
    return groups;
  }, [orders]);

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
        return <article className="company-completion-card" key={`${order.operation ?? "Suplementos"}-${order.id}`}>
          <div className="company-completion-products">{(itemMedia[order.id] ?? []).slice(0, 5).map((item) => <span key={item.productId} title={`${item.name} ×${item.quantity}`}>{item.imageUrl ? <img src={item.imageUrl} alt={item.name}/> : <ImageIcon/>}{item.quantity > 1 && <b>{item.quantity}×</b>}</span>)}</div>
          <div className="company-completion-body"><div className="company-completion-flags">{receive && <span className="receive">Receber</span>}{deliver && <span className="deliver">Entregar</span>}<span>{order.operation ?? "Suplementos"}</span></div><h2>{order.customer_name}</h2><p>{order.product_summary ?? "Venda sem resumo de produtos"}</p><small>{order.location_name} · {formatDateOnly(order.business_date)}</small>{due && receive && <small>Vencimento: {formatDateOnly(due)}</small>}{order.incoming_order_id && <strong className="warning-text">Mercadoria a caminho · esta venda aguarda entrada no estoque</strong>}</div>
          <div className="company-completion-value"><span>Pendente</span><strong>{formatCurrency(amount(order))}</strong>{order.incoming_order_id && <Link className="company-completion-open" href={`/company/compras/suplementos/${order.incoming_order_id}`}>Receber mercadoria →</Link>}<button className="company-completion-open" type="button" onClick={() => setSelected(order)}>{order.incoming_order_id ? "Atualizar pagamento/entrega →" : "Concluir venda →"}</button>{order.operation !== "Fitness" && order.customer_id && (payableByCustomer.get(order.customer_id)?.length ?? 0) > 1 && <button className="company-completion-group-open" type="button" onClick={() => setGroupCustomerId(order.customer_id)}>Pagar vendas juntas</button>}</div>
        </article>;
      })}</div>
      {visible.length === 0 && <div className="company-empty-state"><PackageCheck/><strong>Nenhuma pendência aqui.</strong><span>Troque o filtro ou faça outra busca.</span></div>}
    </section>
    {selected ? <div className="company-completion-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="company-completion-dialog" role="dialog" aria-modal="true" aria-labelledby="completion-title"><header><div><small>{selected.operation ?? "Suplementos"} · Concluir venda</small><h2 id="completion-title">{selected.customer_name}</h2><p>{selected.product_summary ?? "Venda registrada"} · {formatCurrency(selected.total_amount)}</p></div><button type="button" className="icon-button" aria-label="Fechar janela" onClick={() => setSelected(null)}><X size={18}/></button></header><div className="company-completion-dialog-body">{selected.operation === "Fitness" ? <FitnessSaleActions key={selected.id} saleId={selected.id} generalStatus={selected.general_status} paymentStatus={selected.payment_status} deliveryStatus={selected.delivery_status}/> : <><h3>Recebimento</h3><SalePaymentPanel key={`payment-${selected.id}`} saleId={selected.id} totalAmount={selected.total_amount} generalStatus={selected.general_status} paymentStatus={selected.payment_status}/><h3>Entregue / Cancelamento</h3><SaleStatusActions key={`status-${selected.id}`} saleId={selected.id} generalStatus={selected.general_status} paymentStatus={selected.payment_status} deliveryStatus={selected.delivery_status} items={(itemMedia[selected.id] ?? []).map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, deliveredQuantity: item.deliveredQuantity }))}/></>}</div><footer><Link href={selected.details_href ?? `/company/concluir/${selected.id}`}>Ir para Orçamento · página completa →</Link><button type="button" className="button ghost" onClick={() => setSelected(null)}>Fechar</button></footer></section></div> : null}
    {groupCustomerId && <CompanyGroupedReceipt key={groupCustomerId} orders={payableByCustomer.get(groupCustomerId) ?? []} onClose={() => setGroupCustomerId(null)}/>}
  </div>;
}
