import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Boxes,
  CircleDollarSign,
  ClipboardClock,
  HandCoins,
  ImageIcon,
  PackageCheck,
  PackageOpen,
  ShoppingBag,
  UserRoundSearch,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getDashboard } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { DashboardPriorityItem } from "@/lib/types";
import { ignoreDashboardPriority, removeDashboardPriority } from "../actions";

function changeText(value: number | null) {
  if (value == null) return "Sem base no mês anterior";
  if (Math.abs(value) < 0.05) return "Mesmo resultado do mês anterior";
  return `${value > 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")}% vs. mês anterior`;
}

function changeClass(value: number | null) {
  if (value == null || Math.abs(value) < 0.05) return "neutral";
  return value > 0 ? "positive" : "negative";
}

const priorityGroups: Array<{
  type: DashboardPriorityItem["item_type"];
  label: string;
  description: string;
  icon: typeof HandCoins;
  tone: string;
}> = [
  { type: "payment", label: "Cobrança", description: "Pagamentos que precisam de acompanhamento.", icon: HandCoins, tone: "gold" },
  { type: "stock", label: "Estoque", description: "Produtos zerados ou abaixo do nível mínimo.", icon: AlertTriangle, tone: "red" },
  { type: "lead", label: "Lead", description: "Contatos comerciais que precisam ser retomados.", icon: UserRoundSearch, tone: "blue" },
];

export default async function SupplementsDashboardPage() {
  const data = await getDashboard();
  const profitPotential = data.stockSaleValue - data.stockCostValue;

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Candinho Suplementos"
        title="Visão geral"
        description="Uma central diária para vender, cobrar, entregar e repor sem precisar abrir várias telas."
      />

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

      <section className="dashboard-action-grid dashboard-action-grid-five">
        <Link className="dashboard-action-card" href="/pedidos-pendentes">
          <span className="dashboard-action-icon orange"><ClipboardClock size={20} /></span>
          <div><span>Pedidos pendentes</span><strong>{data.pendingOrdersCount}</strong><small>{data.pendingDeliveryCount} entregar · {data.pendingPaymentCount} receber</small></div>
          <ArrowRight size={17} />
        </Link>
        <Link className="dashboard-action-card dashboard-panel-cs-card" href="/painel-cs">
          <span className="dashboard-action-icon gold"><BarChart3 size={20} /></span>
          <div><span>Painel CS · total bruto</span><strong>{formatCurrency(data.totalRevenue)}</strong><small>Abrir análise comercial completa</small></div>
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
            <div><h2>Exceções de gestão</h2><p>Riscos e pendências para supervisão. Para executar o dia, use Hoje; para a fila completa, use Fila Única.</p></div>
            <span className="dashboard-priority-count">{data.priorities.length}</span>
          </div>
          {data.priorities.length === 0 ? (
            <div className="empty compact"><PackageCheck size={25} /><strong>Nenhuma prioridade crítica</strong>As principais pendências operacionais estão em dia.</div>
          ) : (
            <div className="dashboard-priority-groups">
              {priorityGroups.map((group) => {
                const items = data.priorities.filter((item) => item.item_type === group.type);
                if (items.length === 0) return null;
                const Icon = group.icon;
                return (
                  <section className="dashboard-priority-group" key={group.type}>
                    <div className="dashboard-priority-group-head">
                      <span className={`dashboard-priority-icon ${group.tone}`}><Icon size={16} /></span>
                      <div><strong>{group.label}</strong><small>{group.description}</small></div>
                      <b>{items.length}</b>
                    </div>
                    <div className="dashboard-priority-list">
                      {items.map((item) => (
                        <div className="dashboard-priority-row" key={`${item.item_type}-${item.entity_id}`}>
                          <Link className="dashboard-priority-main" href={item.href}>
                            <div className="dashboard-priority-copy">
                              <div><time>{formatDateOnly(item.reference_date)}</time></div>
                              <strong>{item.title}</strong>
                              <small>{item.subtitle}</small>
                            </div>
                            <div className="dashboard-priority-side">
                              {item.amount != null && item.amount > 0 ? <strong>{formatCurrency(item.amount)}</strong> : null}
                              {item.quantity > 0 ? <small>{item.quantity} un.</small> : null}
                              <ArrowRight size={15} />
                            </div>
                          </Link>
                          <div className="dashboard-priority-actions">
                            <form action={ignoreDashboardPriority}>
                              <input type="hidden" name="itemType" value={item.item_type} />
                              <input type="hidden" name="entityId" value={item.entity_id} />
                              <button className="priority-action-button ignore" type="submit" title="Ocultar por 5 dias">Ignorar</button>
                            </form>
                            <form action={removeDashboardPriority}>
                              <input type="hidden" name="itemType" value={item.item_type} />
                              <input type="hidden" name="entityId" value={item.entity_id} />
                              <button className="priority-action-button remove" type="submit" title="Remover definitivamente das prioridades">Remover</button>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </article>

        <div className="dashboard-side-stack">
          <article className="panel dashboard-agenda-card">
            <div className="panel-head"><div><h2>Agenda de hoje</h2><p>Atrasados e compromissos do dia.</p></div><CalendarDays size={19} /></div>
            <div className="dashboard-agenda-summary">
              <div><span>Hoje</span><strong>{data.agendaSummary.today_count}</strong></div>
              <div className={data.agendaSummary.overdue_count > 0 ? "danger" : ""}><span>Atrasados</span><strong>{data.agendaSummary.overdue_count}</strong></div>
              <div><span>Próximos 7 dias</span><strong>{data.agendaSummary.next_seven_days_count}</strong></div>
            </div>
            {data.agendaToday.length === 0 ? (
              <div className="empty compact"><CalendarDays size={22} /><strong>Agenda em dia</strong>Nenhum compromisso atrasado ou para hoje.</div>
            ) : (
              <div className="dashboard-agenda-list">
                {data.agendaToday.slice(0, 4).map((event) => (
                  <Link href="/agenda" key={event.event_key}>
                    <div><strong>{event.title}</strong><span>{event.subtitle}</span></div>
                    <time>{formatDateOnly(event.due_date)}</time>
                  </Link>
                ))}
              </div>
            )}
            <Link className="button ghost dashboard-full-button" href="/agenda">Abrir agenda <ArrowRight size={15} /></Link>
          </article>

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
          <div className="dashboard-recent-sales-list">
            {data.recentSales.map((sale) => (
              <article className="dashboard-sale-row" key={sale.id}>
                <div className="dashboard-sale-product-image">
                  {sale.primary_image_url ? <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sale.primary_image_url} alt={sale.product_summary ?? "Produto"} />
                  </> : <ImageIcon size={19} />}
                </div>
                <div className="dashboard-sale-customer">
                  {sale.customer_id ? (
                    <Link className="cell-main dashboard-inline-link" href={`/clientes/${sale.customer_id}`}>
                      {sale.customer_name}{sale.general_status === "finalized" ? <span className="sale-finalized-check" title="Venda finalizada">✔️</span> : null}
                    </Link>
                  ) : (
                    <div className="cell-main">{sale.customer_name}{sale.general_status === "finalized" ? <span className="sale-finalized-check" title="Venda finalizada">✔️</span> : null}</div>
                  )}
                  <small>{formatDateOnly(sale.quoted_at)}</small>
                </div>
                <div className="dashboard-sale-product"><strong>{sale.product_summary ?? "Produto não informado"}</strong><small>{sale.total_items} item(ns)</small></div>
                <div className="dashboard-sale-status"><span>Pagamento</span>{sale.paid_at ? <span className="date-status green">{formatDateOnly(sale.paid_at)}</span> : <Badge value={sale.payment_status} />}</div>
                <div className="dashboard-sale-status"><span>Entrega</span>{sale.delivered_at ? <span className="date-status green">{formatDateOnly(sale.delivered_at)}</span> : <Badge value={sale.delivery_status} />}</div>
                <Link className="dashboard-sale-total" href={`/vendas/${sale.id}`}>{formatCurrency(sale.total_amount)}<ArrowRight size={15} /></Link>
              </article>
            ))}
          </div>
        )}
      </article>
    </>
  );
}
