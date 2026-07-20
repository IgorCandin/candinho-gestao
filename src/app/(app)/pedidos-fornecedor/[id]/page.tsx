import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Boxes, CalendarDays, CircleDollarSign, PackageCheck, Truck, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { ReceivePurchaseItemForm } from "@/components/receive-purchase-item-form";
import { getSupplierOrderDetails } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function statusLabel(status: string) {
  if (status === "received") return "Recebido";
  if (status === "partial") return "Recebimento parcial";
  if (status === "cancelled") return "Cancelado";
  return "A caminho";
}

export default async function SupplierOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, supabase] = await Promise.all([
    getSupplierOrderDetails(id),
    createClient(),
  ]);

  if (!order) notFound();

  const { data: itemFlavorRows, error: flavorError } = await supabase
    .from("supplier_order_items_overview")
    .select("id,flavor_name")
    .eq("purchase_order_id", id);

  if (flavorError) throw flavorError;

  const flavorByItem = new Map(
    (itemFlavorRows ?? []).map((row) => [
      String(row.id),
      typeof row.flavor_name === "string" ? row.flavor_name : null,
    ]),
  );

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Pedido de fornecedor"
        title={order.supplier_name}
        description={`${order.item_count} ${order.item_count === 1 ? "item" : "itens"} · destino ${order.destination_code}`}
        action={<Link className="button ghost" href="/pedidos-fornecedor"><ArrowLeft size={16} />Voltar aos pedidos</Link>}
      />

      <section className="supplier-order-detail-layout">
        <div className="supplier-order-detail-main">
          <article className="panel">
            <div className="panel-head"><div><h2>Itens do pedido</h2><p>Cada produto e sabor pode ser recebido separadamente ou em partes.</p></div><Boxes size={20} /></div>
            <div className="panel-body supplier-detail-items">
              {order.items.map((item) => {
                const flavorName = flavorByItem.get(item.id);
                const itemWithFlavor = { ...item, flavor_name: flavorName ?? null };

                return (
                  <article className="supplier-detail-item" key={item.id}>
                    <div className="supplier-detail-item-top">
                      <div className="supplier-product-image">
                        {item.product_image_url ? <Image src={item.product_image_url} alt={item.product_name} width={88} height={88} unoptimized /> : <Boxes size={24} />}
                      </div>

                      <div className="supplier-product-copy">
                        <Link href={`/produtos/${item.product_id}`}><strong>{item.product_name}</strong></Link>
                        <span>
                          {item.category}
                          {item.brand ? ` · ${item.brand}` : ""}
                          {flavorName ? ` · Sabor ${flavorName}` : ""}
                        </span>

                        <div className="supplier-item-metrics">
                          <span>Pedido <strong>{item.quantity_ordered}</strong></span>
                          <span>Recebido <strong>{item.quantity_received}</strong></span>
                          <span>Pendente <strong>{item.quantity_pending}</strong></span>
                          <span>Custo <strong>{formatCurrency(item.unit_cost)}</strong></span>
                        </div>
                      </div>

                      <span className={`date-status ${item.item_status === "received" ? "green" : "orange"}`}>
                        {statusLabel(item.item_status)}
                      </span>
                    </div>

                    {item.waiting_sales.length > 0 && (
                      <div className="waiting-sales-box">
                        <div className="waiting-sales-head">
                          <UserRound size={17} />
                          <div>
                            <strong>Vendas aguardando este {flavorName ? "sabor" : "produto"}</strong>
                            <span>O recebimento reservará automaticamente as unidades disponíveis para o mesmo sabor.</span>
                          </div>
                        </div>

                        <div className="waiting-sales-list">
                          {item.waiting_sales.map((sale) => (
                            <Link href={`/vendas/${sale.sale_id}`} key={`${item.id}-${sale.sale_id}`}>
                              <span>{sale.customer_name}</span>
                              <small>{formatDateOnly(sale.sale_date)} · faltam {sale.quantity_missing} un.</small>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.quantity_pending > 0
                      ? <ReceivePurchaseItemForm item={itemWithFlavor} />
                      : <div className="supplier-item-complete"><PackageCheck size={18} /><span>Item totalmente recebido</span></div>}
                  </article>
                );
              })}
            </div>
          </article>
        </div>

        <aside className="supplier-order-detail-side">
          <article className="panel">
            <div className="panel-head"><div><h2>Resumo</h2><p>Dados gerais do pedido.</p></div><Truck size={19} /></div>
            <div className="panel-body sale-detail-list">
              <div className="sale-detail-line"><span>Situação</span><strong>{statusLabel(order.status)}</strong></div>
              <div className="sale-detail-line"><span>Data do pedido</span><strong>{formatDateOnly(order.ordered_on)}</strong></div>
              <div className="sale-detail-line"><span>Destino</span><strong>{order.destination_code} · {order.destination_name}</strong></div>
              <div className="sale-detail-line"><span>Unidades pedidas</span><strong>{order.ordered_units}</strong></div>
              <div className="sale-detail-line"><span>Unidades recebidas</span><strong>{order.received_units}</strong></div>
              <div className="sale-detail-line"><span>Unidades pendentes</span><strong>{order.pending_units}</strong></div>
              {order.waiting_sales_count > 0 && <div className="sale-detail-line"><span>Vendas aguardando</span><strong>{order.waiting_sales_count}</strong></div>}
            </div>
          </article>

          <article className="panel supplier-total-card">
            <CircleDollarSign size={20} />
            <div><span>Total do pedido</span><strong>{formatCurrency(order.order_total)}</strong></div>
          </article>

          {order.notes && (
            <article className="panel">
              <div className="panel-head"><div><h2>Observações</h2><p>Informações registradas na compra.</p></div><CalendarDays size={18} /></div>
              <div className="panel-body"><p className="sale-notes">{order.notes}</p></div>
            </article>
          )}
        </aside>
      </section>
    </>
  );
}
