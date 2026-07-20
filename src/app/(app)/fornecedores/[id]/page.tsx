import Link from "next/link";
import { ArrowLeft, Boxes, CalendarClock, CircleDollarSign, PackageCheck, Plus, Scale, ShieldCheck, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getSupplierManagementDetails } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

function formatPercent(value: number | null) {
  return value === null ? "Sem amostra" : `${value.toLocaleString("pt-BR")}%`;
}

function orderStatus(status: string) {
  if (status === "received") return "Recebido";
  if (status === "partial") return "Parcial";
  if (status === "cancelled") return "Cancelado";
  return "A caminho";
}

export default async function SupplierManagementDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const details = await getSupplierManagementDetails(id);
  if (!details) notFound();
  const { supplier, prices, history, orders } = details;

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Fornecedor · Gestão"
        title={supplier.name}
        description={`${supplier.order_count} pedido(s) · ${supplier.default_product_count} produto(s) com este fornecedor como padrão`}
        action={<div className="page-header-actions"><Link className="button ghost" href="/fornecedores"><ArrowLeft size={16} />Fornecedores</Link><Link className="button gold" href="/pedidos-fornecedor/novo"><Plus size={16} />Novo pedido</Link></div>}
      />

      <section className="supplier-detail-kpis">
        <article><CircleDollarSign size={19} /><span>Comprado · 12 meses</span><strong>{formatCurrency(supplier.purchase_value_365d)}</strong><small>{supplier.purchase_concentration_pct.toLocaleString("pt-BR")}% de concentração</small></article>
        <article><Boxes size={19} /><span>Produtos com preço</span><strong>{supplier.priced_product_count}</strong><small>{supplier.products_at_best_recent_price} no melhor preço recente</small></article>
        <article><Truck size={19} /><span>Prazo real médio</span><strong>{supplier.average_actual_lead_days === null ? "Sem amostra" : `${supplier.average_actual_lead_days.toLocaleString("pt-BR")} dias`}</strong><small>{supplier.promised_delivery_sample} entrega(s) comparável(is)</small></article>
        <article><ShieldCheck size={19} /><span>Score operacional</span><strong>{supplier.operational_score === null ? "Em formação" : `${supplier.operational_score}/100`}</strong><small>Atraso e divergência reais</small></article>
      </section>

      <section className="supplier-detail-grid">
        <article className="panel">
          <div className="panel-head"><div><h2>Condições e próxima compra</h2><p>Parâmetros usados pelo planejamento de reposição.</p></div><CalendarClock size={19} /></div>
          <div className="panel-body sale-detail-list">
            <div className="sale-detail-line"><span>Prazo cadastrado</span><strong>{supplier.lead_time_days} dias</strong></div>
            <div className="sale-detail-line"><span>Cobertura alvo</span><strong>{supplier.target_cover_days} dias</strong></div>
            <div className="sale-detail-line"><span>Pedido mínimo</span><strong>{formatCurrency(supplier.minimum_order_amount)}</strong></div>
            <div className="sale-detail-line"><span>Frete grátis</span><strong>{formatCurrency(supplier.free_shipping_threshold)}</strong></div>
            <div className="sale-detail-line"><span>Compra sugerida</span><strong>{formatCurrency(supplier.suggested_order_cost)} · {supplier.suggested_units} un.</strong></div>
            <div className="sale-detail-line"><span>Falta para pedido mínimo</span><strong>{formatCurrency(supplier.gap_to_minimum_order)}</strong></div>
            <div className="sale-detail-line"><span>Falta para frete grátis</span><strong>{formatCurrency(supplier.gap_to_free_shipping)}</strong></div>
            <div className="sale-detail-line"><span>Pagamento</span><strong>{supplier.payment_terms ?? "Não informado"}</strong></div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Qualidade operacional</h2><p>Indicadores calculados apenas quando existe evidência no recebimento.</p></div><PackageCheck size={19} /></div>
          <div className="panel-body sale-detail-list">
            <div className="sale-detail-line"><span>Atraso</span><strong>{formatPercent(supplier.late_rate_pct)}</strong></div>
            <div className="sale-detail-line"><span>Pedidos atrasados</span><strong>{supplier.late_order_count} de {supplier.promised_delivery_sample}</strong></div>
            <div className="sale-detail-line"><span>Recebimentos registrados</span><strong>{supplier.receipt_count}</strong></div>
            <div className="sale-detail-line"><span>Pedidos com divergência</span><strong>{supplier.divergent_receipt_order_count}</strong></div>
            <div className="sale-detail-line"><span>Divergência de custo</span><strong>{supplier.cost_divergent_receipt_count} recebimento(s)</strong></div>
            <div className="sale-detail-line"><span>Divergência de quantidade encerrada</span><strong>{supplier.closed_quantity_divergence_units} un.</strong></div>
          </div>
        </article>
      </section>

      <article className="panel">
        <div className="panel-head"><div><h2>Preços por produto</h2><p>Último preço pago, evolução e comparação com outras fontes nos últimos 180 dias.</p></div><Scale size={20} /></div>
        {prices.length === 0 ? <div className="empty"><strong>Sem preços recebidos</strong>O histórico surgirá após o primeiro recebimento.</div> : <div className="table-wrap"><table className="table"><thead><tr><th>Produto</th><th>Último preço</th><th>Preço anterior</th><th>Variação</th><th>Melhor recente</th><th>Comparação</th></tr></thead><tbody>{prices.map((row) => <tr key={row.product_id}><td><Link className="table-link" href={`/produtos/${row.product_id}`}>{row.product_name}</Link><small>{row.purchase_count} compra(s) · {row.purchased_units} un.</small></td><td><strong>{formatCurrency(row.last_price_paid)}</strong><small>{formatDateOnly(row.last_purchase_on)}</small></td><td>{row.previous_price_paid === null ? "—" : formatCurrency(row.previous_price_paid)}</td><td><span className={`price-trend ${row.last_price_change_pct === null ? "neutral" : row.last_price_change_pct > 0 ? "up" : row.last_price_change_pct < 0 ? "down" : "neutral"}`}>{row.last_price_change_pct === null ? "Sem anterior" : `${row.last_price_change_pct > 0 ? "+" : ""}${row.last_price_change_pct.toLocaleString("pt-BR")}%`}</span></td><td>{row.best_recent_price === null ? "—" : formatCurrency(row.best_recent_price)}</td><td>{row.compared_supplier_count > 1 ? `${row.recent_price_rank}º de ${row.compared_supplier_count}` : "Fonte única"}</td></tr>)}</tbody></table></div>}
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>Evolução de custos</h2><p>Linha a linha dos preços registrados nos pedidos não cancelados.</p></div><CircleDollarSign size={20} /></div>
        {history.length === 0 ? <div className="empty"><strong>Sem histórico</strong>Nenhuma compra registrada.</div> : <div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Produto</th><th>Quantidade</th><th>Custo unitário</th><th>Total</th><th>Recebimento</th></tr></thead><tbody>{history.map((row) => <tr key={row.purchase_order_item_id}><td><Link className="table-link" href={`/pedidos-fornecedor/${row.purchase_order_id}`}>{formatDateOnly(row.ordered_on)}</Link></td><td>{row.product_name}<small>{row.brand ?? row.category}</small></td><td>{row.quantity_received}/{row.quantity_ordered} un.</td><td><strong>{formatCurrency(row.unit_cost)}</strong></td><td>{formatCurrency(row.line_total)}</td><td>{row.last_received_on ? formatDateOnly(row.last_received_on) : row.status === "received" ? "Legado · sem data" : orderStatus(row.status)}</td></tr>)}</tbody></table></div>}
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>Histórico de pedidos</h2><p>Todos os pedidos vinculados a este fornecedor.</p></div><Truck size={20} /></div>
        {orders.length === 0 ? <div className="empty"><strong>Sem pedidos</strong>Nenhum pedido registrado.</div> : <div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Produtos</th><th>Recebimento</th><th>Status</th><th>Total</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><Link className="table-link" href={`/pedidos-fornecedor/${order.id}`}>{formatDateOnly(order.ordered_on)}</Link></td><td>{order.product_summary ?? "—"}</td><td>{order.received_units}/{order.ordered_units} un.</td><td>{orderStatus(order.status)}</td><td><strong>{formatCurrency(order.order_total)}</strong></td></tr>)}</tbody></table></div>}
      </article>
    </>
  );
}
