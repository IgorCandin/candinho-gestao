/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Boxes, Clock3, ImageIcon, PackageCheck, PackageOpen, ShoppingBag } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { InventoryActions } from "@/components/inventory-actions";
import { PageHeader } from "@/components/page-header";
import { getInventoryLocationOverview, getInventoryOverview, getInventoryProductDetails, getSaleLocations } from "@/lib/data";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";

const MOVEMENT_LABELS: Record<string, string> = {
  opening: "Saldo inicial", purchase: "Compra", cancellation: "Cancelamento", transfer_in: "TransferÃªncia recebida",
  transfer_out: "TransferÃªncia enviada", sale: "Venda entregue", adjustment: "Ajuste",
};
const RESERVATION_LABELS: Record<string, string> = { reserved: "Reservado", partial: "Reserva parcial", awaiting_stock: "Aguardando estoque", fulfilled: "Atendido" };

export default async function InventoryProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [details, products, locations, locationRows] = await Promise.all([
    getInventoryProductDetails(id), getInventoryOverview(), getSaleLocations(), getInventoryLocationOverview(),
  ]);
  if (!details) notFound();
  const { overview } = details;

  return <>
    <DemoBanner/>
    <PageHeader eyebrow="Estoque" title={overview.product_name} description="Saldo por depÃ³sito, reservas de clientes e histÃ³rico de movimentaÃ§Ãµes." action={<div className="page-header-action-group"><Link className="button ghost" href="/estoque"><ArrowLeft size={16}/>Voltar</Link><InventoryActions products={products} locations={locations} locationRows={locationRows} initialProductId={id}/></div>}/>

    <section className="inventory-product-hero panel">
      <div className="inventory-product-hero-image">{overview.image_url ? <img src={overview.image_url} alt={overview.product_name}/> : <ImageIcon size={34}/>}</div>
      <div className="inventory-product-hero-copy"><span>{[overview.category, overview.brand].filter(Boolean).join(" Â· ")}</span><strong>{overview.product_name}</strong><Link className="inline-link" href={`/produtos/${id}`}>Abrir ficha comercial do produto</Link></div>
      <div className="inventory-product-hero-numbers"><div><span>FÃ­sico</span><strong>{overview.physical_quantity}</strong></div><div><span>Reservado</span><strong>{overview.reserved_quantity}</strong></div><div><span>DisponÃ­vel</span><strong>{overview.available_quantity}</strong></div><div><span>A caminho</span><strong>{overview.incoming_quantity}</strong></div></div>
    </section>

    <section className="inventory-detail-grid">
      <div className="inventory-detail-main">
        <article className="panel">
          <div className="panel-head"><div><h2>Saldo por depÃ³sito</h2><p>O mÃ­nimo nÃ£o Ã© repetido por local; cada linha mostra somente o saldo operacional daquele ponto.</p></div><Boxes size={19}/></div>
          <div className="table-wrap"><table><thead><tr><th>Local</th><th>FÃ­sico</th><th>Reservado</th><th>DisponÃ­vel</th><th>A caminho</th><th>Custo</th><th>Venda potencial</th></tr></thead><tbody>{details.locations.map((row: (typeof details.locations)[number]) => <tr key={row.location_id}><td><strong>{row.location_code}</strong><div className="cell-sub">{row.location_name}</div></td><td className="amount">{row.physical_quantity}</td><td className="amount warning-text">{row.reserved_quantity}</td><td className="amount positive">{row.available_quantity}</td><td className="amount blue-text">{row.incoming_quantity}</td><td>{formatCurrency(row.stock_cost_value)}</td><td>{formatCurrency(row.stock_sale_value)}</td></tr>)}</tbody></table></div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>HistÃ³rico de movimentaÃ§Ãµes</h2><p>Ãšltimas 100 entradas, saÃ­das, transferÃªncias e ajustes.</p></div><ArrowRightLeft size={19}/></div>
          {details.movements.length === 0 ? <div className="empty"><strong>Sem movimentaÃ§Ãµes</strong>O histÃ³rico aparecerÃ¡ apÃ³s a primeira operaÃ§Ã£o.</div> : <div className="inventory-movement-list">{details.movements.map((movement: (typeof details.movements)[number]) => <div className="inventory-movement-row" key={movement.id}><span className={`movement-quantity ${movement.quantity_delta > 0 ? "positive" : "negative"}`}>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}</span><div><strong>{MOVEMENT_LABELS[movement.movement_type] ?? movement.movement_type}</strong><small>{movement.location_code}{movement.counterpart_location_code ? ` â†” ${movement.counterpart_location_code}` : ""}{movement.customer_name ? ` Â· ${movement.customer_name}` : ""}</small>{movement.notes && <p>{movement.notes}</p>}</div><time>{formatDate(movement.occurred_at)}</time>{movement.sale_id && <Link className="button ghost compact-button" href={`/vendas/${movement.sale_id}`}>Venda</Link>}</div>)}</div>}
        </article>
      </div>

      <aside className="inventory-detail-side">
        <article className="panel"><div className="panel-head"><div><h2>Resumo financeiro</h2><p>Valores calculados pelo saldo fÃ­sico.</p></div></div><div className="panel-body sale-detail-list"><div className="sale-detail-line"><span>Custo unitÃ¡rio</span><strong>{formatCurrency(overview.cost_price)}</strong></div><div className="sale-detail-line"><span>PreÃ§o de venda</span><strong>{formatCurrency(overview.sale_price)}</strong></div><div className="sale-detail-line"><span>Valor de custo</span><strong>{formatCurrency(overview.stock_cost_value)}</strong></div><div className="sale-detail-line"><span>Potencial de venda</span><strong>{formatCurrency(overview.stock_sale_value)}</strong></div><div className="sale-detail-line"><span>Estoque mÃ­nimo</span><strong>{overview.min_stock}</strong></div><div className="sale-detail-line"><span>Estoque ideal</span><strong>{overview.ideal_stock}</strong></div></div></article>

        <article className="panel"><div className="panel-head"><div><h2>Reservas abertas</h2><p>Vendas aguardando entrega ou reposiÃ§Ã£o.</p></div><PackageCheck size={19}/></div>
          {details.reservations.length === 0 ? <div className="empty compact-empty"><strong>Nenhuma reserva</strong>Todo o saldo disponÃ­vel estÃ¡ livre.</div> : <div className="inventory-reservation-list">{details.reservations.map((reservation) => <div className="inventory-reservation-card" key={reservation.id}><div><Link className="table-link" href={`/vendas/${reservation.sale_id}`}>{reservation.customer_name}</Link><span>{formatDateOnly(reservation.sale_date)} Â· {reservation.location_code}</span></div><strong>{reservation.quantity_reserved}/{reservation.quantity_requested}</strong><small className={reservation.status === "awaiting_stock" ? "warning-text" : "positive"}>{RESERVATION_LABELS[reservation.status] ?? reservation.status}{reservation.quantity_missing > 0 ? ` Â· faltam ${reservation.quantity_missing}` : ""}</small></div>)}</div>}
        </article>

        {overview.incoming_quantity > 0 && <article className="panel inventory-incoming-card"><Clock3 size={20}/><div><span>Produtos a caminho</span><strong>{overview.incoming_quantity} unidade(s)</strong><Link className="inline-link" href="/pedidos-fornecedor">Abrir pedidos de fornecedor</Link></div></article>}
        <article className="panel inventory-available-card"><PackageOpen size={20}/><div><span>DisponÃ­vel para novas vendas</span><strong>{overview.available_quantity} unidade(s)</strong></div></article>
        {overview.reserved_quantity > 0 && <article className="panel inventory-reserved-card"><ShoppingBag size={20}/><div><span>Separado para clientes</span><strong>{overview.reserved_quantity} unidade(s)</strong></div></article>}
      </aside>
    </section>
  </>;
}


