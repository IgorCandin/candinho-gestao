import Link from "next/link";
import {
  ArrowLeft,
  BadgeInfo,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Edit3,
  PackageCheck,
  PackagePlus,
  ShoppingBag,
  Tags,
  Truck,
  UserRound,
  Warehouse,
} from "lucide-react";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { EntitySwipeNavigator } from "@/components/entity-swipe-navigator";
import { PageHeader } from "@/components/page-header";
import { ProductImageUploader } from "@/components/product-image-uploader";
import { ProductInternalCostPanelV4521 } from "@/components/product-internal-cost-panel-v45-21";
import {
  getEntitySwipeNavigation,
  getProductDetails,
} from "@/lib/data";
import {
  getActivePromotionRows,
  getSupplementPromotion,
} from "@/lib/active-promotion-data";
import {
  formatCurrency,
  formatDateOnly,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div className="product-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CopyItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;

  return (
    <div>
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function stockState(status: string) {
  if (status === "healthy") return { label: "Disponível", tone: "green" };
  if (status === "incoming" || status === "incoming_only") {
    return { label: "A caminho", tone: "blue" };
  }
  if (status === "below_minimum" || status === "fully_reserved") {
    return {
      label: status === "fully_reserved" ? "Todo reservado" : "Estoque baixo",
      tone: "orange",
    };
  }
  if (status === "inactive") return { label: "Inativo", tone: "gray" };
  return { label: "Sem estoque", tone: "red" };
}

function saleStatus(payment: unknown, delivery: unknown) {
  const paid = String(payment ?? "") === "received";
  const delivered = String(delivery ?? "") === "delivered";

  if (paid && delivered) return { label: "Finalizada", tone: "green" };
  if (!paid && !delivered) {
    return { label: "Pagamento e entrega pendentes", tone: "orange" };
  }
  if (!paid) return { label: "Pagamento pendente", tone: "orange" };
  return { label: "Entrega pendente", tone: "blue" };
}

function leadTone(status: unknown) {
  const normalized = String(status ?? "").toLocaleLowerCase("pt-BR");
  if (normalized.includes("convert")) return "green";
  if (normalized.includes("quase") || normalized.includes("decid")) return "orange";
  return "blue";
}

function supplierStatus(status: unknown, pending: unknown) {
  const value = String(status ?? "").toLocaleLowerCase("pt-BR");
  if (value === "received" || Number(pending ?? 0) <= 0) {
    return { label: "Recebido", tone: "green" };
  }
  if (value === "cancelled") return { label: "Cancelado", tone: "red" };
  return { label: "A caminho", tone: "orange" };
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    product,
    swipe,
    flavorSummaryResult,
    flavorInventoryResult,
    pendingResult,
    promotionRows,
    leadsResult,
    supplierOrdersResult,
    recentSalesResult,
  ] = await Promise.all([
    getProductDetails(id),
    getEntitySwipeNavigation("product", id),
    supabase
      .from("product_flavor_summary")
      .select("*")
      .eq("product_id", id)
      .maybeSingle(),
    supabase
      .from("product_flavor_inventory_overview")
      .select(
        "flavor_id,flavor_name,active,display_order,physical_quantity,reserved_quantity,available_quantity,incoming_quantity",
      )
      .eq("product_id", id)
      .eq("active", true)
      .order("display_order")
      .order("flavor_name"),
    supabase
      .from("product_flavor_history_pending")
      .select("sale_item_id", { count: "exact", head: true })
      .eq("product_id", id),
    getActivePromotionRows(),
    supabase
      .from("product_lead_history_overview")
      .select("*")
      .eq("product_id", id)
      .order("lead_at", { ascending: false })
      .limit(12),
    supabase
      .from("product_supplier_order_history_overview")
      .select("*")
      .eq("product_id", id)
      .order("ordered_on", { ascending: false })
      .limit(12),
    supabase
      .from("product_recent_sales_overview")
      .select("*")
      .eq("product_id", id)
      .order("sold_at", { ascending: false })
      .limit(12),
  ]);

  if (!product) notFound();
  for (const result of [
    flavorSummaryResult,
    flavorInventoryResult,
    pendingResult,
    leadsResult,
    supplierOrdersResult,
    recentSalesResult,
  ]) {
    if (result.error) throw result.error;
  }

  const state = stockState(product.stock_status);
  const activePromotion = getSupplementPromotion(id, promotionRows);
  const flavorEnabled = Boolean(
    flavorSummaryResult.data?.flavor_tracking_enabled,
  );

  const flavorMap = new Map<
    string,
    {
      id: string;
      name: string;
      physical: number;
      reserved: number;
      available: number;
      incoming: number;
      order: number;
    }
  >();

  for (const row of flavorInventoryResult.data ?? []) {
    const flavorId = String(row.flavor_id);
    const current = flavorMap.get(flavorId) ?? {
      id: flavorId,
      name: String(row.flavor_name ?? "Sabor"),
      physical: 0,
      reserved: 0,
      available: 0,
      incoming: 0,
      order: Number(row.display_order ?? 0),
    };

    current.physical += Number(row.physical_quantity ?? 0);
    current.reserved += Number(row.reserved_quantity ?? 0);
    current.available += Number(row.available_quantity ?? 0);
    current.incoming += Number(row.incoming_quantity ?? 0);
    flavorMap.set(flavorId, current);
  }

  const flavorRows = [...flavorMap.values()].sort(
    (a, b) =>
      a.order - b.order || a.name.localeCompare(b.name, "pt-BR"),
  );
  const historyPending = pendingResult.count ?? 0;
  const leads = leadsResult.data ?? [];
  const supplierOrders = supplierOrdersResult.data ?? [];
  const recentSales = recentSalesResult.data ?? [];

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Catálogo"
        title={product.name}
        description="Informações comerciais, estoque, promoções, leads, compras e histórico do produto."
        action={
          <div className="page-header-action-group">
            <Link className="button gold" href={`/produtos/${product.id}/editar`}>
              <Edit3 size={16} />
              Editar produto
            </Link>
            <Link className="button ghost" href={`/estoque/${product.id}`}>
              <Warehouse size={16} />
              Ver estoque
            </Link>
            <Link className="button ghost" href="/produtos">
              <ArrowLeft size={16} />
              Voltar
            </Link>
          </div>
        }
      />

      <EntitySwipeNavigator previous={swipe.previous} next={swipe.next} />
      <section className="product-detail-stack-v45221">
        <article className="panel product-photo-top-v45221">
          <div className="panel-head">
            <div>
              <h2>Foto do produto</h2>
              <p>
                Imagem principal em destaque. As informações seguem abaixo
                em blocos de largura total.
              </p>
            </div>
          </div>

          <div className="panel-body product-photo-body-v45221">
            <ProductImageUploader
              productId={product.id}
              initialImageUrl={product.image_url}
              initialThumbnailUrl={product.thumbnail_url}
              secondaryImageUrl={product.secondary_image_url}
            />
          </div>
        </article>

        <article className="panel product-summary-full-v45221">
          <div className="panel-head">
            <div>
              <h2>Resumo comercial</h2>
              <p>Informações rápidas para consulta durante o atendimento.</p>
            </div>
            <span className={`badge ${product.active ? "green" : "gray"}`}>
              <span className="dot" />
              {product.active ? "Ativo" : "Inativo"}
            </span>
          </div>

          <div className="panel-body">
            <div className="product-price-grid">
              <div className="product-price-card">
                <CircleDollarSign size={18} />
                <span>
                  {activePromotion ? "Preço promocional" : "Preço à vista"}
                </span>
                <strong>
                  {formatCurrency(
                    activePromotion?.effective_promotional_price ??
                      product.sale_price,
                  )}
                </strong>
                {activePromotion && (
                  <small>De {formatCurrency(product.sale_price)}</small>
                )}
              </div>

              <div className="product-price-card">
                <CalendarDays size={18} />
                <span>Preço a prazo</span>
                <strong>{formatCurrency(product.installment_price)}</strong>
              </div>
            </div>

            <div className="product-detail-grid">
              <DetailItem label="Categoria" value={product.category} />
              <DetailItem label="Marca" value={product.brand} />
              <DetailItem label="Nível" value={product.level} />
              <DetailItem
                label="Categoria de vendas"
                value={product.sales_category}
              />
              <DetailItem
                label="Duração"
                value={
                  product.duration_days
                    ? `${product.duration_days} dias/doses`
                    : null
                }
              />
              {flavorEnabled && (
                <DetailItem
                  label="Sabores ativos"
                  value={flavorRows.length}
                />
              )}
            </div>
          </div>
        </article>

        {(product.description ||
          product.objective ||
          product.ideal_profile ||
          product.information ||
          product.quick_message) && (
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Características</h2>
                <p>Argumentos e orientações para apresentar o produto.</p>
              </div>
              <BadgeInfo size={19} />
            </div>

            <div className="panel-body product-copy-list">
              <CopyItem label="Descrição" value={product.description} />
              <CopyItem label="Objetivo" value={product.objective} />
              <CopyItem label="Perfil ideal" value={product.ideal_profile} />
              <CopyItem label="Informativo" value={product.information} />
              <CopyItem
                label="Mensagem rápida"
                value={product.quick_message}
              />
            </div>
          </article>
        )}

        {product.keywords && (
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Palavras-chave</h2>
                <p>Facilitam a consulta e o atendimento.</p>
              </div>
              <Tags size={19} />
            </div>

            <div className="panel-body">
              <div className="keyword-list">
                {product.keywords.split(",").map((keyword) => (
                  <span key={keyword.trim()}>
                    <CheckCircle2 size={14} />
                    {keyword.trim()}
                  </span>
                ))}
              </div>
            </div>
          </article>
        )}
      </section>

      <section className="product-stock-summary">
        <article>
          <PackageCheck size={18} />
          <div><span>Físico</span><strong>{product.physical_quantity}</strong></div>
        </article>
        <article>
          <Warehouse size={18} />
          <div><span>Reservado</span><strong>{product.reserved_quantity}</strong></div>
        </article>
        <article>
          <CheckCircle2 size={18} />
          <div><span>Disponível</span><strong>{product.available_quantity}</strong></div>
        </article>
        <article>
          <PackagePlus size={18} />
          <div><span>A caminho</span><strong>{product.incoming_quantity}</strong></div>
        </article>
        <article>
          <CalendarDays size={18} />
          <div><span>Vendas aguardando</span><strong>{product.awaiting_sales_quantity}</strong></div>
        </article>
        <article>
          <span className={`badge ${state.tone}`}>
            <span className="dot" />
            {state.label}
          </span>
        </article>
      </section>

      <ProductInternalCostPanelV4521
        productId={product.id}
        salePrice={product.sale_price}
      />
      {activePromotion && (
        <article className="panel product-active-promotion-panel">
          <div>
            <span className="badge green">Promoção ativa</span>
            <strong>{activePromotion.promotion_name}</strong>
            <small>
              Enquanto durar o estoque
              {activePromotion.ends_on
                ? ` · até ${formatDateOnly(activePromotion.ends_on)}`
                : ""}
            </small>
          </div>
          <div>
            <s>{formatCurrency(product.sale_price)}</s>
            <strong>{formatCurrency(activePromotion.effective_promotional_price)}</strong>
          </div>
        </article>
      )}

      {flavorEnabled && (
        <article className="panel" style={{ marginTop: 18 }}>
          <div className="panel-head">
            <div>
              <h2>Composição por sabor</h2>
              <p>O estoque total continua sendo o saldo oficial do produto.</p>
            </div>
            {historyPending > 0 && (
              <Link
                className="button ghost compact-button"
                href={`/produtos/sabores/historico?produto=${product.id}`}
              >
                Histórico sem sabor · {historyPending}
              </Link>
            )}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sabor</th><th>Físico</th><th>Reservado</th><th>Disponível</th><th>A caminho</th>
                </tr>
              </thead>
              <tbody>
                {flavorRows.map((flavor) => (
                  <tr key={flavor.id}>
                    <td><strong>{flavor.name}</strong></td>
                    <td>{flavor.physical}</td>
                    <td>{flavor.reserved}</td>
                    <td className="positive">{flavor.available}</td>
                    <td className="blue-text">{flavor.incoming}</td>
                  </tr>
                ))}
                {flavorRows.length === 0 && (
                  <tr><td colSpan={5}>Nenhum sabor ativo encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      )}

      <article className="panel product-history-panel">
        <div className="panel-head">
          <div>
            <h2>Leads deste produto</h2>
            <p>Pessoas que demonstraram interesse, mesmo sem compra confirmada.</p>
          </div>
          <span className="bank-module-badge">
            <ClipboardList size={15} />
            {leads.length}
          </span>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          {leads.length === 0 ? (
            <div className="bank-empty-state">Nenhum lead registrado para este produto.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Data</th><th>Cliente</th><th>Qtd.</th><th>Sabor</th><th>Etapa</th><th>Observação</th><th /></tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={String(lead.sale_item_id)}>
                      <td>{formatDateOnly(String(lead.lead_at ?? ""))}</td>
                      <td>
                        {lead.customer_id ? (
                          <Link href={`/clientes/${String(lead.customer_id)}`}>
                            <strong>{String(lead.customer_name)}</strong><br />
                            <small>{[lead.customer_reference, lead.customer_city].filter(Boolean).join(" · ")}</small>
                          </Link>
                        ) : String(lead.customer_name)}
                      </td>
                      <td>{Number(lead.quantity ?? 0)}</td>
                      <td>{String(lead.flavor_name ?? "—")}</td>
                      <td><span className={`badge ${leadTone(lead.lead_status)}`}>{String(lead.lead_status ?? "Sem etapa")}</span></td>
                      <td><span className="table-note">{String(lead.notes ?? "—")}</span></td>
                      <td>
                        <Link className="button ghost compact-button" href={`/leads/${String(lead.lead_id)}`}>
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </article>

      <article className="panel product-history-panel">
        <div className="panel-head">
          <div>
            <h2>Últimos pedidos de fornecedor</h2>
            <p>Compras em que este produto foi solicitado, recebido ou ainda está a caminho.</p>
          </div>
          <span className="bank-module-badge">
            <Truck size={15} />
            {supplierOrders.length}
          </span>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          {supplierOrders.length === 0 ? (
            <div className="bank-empty-state">Nenhum pedido de fornecedor encontrado.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Pedido</th><th>Fornecedor</th><th>Destino</th><th>Qtd.</th><th>Recebida</th><th>Custo</th><th>Situação</th><th /></tr>
                </thead>
                <tbody>
                  {supplierOrders.map((order) => {
                    const status = supplierStatus(order.order_status, order.quantity_pending);
                    return (
                      <tr key={String(order.purchase_order_item_id)}>
                        <td>
                          <strong>{formatDateOnly(String(order.ordered_on ?? ""))}</strong>
                          <small className="crm-cell-note">
                            {order.expected_on ? `Previsto: ${formatDateOnly(String(order.expected_on))}` : "Sem previsão"}
                          </small>
                        </td>
                        <td>{String(order.supplier_name ?? "Fornecedor")}</td>
                        <td>{String(order.destination_name ?? order.destination_code ?? "—")}</td>
                        <td>{Number(order.quantity_ordered ?? 0)}</td>
                        <td>{Number(order.quantity_received ?? 0)}</td>
                        <td>{formatCurrency(Number(order.total_cost ?? 0))}</td>
                        <td><span className={`badge ${status.tone}`}>{status.label}</span></td>
                        <td>
                          <Link className="button ghost compact-button" href={`/pedidos-fornecedor/${String(order.purchase_order_id)}`}>
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </article>

      <article className="panel product-history-panel product-last-history-panel">
        <div className="panel-head">
          <div>
            <h2>Últimas vendas</h2>
            <p>Histórico final do produto: clientes, quantidade, sabor, valor e resultado.</p>
          </div>
          <span className="bank-module-badge">
            <ShoppingBag size={15} />
            {recentSales.length}
          </span>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          {recentSales.length === 0 ? (
            <div className="bank-empty-state">Nenhuma venda registrada para este produto.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Data</th><th>Cliente</th><th>Qtd.</th><th>Sabor</th><th>Valor</th><th>Lucro</th><th>Situação</th><th /></tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => {
                    const status = saleStatus(sale.payment_status, sale.delivery_status);
                    return (
                      <tr key={String(sale.sale_item_id)}>
                        <td>{formatDateOnly(String(sale.sold_at ?? ""))}</td>
                        <td>
                          {sale.customer_id ? (
                            <Link href={`/clientes/${String(sale.customer_id)}`}>
                              <strong>{String(sale.customer_name)}</strong><br />
                              <small>{[sale.customer_reference, sale.customer_city].filter(Boolean).join(" · ")}</small>
                            </Link>
                          ) : (
                            <span><UserRound size={13} /> {String(sale.customer_name)}</span>
                          )}
                        </td>
                        <td>{Number(sale.quantity ?? 0)}</td>
                        <td>{String(sale.flavor_name ?? "—")}</td>
                        <td>{formatCurrency(Number(sale.total_price ?? 0))}</td>
                        <td className="positive">{formatCurrency(Number(sale.total_profit ?? 0))}</td>
                        <td><span className={`badge ${status.tone}`}>{status.label}</span></td>
                        <td>
                          <Link className="button ghost compact-button" href={`/pedidos-pendentes/${String(sale.sale_id)}`}>
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
