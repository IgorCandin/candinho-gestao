/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Boxes, Clock3, ImageIcon, PackageCheck, PackageOpen, ShoppingBag, Tags } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { InventoryActions } from "@/components/inventory-actions";
import { PageHeader } from "@/components/page-header";
import { getInventoryLocationOverview, getInventoryOverview, getInventoryProductDetails, getSaleLocations } from "@/lib/data";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import { getReservationStatusLabel } from "@/lib/reservation-status";
import { createClient } from "@/lib/supabase/server";

const MOVEMENT_LABELS: Record<string, string> = {
  opening: "Saldo inicial",
  purchase: "Compra",
  cancellation: "Cancelamento",
  transfer_in: "Transferência recebida",
  transfer_out: "Transferência enviada",
  sale: "Venda entregue",
  adjustment: "Ajuste",
};

export default async function InventoryProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    details,
    products,
    locations,
    locationRows,
    flavorSummaryResult,
    flavorInventoryResult,
    reservationFlavorResult,
    movementFlavorResult,
  ] = await Promise.all([
    getInventoryProductDetails(id),
    getInventoryOverview(),
    getSaleLocations(),
    getInventoryLocationOverview(),
    supabase.from("product_flavor_summary").select("flavor_tracking_enabled").eq("product_id", id).maybeSingle(),
    supabase
      .from("product_flavor_inventory_overview")
      .select("flavor_id,flavor_name,display_order,location_id,location_code,location_name,physical_quantity,reserved_quantity,available_quantity,incoming_quantity")
      .eq("product_id", id)
      .eq("active", true)
      .order("display_order")
      .order("flavor_name")
      .order("location_code"),
    supabase.from("inventory_product_reservations").select("id,flavor_name").eq("product_id", id),
    supabase.from("inventory_movement_history").select("id,flavor_name").eq("product_id", id).order("occurred_at", { ascending: false }).limit(100),
  ]);

  if (!details) notFound();
  if (flavorSummaryResult.error) throw flavorSummaryResult.error;
  if (flavorInventoryResult.error) throw flavorInventoryResult.error;
  if (reservationFlavorResult.error) throw reservationFlavorResult.error;
  if (movementFlavorResult.error) throw movementFlavorResult.error;

  const { overview } = details;
  const flavorEnabled = Boolean(flavorSummaryResult.data?.flavor_tracking_enabled);
  const flavorRows = flavorInventoryResult.data ?? [];

  const reservationFlavorMap = new Map(
    (reservationFlavorResult.data ?? []).map((row) => [String(row.id), typeof row.flavor_name === "string" ? row.flavor_name : null]),
  );

  const movementFlavorMap = new Map(
    (movementFlavorResult.data ?? []).map((row) => [String(row.id), typeof row.flavor_name === "string" ? row.flavor_name : null]),
  );

  return <>
    <DemoBanner/>
    <PageHeader
      eyebrow="Estoque"
      title={overview.product_name}
      description="Saldo total por depósito, composição por sabor, reservas de clientes e histórico de movimentações."
      action={
        <div className="page-header-action-group">
          <Link className="button ghost" href="/estoque"><ArrowLeft size={16}/>Voltar</Link>
          <InventoryActions products={products} locations={locations} locationRows={locationRows} initialProductId={id}/>
        </div>
      }
    />

    <section className="inventory-product-hero panel">
      <div className="inventory-product-hero-image">
        {overview.image_url ? <img src={overview.image_url} alt={overview.product_name}/> : <ImageIcon size={34}/>}
      </div>
      <div className="inventory-product-hero-copy">
        <span>{[overview.category, overview.brand].filter(Boolean).join(" · ")}</span>
        <strong>{overview.product_name}</strong>
        <Link className="inline-link" href={`/produtos/${id}`}>Abrir ficha comercial do produto</Link>
      </div>
      <div className="inventory-product-hero-numbers">
        <div><span>Físico total</span><strong>{overview.physical_quantity}</strong></div>
        <div><span>Reservado</span><strong>{overview.reserved_quantity}</strong></div>
        <div><span>Disponível</span><strong>{overview.available_quantity}</strong></div>
        <div><span>A caminho</span><strong>{overview.incoming_quantity}</strong></div>
      </div>
    </section>

    {flavorEnabled && (
      <article className="panel">
        <div className="panel-head">
          <div>
            <h2><Tags size={18}/> Distribuição por sabor</h2>
            <p>A soma dos sabores forma o estoque físico total do produto. Operações de estoque são feitas sabor por sabor.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Sabor</th><th>Local</th><th>Físico</th><th>Reservado</th><th>Disponível</th><th>A caminho</th></tr>
            </thead>
            <tbody>
              {flavorRows.map((row) => (
                <tr key={`${row.flavor_id}:${row.location_id}`}>
                  <td><strong>{row.flavor_name}</strong></td>
                  <td><strong>{row.location_code}</strong><small>{row.location_name}</small></td>
                  <td>{Number(row.physical_quantity ?? 0)}</td>
                  <td className="warning-text">{Number(row.reserved_quantity ?? 0)}</td>
                  <td className="positive">{Number(row.available_quantity ?? 0)}</td>
                  <td className="blue-text">{Number(row.incoming_quantity ?? 0)}</td>
                </tr>
              ))}
              {flavorRows.length === 0 && <tr><td colSpan={6}>Nenhum sabor ativo encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </article>
    )}

    <section className="inventory-detail-grid">
      <div className="inventory-detail-main">
        <article className="panel">
          <div className="panel-head"><div><h2>Saldo total por depósito</h2><p>Visão agregada do produto. Para itens com sabor, o detalhamento aparece acima.</p></div><Boxes size={19}/></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Local</th><th>Físico</th><th>Reservado</th><th>Disponível</th><th>A caminho</th><th>Custo</th><th>Venda potencial</th></tr></thead>
              <tbody>
                {details.locations.map((row: (typeof details.locations)[number]) => (
                  <tr key={row.location_id}>
                    <td><strong>{row.location_code}</strong><div className="cell-sub">{row.location_name}</div></td>
                    <td className="amount">{row.physical_quantity}</td>
                    <td className="amount warning-text">{row.reserved_quantity}</td>
                    <td className="amount positive">{row.available_quantity}</td>
                    <td className="amount blue-text">{row.incoming_quantity}</td>
                    <td>{formatCurrency(row.stock_cost_value)}</td>
                    <td>{formatCurrency(row.stock_sale_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Histórico de movimentações</h2><p>Últimas 100 entradas, saídas, transferências e ajustes.</p></div><ArrowRightLeft size={19}/></div>
          {details.movements.length === 0 ? (
            <div className="empty"><strong>Sem movimentações</strong>O histórico aparecerá após a primeira operação.</div>
          ) : (
            <div className="inventory-movement-list">
              {details.movements.map((movement: (typeof details.movements)[number]) => {
                const flavorName = movementFlavorMap.get(movement.id);
                return (
                  <div className="inventory-movement-row" key={movement.id}>
                    <span className={`movement-quantity ${movement.quantity_delta > 0 ? "positive" : "negative"}`}>
                      {movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}
                    </span>
                    <div>
                      <strong>{MOVEMENT_LABELS[movement.movement_type] ?? movement.movement_type}{flavorName ? ` · ${flavorName}` : ""}</strong>
                      <small>
                        {movement.location_code}
                        {movement.counterpart_location_code ? ` ↔ ${movement.counterpart_location_code}` : ""}
                        {movement.customer_name ? ` · ${movement.customer_name}` : ""}
                      </small>
                      {movement.notes && <p>{movement.notes}</p>}
                    </div>
                    <time>{formatDate(movement.occurred_at)}</time>
                    {movement.sale_id && <Link className="button ghost compact-button" href={`/vendas/${movement.sale_id}`}>Venda</Link>}
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </div>

      <aside className="inventory-detail-side">
        <article className="panel">
          <div className="panel-head"><div><h2>Resumo financeiro</h2><p>Valores calculados pelo saldo físico total.</p></div></div>
          <div className="panel-body sale-detail-list">
            <div className="sale-detail-line"><span>Custo unitário</span><strong>{formatCurrency(overview.cost_price)}</strong></div>
            <div className="sale-detail-line"><span>Preço de venda</span><strong>{formatCurrency(overview.sale_price)}</strong></div>
            <div className="sale-detail-line"><span>Valor de custo</span><strong>{formatCurrency(overview.stock_cost_value)}</strong></div>
            <div className="sale-detail-line"><span>Potencial de venda</span><strong>{formatCurrency(overview.stock_sale_value)}</strong></div>
            <div className="sale-detail-line"><span>Estoque mínimo</span><strong>{overview.min_stock}</strong></div>
            <div className="sale-detail-line"><span>Estoque ideal</span><strong>{overview.ideal_stock}</strong></div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Reservas abertas</h2><p>Vendas aguardando entrega ou reposição.</p></div><PackageCheck size={19}/></div>
          {details.reservations.length === 0 ? (
            <div className="empty compact-empty"><strong>Nenhuma reserva</strong>Todo o saldo disponível está livre.</div>
          ) : (
            <div className="inventory-reservation-list">
              {details.reservations.map((reservation: (typeof details.reservations)[number]) => {
                const flavorName = reservationFlavorMap.get(reservation.id);
                return (
                  <div className="inventory-reservation-card" key={reservation.id}>
                    <div>
                      <Link className="table-link" href={`/vendas/${reservation.sale_id}`}>{reservation.customer_name}</Link>
                      <span>{formatDateOnly(reservation.sale_date)} · {reservation.location_code}{flavorName ? ` · ${flavorName}` : ""}</span>
                    </div>
                    <strong>{reservation.quantity_reserved}/{reservation.quantity_requested}</strong>
                    <small className={reservation.status === "awaiting_stock" ? "warning-text" : "positive"}>
                      {getReservationStatusLabel(reservation.status, "inventory")}
                      {reservation.quantity_missing > 0 ? ` · faltam ${reservation.quantity_missing}` : ""}
                    </small>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        {overview.incoming_quantity > 0 && (
          <article className="panel inventory-incoming-card">
            <Clock3 size={20}/>
            <div><span>Produtos a caminho</span><strong>{overview.incoming_quantity} unidade(s)</strong><Link className="inline-link" href="/pedidos-fornecedor">Abrir pedidos de fornecedor</Link></div>
          </article>
        )}

        <article className="panel inventory-available-card">
          <PackageOpen size={20}/>
          <div><span>Disponível para novas vendas</span><strong>{overview.available_quantity} unidade(s)</strong></div>
        </article>

        {overview.reserved_quantity > 0 && (
          <article className="panel inventory-reserved-card">
            <ShoppingBag size={20}/>
            <div><span>Separado para clientes</span><strong>{overview.reserved_quantity} unidade(s)</strong></div>
          </article>
        )}
      </aside>
    </section>
  </>;
}
