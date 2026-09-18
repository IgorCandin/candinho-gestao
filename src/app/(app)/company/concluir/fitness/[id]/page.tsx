/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CircleDollarSign, ImageIcon, MessageSquareText, PackageCheck, Phone, ShoppingBag, UserRound, Warehouse } from "lucide-react";
import { Badge } from "@/components/badge";
import { EntitySwipeNavigator } from "@/components/entity-swipe-navigator";
import { FitnessSaleActions } from "@/components/fitness-sale-actions";
import { PageHeader } from "@/components/page-header";
import { getEntitySwipeNavigation, getFitnessSaleDetails } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return <div className="sale-detail-line"><span>{label}</span><strong>{value}</strong></div>;
}

export default async function CompanyFitnessSaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sale, swipe] = await Promise.all([
    getFitnessSaleDetails(id),
    getEntitySwipeNavigation("fitness_sale", id, true),
  ]);
  if (!sale) notFound();

  const cancelled = sale.general_status === "cancelled";
  const paid = sale.payment_status === "received";
  const delivered = sale.delivery_status === "delivered";
  const open = !cancelled && (!paid || !delivered);

  return <>
    <PageHeader
      eyebrow="Company · Concluir venda · Fitness"
      title={sale.customer_name}
      description={`${formatDateOnly(sale.quoted_on)} · ${sale.items.length} ${sale.items.length === 1 ? "peça" : "peças"} · ${sale.product_summary}`}
      action={<div className="page-header-actions">
        <Link className="button ghost" href="/company/concluir"><ArrowLeft size={16}/>Voltar às pendências</Link>
        <Link className="button ghost" href="/company/acompanhar"><MessageSquareText size={16}/>Pós-venda</Link>
      </div>}
    />

    <EntitySwipeNavigator previous={swipe.previous} next={swipe.next}/>

    <section className="sale-details-layout company-fitness-sale-detail">
      <div className="sale-details-main">
        <article className="panel">
          <div className="panel-head">
            <div><h2>Produtos da venda</h2><p>{sale.items.length} {sale.items.length === 1 ? "peça registrada" : "peças registradas"} · tamanho, cor e reserva</p></div>
            <strong className="sale-total-highlight">{formatCurrency(sale.total_amount)}</strong>
          </div>
          <div className="panel-body sale-items-list">
            {sale.items.map((item) => <div className="sale-item-card detailed" key={item.id}>
              <div className="sale-item-image">{item.image_url ? <img src={item.image_url} alt={item.product_name}/> : <ImageIcon size={28}/>}</div>
              <div className="sale-item-copy">
                <Link className="table-link" href={`/company/produtos/fitness/${item.product_id}`}><strong>{item.product_name}</strong></Link>
                <span>Tamanho {item.size} · {item.color}{item.sku ? ` · ${item.sku}` : ""}</span>
                {item.reservation_status && <small className={`reservation-copy ${item.reservation_status}`}>{item.reservation_status === "awaiting_stock" ? "Aguardando estoque" : item.reservation_status === "partial" ? `${item.quantity_reserved} de ${item.quantity} reservada(s)` : item.reservation_status === "reserved" ? `${item.quantity_reserved} reservada(s)` : item.reservation_status === "fulfilled" ? "Estoque baixado" : item.reservation_status}</small>}
              </div>
              <div className="sale-item-numbers">
                <span>{item.quantity} {item.quantity === 1 ? "peça" : "peças"}</span>
                <strong>{formatCurrency(item.quantity * item.unit_price)}</strong>
                <small>{formatCurrency(item.unit_price)} por peça</small>
              </div>
            </div>)}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Atualizar venda</h2><p>Registre recebimento, entrega ou cancelamento sem sair desta página.</p></div><PackageCheck size={19}/></div>
          <div className="panel-body"><FitnessSaleActions saleId={sale.id} generalStatus={sale.general_status} paymentStatus={sale.payment_status} deliveryStatus={sale.delivery_status}/></div>
        </article>
      </div>

      <aside className="sale-details-side">
        <article className="panel">
          <div className="panel-head"><div><h2>Situação</h2><p>{cancelled ? "Venda cancelada" : open ? "Ainda há uma etapa pendente" : "Pagamento e entrega concluídos"}</p></div><ShoppingBag size={19}/></div>
          <div className="panel-body sale-status-grid">
            <div><span>Pagamento</span><Badge value={sale.payment_status}/></div>
            <div><span>Entrega</span><Badge value={sale.delivery_status}/></div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Datas e pagamento</h2><p>Resumo operacional da venda</p></div><CalendarDays size={19}/></div>
          <div className="panel-body sale-detail-list">
            <Detail label="Data do orçamento" value={formatDateOnly(sale.quoted_on)}/>
            <Detail label="Pagamento" value={sale.paid_on ? formatDateOnly(sale.paid_on) : sale.payment_due_on ? `Combinado para ${formatDateOnly(sale.payment_due_on)}` : "A receber"}/>
            <Detail label="Forma" value={sale.payment_method}/>
            <Detail label="Entrega" value={sale.delivered_on ? formatDateOnly(sale.delivered_on) : "Pendente"}/>
            <Detail label="Responsável" value={sale.responsible}/>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Cliente</h2><p>Dados para continuar o atendimento</p></div><UserRound size={19}/></div>
          <div className="panel-body sale-detail-list">
            <Detail label="Nome" value={sale.customer_id ? <Link className="table-link" href={`/company/clientes/fitness/${sale.customer_id}`}>{sale.customer_name}</Link> : sale.customer_name}/>
            <Detail label="Telefone" value={sale.customer_phone ? <span className="detail-with-icon"><Phone size={14}/>{sale.customer_phone}</span> : null}/>
            <Detail label="Cidade" value={sale.city}/>
          </div>
        </article>

        {sale.notes && <article className="panel"><div className="panel-head"><div><h2>Observações</h2></div></div><div className="panel-body"><p className="sale-notes">{sale.notes}</p></div></article>}

        <article className="panel sale-finance-panel">
          <div><Warehouse size={19}/><span>Custo interno</span><strong>{formatCurrency(sale.total_cost)}</strong></div>
          <div><CircleDollarSign size={19}/><span>Lucro</span><strong className="positive">{formatCurrency(sale.total_profit)}</strong></div>
        </article>
        <article className="panel sale-total-panel"><CircleDollarSign size={22}/><div><span>Total da venda</span><strong>{formatCurrency(sale.total_amount)}</strong></div></article>
      </aside>
    </section>
  </>;
}
