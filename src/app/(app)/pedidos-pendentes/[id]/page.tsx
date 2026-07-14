/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowLeft, CalendarDays, CircleDollarSign, ImageIcon, MapPin, PackageCheck, Phone, ShoppingBag, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { SaleStatusActions } from "@/components/sale-status-actions";
import { getSaleDetails } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";

function DetailLine({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="sale-detail-line"><span>{label}</span><strong>{value || "—"}</strong></div>;
}

export default async function PendingOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sale = await getSaleDetails(id);
  if (!sale) notFound();

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Pedido pendente"
        title={sale.customer_name}
        description="Confira os produtos, a origem do estoque e registre somente as etapas que ainda estão pendentes."
        action={<Link className="button ghost" href="/pedidos-pendentes"><ArrowLeft size={16} />Voltar aos pedidos</Link>}
      />

      <section className="sale-details-layout">
        <div className="sale-details-main">
          <article className="panel">
            <div className="panel-head">
              <div><h2>Produtos da venda</h2><p>{sale.items.length} {sale.items.length === 1 ? "item registrado" : "itens registrados"}</p></div>
              <strong className="sale-total-highlight">{formatCurrency(sale.total_amount)}</strong>
            </div>
            <div className="panel-body sale-items-list">
              {sale.items.map((item) => (
                <div className="sale-item-card" key={item.id}>
                  <div className="sale-item-image">
                    {item.product_image_url ? <img src={item.product_image_url} alt={item.product_name} /> : <ImageIcon size={28} />}
                  </div>
                  <div className="sale-item-copy">
                    <strong>{item.product_name}</strong>
                    <span>{[item.category, item.brand].filter(Boolean).join(" · ") || "Produto cadastrado"}</span>
                  </div>
                  <div className="sale-item-numbers">
                    <span>{item.quantity} {item.quantity === 1 ? "unidade" : "unidades"}</span>
                    <strong>{formatCurrency(item.unit_price * item.quantity)}</strong>
                    <small>{formatCurrency(item.unit_price)} por unidade</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head"><div><h2>Atualizar pedido</h2><p>Os botões aparecem somente enquanto a ação estiver pendente.</p></div></div>
            <div className="panel-body">
              <SaleStatusActions saleId={sale.id} paymentStatus={sale.payment_status} deliveryStatus={sale.delivery_status} />
            </div>
          </article>
        </div>

        <aside className="sale-details-side">
          <article className="panel">
            <div className="panel-head"><div><h2>Situação</h2><p>Status atual da venda</p></div><ShoppingBag size={19} /></div>
            <div className="panel-body sale-status-grid">
              <div><span>Pagamento</span><Badge value={sale.payment_status} /></div>
              <div><span>Entrega</span><Badge value={sale.delivery_status} /></div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-head"><div><h2>Datas e pagamento</h2><p>Histórico preenchido da venda</p></div><CalendarDays size={19} /></div>
            <div className="panel-body sale-detail-list">
              <DetailLine label="Data do pedido" value={formatDate(sale.order_at)} />
              <DetailLine label="Data do recebimento" value={formatDate(sale.paid_at)} />
              <DetailLine label="Data da entrega" value={formatDate(sale.delivered_at)} />
              <DetailLine label="Forma de pagamento" value={sale.payment_method} />
              <DetailLine label="Condição" value={sale.payment_condition} />
            </div>
          </article>

          <article className="panel">
            <div className="panel-head"><div><h2>Cliente e origem</h2><p>Dados usados na operação</p></div><UserRound size={19} /></div>
            <div className="panel-body sale-detail-list">
              <DetailLine label="Cliente" value={sale.customer_name} />
              <DetailLine label="Telefone" value={sale.phone ? <span className="detail-with-icon"><Phone size={14} />{sale.phone}</span> : null} />
              <DetailLine label="Cidade" value={sale.city} />
              <DetailLine label="Referência" value={sale.reference} />
              <DetailLine label="Origem do estoque" value={<span className="detail-with-icon"><MapPin size={14} />{sale.location_code} · {sale.location_name}</span>} />
            </div>
          </article>

          {sale.notes && (
            <article className="panel">
              <div className="panel-head"><div><h2>Observações</h2><p>Informações adicionais da venda</p></div><PackageCheck size={19} /></div>
              <div className="panel-body"><p className="sale-notes">{sale.notes}</p></div>
            </article>
          )}

          <article className="panel sale-total-panel">
            <CircleDollarSign size={22} />
            <div><span>Total da venda</span><strong>{formatCurrency(sale.total_amount)}</strong></div>
          </article>
        </aside>
      </section>
    </>
  );
}
