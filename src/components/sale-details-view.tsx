/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowLeft, CalendarDays, CircleDollarSign, Handshake, ImageIcon, MapPin, PackageCheck, Phone, ShoppingBag, UserRound, Warehouse } from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { SaleStatusActions } from "@/components/sale-status-actions";
import { ChangeSaleCustomer } from "@/components/change-sale-customer";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import type { SaleDetails } from "@/lib/types";

function DetailLine({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return <div className="sale-detail-line"><span>{label}</span><strong>{value}</strong></div>;
}

function reservationLabel(status: string | null, reserved: number | null, requested: number | null) {
  if (status === "reserved") return `${reserved ?? requested ?? 0} reservada(s)`;
  if (status === "partial") return `${reserved ?? 0} de ${requested ?? 0} reservada(s)`;
  if (status === "awaiting_stock") return "Aguardando fornecedor";
  if (status === "fulfilled") return "Baixado na entrega";
  return null;
}

export function SaleDetailsView({ sale, backHref, backLabel, eyebrow = "Venda" }: { sale: SaleDetails; backHref: string; backLabel: string; eyebrow?: string }) {
  return <>
    <DemoBanner/>
    <PageHeader eyebrow={eyebrow} title={sale.customer_name} description="Confira produtos, estoque, pagamento, entrega e informações internas da venda." action={<Link className="button ghost" href={backHref}><ArrowLeft size={16}/>{backLabel}</Link>}/>

    <section className="sale-details-layout">
      <div className="sale-details-main">
        <article className="panel">
          <div className="panel-head"><div><h2>Produtos da venda</h2><p>{sale.items.length} {sale.items.length===1?"item registrado":"itens registrados"}</p></div><strong className="sale-total-highlight">{formatCurrency(sale.total_amount)}</strong></div>
          <div className="panel-body sale-items-list">
            {sale.items.map((item)=><div className="sale-item-card detailed" key={item.id}>
              <div className="sale-item-image">{item.product_image_url?<img src={item.product_image_url} alt={item.product_name}/>:<ImageIcon size={28}/>}</div>
              <div className="sale-item-copy"><Link className="table-link" href={`/produtos/${item.product_id}`}><strong>{item.product_name}</strong></Link><span>{[item.category,item.brand].filter(Boolean).join(" · ")||"Produto cadastrado"}</span>{reservationLabel(item.reservation_status,item.quantity_reserved,item.quantity_requested)&&<small className={`reservation-copy ${item.reservation_status}`}>{reservationLabel(item.reservation_status,item.quantity_reserved,item.quantity_requested)}</small>}</div>
              <div className="sale-item-numbers"><span>{item.quantity} {item.quantity===1?"unidade":"unidades"}</span><strong>{formatCurrency(item.unit_price*item.quantity)}</strong><small>{formatCurrency(item.unit_price)} por unidade</small><small>Custo interno: {formatCurrency(item.unit_cost)}</small><small>{item.price_condition}</small></div>
            </div>)}
          </div>
        </article>

        <article className="panel"><div className="panel-head"><div><h2>Atualizar venda</h2><p>Corrija o cliente sem cancelar a venda ou atualize pagamento e entrega.</p></div></div><div className="panel-body sale-update-stack"><ChangeSaleCustomer saleId={sale.id} currentCustomerId={sale.customer_id} currentCustomerName={sale.customer_name}/><SaleStatusActions saleId={sale.id} generalStatus={sale.general_status} paymentStatus={sale.payment_status} deliveryStatus={sale.delivery_status}/></div></article>
      </div>

      <aside className="sale-details-side">
        <article className="panel"><div className="panel-head"><div><h2>Situação</h2><p>Status atual da venda</p></div><ShoppingBag size={19}/></div><div className="panel-body sale-status-grid"><div><span>Pagamento</span><Badge value={sale.payment_status}/></div><div><span>Entrega</span><Badge value={sale.delivery_status}/></div></div></article>

        <article className="panel"><div className="panel-head"><div><h2>Datas e pagamento</h2><p>Histórico preenchido da venda</p></div><CalendarDays size={19}/></div><div className="panel-body sale-detail-list">
          <DetailLine label="Data do orçamento" value={formatDate(sale.order_at)}/>
          <DetailLine label="Data do recebimento" value={sale.paid_at?formatDate(sale.paid_at):null}/>
          <DetailLine label="Pagamento combinado" value={sale.payment_due_at?formatDateOnly(sale.payment_due_at):null}/>
          <DetailLine label="Data da entrega" value={sale.delivered_at?formatDate(sale.delivered_at):null}/>
          <DetailLine label="Forma de pagamento" value={sale.payment_method}/>
          <DetailLine label="Situação do pagamento" value={sale.payment_condition}/>
          <DetailLine label="Condição do preço" value={sale.price_condition}/>
        </div></article>

        <article className="panel"><div className="panel-head"><div><h2>Cliente e origem</h2><p>Dados usados na operação</p></div><UserRound size={19}/></div><div className="panel-body sale-detail-list">
          <DetailLine label="Cliente" value={sale.customer_id?<Link className="table-link" href={`/clientes/${sale.customer_id}`}>{sale.customer_name}</Link>:sale.customer_name}/>
          <DetailLine label="Telefone" value={sale.phone?<span className="detail-with-icon"><Phone size={14}/>{sale.phone}</span>:null}/>
          <DetailLine label="Cidade" value={sale.city}/><DetailLine label="Referência" value={sale.reference}/>
          <DetailLine label="Origem do estoque" value={<span className="detail-with-icon"><MapPin size={14}/>{sale.location_code} · {sale.location_name}</span>}/>
        </div></article>

        {sale.partner_name&&<article className="panel"><div className="panel-head"><div><h2>Parceria</h2><p>Venda contabilizada para o parceiro</p></div><Handshake size={19}/></div><div className="panel-body sale-detail-list"><DetailLine label="Parceiro" value={sale.partner_name}/></div></article>}
        {sale.notes&&<article className="panel"><div className="panel-head"><div><h2>Observações</h2><p>Informações adicionais da venda</p></div><PackageCheck size={19}/></div><div className="panel-body"><p className="sale-notes">{sale.notes}</p></div></article>}

        <article className="panel sale-finance-panel"><div><Warehouse size={19}/><span>Custo interno</span><strong>{formatCurrency(sale.total_cost)}</strong></div><div><CircleDollarSign size={19}/><span>Lucro</span><strong className="positive">{formatCurrency(sale.total_profit)}</strong></div></article>
        <article className="panel sale-total-panel"><CircleDollarSign size={22}/><div><span>Total da venda</span><strong>{formatCurrency(sale.total_amount)}</strong></div></article>
      </aside>
    </section>
  </>;
}
