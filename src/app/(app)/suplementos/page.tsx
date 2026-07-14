import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarClock,
  CircleDollarSign,
  ClipboardClock,
  HandCoins,
  PackageCheck,
  PackageOpen,
  ShoppingBag,
  Truck,
  UserRoundSearch,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getDashboard } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { DashboardPriorityItem } from "@/lib/types";

function changeText(value: number | null) {
  if (value == null) return "Sem base no mês anterior";
  if (Math.abs(value) < 0.05) return "Mesmo resultado do mês anterior";
  return `${value > 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")}% vs. mês anterior`;
}

function changeClass(value: number | null) {
  if (value == null || Math.abs(value) < 0.05) return "neutral";
  return value > 0 ? "positive" : "negative";
}

function priorityMeta(type: DashboardPriorityItem["item_type"]) {
  if (type === "delivery") return { label: "Entrega", icon: Truck, tone: "orange" };
  if (type === "payment") return { label: "Cobrança", icon: HandCoins, tone: "gold" };
  if (type === "lead") return { label: "Lead", icon: UserRoundSearch, tone: "blue" };
  if (type === "supplier") return { label: "Fornecedor", icon: PackageOpen, tone: "blue" };
  return { label: "Estoque", icon: AlertTriangle, tone: "red" };
}

export default async function SupplementsDashboardPage() {
  const data = await getDashboard();
  const profitPotential = data.stockSaleValue - data.stockCostValue;
  const todayLabel = formatDateOnly(data.operational.today);

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Candinho Suplementos"
        title="Visão geral"
        description="Uma central diária para vender, cobrar, entregar e repor sem precisar abrir várias telas."
      />

      <section className="dashboard-today-strip">
        <div>
          <CalendarClock size={18} />
          <span>Resumo operacional de hoje</span>
          <strong>{todayLabel}</strong>
        </div>
        <Link href="/painel-cs">Abrir análise comercial <ArrowRight size={15} /></Link>
      </section>

      <section className="dashboard-month-grid">
        <article className="dashboard-metric-card">
          <div className="dashboard-metric-head"><span>Faturamento do mês</span><CircleDollarSign size={18} /></div>
          <strong>{formatCurrency(data.currentMonthRevenue)}</strong>
          <small className={changeClass(data.revenueChange)}>{changeText(data.revenueChange)}</small>
        </article>
        <article className="dashboard-metric-card">
          <div className="dashboard-metric-head"><span>Lucro do mês</span><BarChart3 size={18} /></div>
          <strong>{formatCurrency(data.currentMonthProfit)}</strong>
          <small className={changeClass(data.profitChange)}>{changeText(data.profitChange)}</small>
        </article>
        <article className="dashboard-metric-card">
          <div className="dashboard-metric-head"><span>Vendas do mês</span><ShoppingBag size={18} /></div>
          <strong>{data.currentMonthSalesCount}</strong>
          <small className={changeClass(data.salesChange)}>{changeText(data.salesChange)}</small>
        </article>
        <article className="dashboard-metric-card">
          <div className="dashboard-metric-head"><span>Valor a receber</span><WalletCards size={18} /></div>
          <strong>{formatCurrency(data.receivable)}</strong>
          <small className={data.operational.overdue_payment_count > 0 ? "negative" : "neutral"}>
            {data.operational.overdue_payment_count > 0
              ? `${data.operational.overdue_payment_count} pagamento(s) vencido(s)`
              : `${data.pendingPaymentCount} pagamento(s) em aberto`}
          </small>
        </article>
      </section>

      <section className="dashboard-action-grid">
        <Link className="dashboard-action-card" href="/pedidos-pendentes">
          <span className="dashboard-action-icon orange"><ClipboardClock size={20} /></span>
          <div><span>Pedidos pendentes</span><strong>{data.pendingOrdersCount}</strong><small>{data.pendingDeliveryCount} entregar · {data.pendingPaymentCount} receber</small></div>
          <ArrowRight size={17} />
        </Link>
        <Link className="dashboard-action-card" href="/leads">
          <span className="dashboard-action-icon blue"><UserRoundSearch size={20} /></span>
          <div><span>Leads para retomar</span><strong>{data.operational.stale_leads_count}</strong><small>{data.operational.open_leads_count} leads abertos no total</small></div>
          <ArrowRight size={17} />
        </Link>
        <Link className="dashboard-action-card" href="/pedidos-fornecedor">
          <span className="dashboard-action-icon blue"><PackageOpen size={20} /></span>
          <div><span>Pedidos a caminho</span><strong>{data.operational.supplier_orders_open_count}</strong><small>{data.operational.incoming_units} unidades aguardadas</small></div>
          <ArrowRight size={17} />
        </Link>
        <Link className="dashboard-action-card" href="/estoque">
          <span className="dashboard-action-icon red"><AlertTriangle size={20} /></span>
          <div><span>Estoque em atenção</span><strong>{data.operational.stock_attention_products}</strong><small>{data.operational.out_of_stock_products} produtos zerados</small></div>
          <ArrowRight size={17} />
        </Link>
      </section>

      <section className="dashboard-operational-grid">
        <article className="panel dashboard-priorities-panel">
          <div className="panel-head">
            <div><h2>Prioridades</h2><p>Itens mais urgentes organizados automaticamente.</p></div>
            <span className="dashboard-priority-count">{data.priorities.length}</span>
          </div>
          {data.priorities.length === 0 ? (
            <div className="empty compact"><PackageCheck size={25} /><strong>Nenhuma prioridade crítica</strong>As principais pendências operacionais estão em dia.</div>
          ) : (
            <div className="dashboard-priority-list">
              {data.priorities.map((item) => {
                const meta = priorityMeta(item.item_type);
                const Icon = meta.icon;
                return (
                  <Link className="dashboard-priority-row" href={item.href} key={`${item.item_type}-${item.entity_id}`}>
                    <span className={`dashboard-priority-icon ${meta.tone}`}><Icon size={17} /></span>
                    <div className="dashboard-priority-copy">
                      <div><span>{meta.label}</span><time>{formatDateOnly(item.reference_date)}</time></div>
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </div>
                    <div className="dashboard-priority-side">
                      {item.amount != null && item.amount > 0 ? <strong>{formatCurrency(item.amount)}</strong> : null}
                      {item.quantity > 0 ? <small>{item.quantity} un.</small> : null}
                      <ArrowRight size={15} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </article>

        <div className="dashboard-side-stack">
          <article className="panel dashboard-stock-card">
            <div className="panel-head"><div><h2>Estoque operacional</h2><p>Saldo realmente livre para novas vendas.</p></div><Boxes size={19} /></div>
            <div className="dashboard-stock-numbers">
              <div><span>Físico</span><strong>{data.operational.physical_units}</strong></div>
              <div><span>Reservado</span><strong>{data.operational.reserved_units}</strong></div>
              <div><span>Disponível</span><strong>{data.operational.available_units}</strong></div>
              <div><span>A caminho</span><strong>{data.operational.incoming_units}</strong></div>
            </div>
            <div className="dashboard-stock-values">
              <div><span>Custo atual</span><strong>{formatCurrency(data.stockCostValue)}</strong></div>
              <div><span>Potencial de venda</span><strong>{formatCurrency(data.stockSaleValue)}</strong></div>
              <div><span>Lucro potencial</span><strong>{formatCurrency(profitPotential)}</strong></div>
            </div>
            <Link className="button ghost dashboard-full-button" href="/estoque">Gerenciar estoque <ArrowRight size={15} /></Link>
          </article>

          <article className="panel dashboard-replenishment-card">
            <div className="panel-head"><div><h2>Reposição imediata</h2><p>Produtos com menor saldo disponível.</p></div><PackageCheck size={19} /></div>
            {data.lowStock.length === 0 ? (
              <div className="empty compact"><strong>Estoque dentro do mínimo</strong>Nenhum produto precisa de reposição agora.</div>
            ) : (
              <div className="dashboard-replenishment-list">
                {data.lowStock.slice(0, 5).map((row) => (
                  <Link href={`/estoque/${row.product_id}`} key={row.product_id}>
                    <div><strong>{row.product_name}</strong><span>Mínimo {row.min_stock} · pedir {row.suggested_order_quantity}</span></div>
                    <span className={`badge ${row.company_quantity === 0 ? "red" : "orange"}`}><span className="dot" />{row.company_quantity} un.</span>
                  </Link>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>

      <article className="panel dashboard-recent-sales">
        <div className="panel-head">
          <div><h2>Vendas recentes</h2><p>Últimas vendas comerciais registradas.</p></div>
          <Link className="button ghost" href="/vendas">Ver todas</Link>
        </div>
        {data.recentSales.length === 0 ? (
          <div className="empty"><strong>Nenhuma venda registrada</strong>As vendas aparecerão aqui em ordem cronológica.</div>
        ) : (
          <div className="table-wrap">
            <table className="dashboard-sales-table">
              <thead><tr><th>Cliente</th><th>Produto</th><th>Data do orçamento</th><th>Pagamento</th><th>Entrega</th><th>Total</th></tr></thead>
              <tbody>
                {data.recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      {sale.customer_id ? <Link className="cell-main dashboard-inline-link" href={`/clientes/${sale.customer_id}`}>{sale.customer_name}</Link> : <div className="cell-main">{sale.customer_name}</div>}
                    </td>
                    <td>{sale.product_summary ?? "—"}</td>
                    <td>{formatDateOnly(sale.quoted_at)}</td>
                    <td>{sale.paid_at ? <span className="date-status green">{formatDateOnly(sale.paid_at)}</span> : <Badge value={sale.payment_status} />}</td>
                    <td>{sale.delivered_at ? <span className="date-status green">{formatDateOnly(sale.delivered_at)}</span> : <Badge value={sale.delivery_status} />}</td>
                    <td className="amount"><Link className="dashboard-inline-link" href={`/vendas/${sale.id}`}>{formatCurrency(sale.total_amount)}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </>
  );
}
