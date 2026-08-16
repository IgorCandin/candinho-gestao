/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/badge";
import { SalePartnerLinker } from "@/components/sale-partner-linker";
import {
  formatCurrency,
  formatDate,
  formatDateOnly,
} from "@/lib/format";
import { getReservationStatusLabel } from "@/lib/reservation-status";
import type {
  SalesOperationalRow,
} from "@/lib/sales-operational-data";

function PaymentStatus({
  sale,
}: {
  sale: SalesOperationalRow;
}) {
  if (sale.paid_at) {
    return (
      <span className="date-status green">
        {formatDate(sale.paid_at)}
      </span>
    );
  }

  if (sale.payment_due_at) {
    return (
      <span className="date-status orange">
        {formatDateOnly(
          sale.payment_due_at,
        )}
      </span>
    );
  }

  return <Badge value={sale.payment_status} />;
}

function DeliveryStatus({
  sale,
}: {
  sale: SalesOperationalRow;
}) {
  if (sale.delivered_at) {
    return (
      <span className="date-status green">
        {formatDate(sale.delivered_at)}
      </span>
    );
  }

  return <Badge value={sale.delivery_status} />;
}

function ProductTiles({
  sale,
}: {
  sale: SalesOperationalRow;
}) {
  if (sale.products.length === 0) {
    return (
      <span
        className="sales-product-tile empty"
        title="Produto não informado"
      >
        <ImageIcon size={19} />
      </span>
    );
  }

  return (
    <div
      className="sales-product-tiles"
      aria-label="Produtos da venda"
    >
      {sale.products.map((product) => (
        <Link
          key={product.id}
          className="sales-product-tile"
          href={`/produtos/${product.id}`}
          title={`${product.name} ×${product.quantity}`}
          aria-label={`${product.name}, ${product.quantity} unidade${product.quantity === 1 ? "" : "s"}`}
          onClick={(event) =>
            event.stopPropagation()
          }
          onKeyDown={(event) =>
            event.stopPropagation()
          }
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt=""
              loading="lazy"
            />
          ) : (
            <ImageIcon size={19} />
          )}

          {product.quantity > 1 && (
            <span className="sales-product-quantity">
              ×{product.quantity}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export function SalesTable({
  sales,
}: {
  sales: SalesOperationalRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] =
    useState<Set<string>>(
      () => new Set(),
    );

  const selectedIds = useMemo(
    () => Array.from(selected),
    [selected],
  );

  const allSelected =
    sales.length > 0 &&
    sales.every((sale) =>
      selected.has(sale.id),
    );

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      if (allSelected) {
        const next = new Set(current);

        for (const sale of sales) {
          next.delete(sale.id);
        }

        return next;
      }

      const next = new Set(current);

      for (const sale of sales) {
        next.add(sale.id);
      }

      return next;
    });
  }

  return (
    <div className="sales-history-shell">
      {selectedIds.length > 0 && (
        <div className="sales-selection-panel panel-body">
          <div>
            <strong>
              {selectedIds.length} venda
              {selectedIds.length === 1
                ? ""
                : "s"}{" "}
              selecionada
              {selectedIds.length === 1
                ? ""
                : "s"}
            </strong>
            <small>
              Use isto para corrigir
              parcerias antigas em lote.
            </small>
          </div>

          <SalePartnerLinker
            saleIds={selectedIds}
            embedded
            onLinked={() =>
              setSelected(new Set())
            }
          />
        </div>
      )}

      <div className="sales-list-heading">
        <label>
          <input
            aria-label="Selecionar vendas desta página"
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
          />
          Selecionar todas
        </label>
        <span>
          Clique em uma venda para abrir os detalhes
        </span>
      </div>

      <div className="sales-history-list">
        {sales.map((sale) => (
          <article
            key={sale.id}
            className="sales-history-card clickable-order-row"
            role="link"
            tabIndex={0}
            onClick={() =>
              router.push(
                `/vendas/${sale.id}`,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                router.push(
                  `/vendas/${sale.id}`,
                );
              }
            }}
          >
            <div
              className="sales-card-select"
              onClick={(event) =>
                event.stopPropagation()
              }
              onKeyDown={(event) =>
                event.stopPropagation()
              }
            >
              <input
                aria-label={`Selecionar venda de ${sale.customer_name}`}
                type="checkbox"
                checked={selected.has(
                  sale.id,
                )}
                onChange={() =>
                  toggle(sale.id)
                }
              />
            </div>

            <div className="sales-card-content">
              <div className="sales-card-line sales-card-line-primary">
                <div className="sales-card-cell sales-card-customer">
                  <span className="sales-card-label">
                    Cliente
                  </span>
                  {sale.customer_id ? (
                    <Link
                      className="cell-main table-link"
                      href={`/clientes/${sale.customer_id}`}
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                      onKeyDown={(event) =>
                        event.stopPropagation()
                      }
                    >
                      {sale.customer_name}
                    </Link>
                  ) : (
                    <strong className="cell-main">
                      {sale.customer_name}
                    </strong>
                  )}
                  <span className="cell-sub">
                    {[
                      sale.city,
                      sale.price_condition,
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                      "Detalhes da venda"}
                  </span>
                </div>

                <div className="sales-card-cell">
                  <span className="sales-card-label">
                    Data do orçamento
                  </span>
                  <strong>
                    {formatDate(
                      sale.quoted_at,
                    )}
                  </strong>
                </div>

                <div className="sales-card-cell">
                  <span className="sales-card-label">
                    Pagamento
                  </span>
                  <PaymentStatus sale={sale} />
                </div>

                <div className="sales-card-cell">
                  <span className="sales-card-label">
                    Entrega
                  </span>
                  <DeliveryStatus sale={sale} />
                </div>
              </div>

              <div className="sales-card-line sales-card-line-secondary">
                <div className="sales-card-cell sales-card-products">
                  <span className="sales-card-label">
                    Produtos
                  </span>
                  <ProductTiles sale={sale} />
                </div>

                <div className="sales-card-cell">
                  <span className="sales-card-label">
                    Estoque
                  </span>
                  <strong>
                    {sale.location_code}
                  </strong>
                  {sale.reservation_status && (
                    <span
                      className={`cell-sub reservation-${sale.reservation_status}`}
                    >
                      {getReservationStatusLabel(
                        sale.reservation_status,
                        "commercial",
                      )}
                    </span>
                  )}
                </div>

                <div className="sales-card-cell sales-card-partner">
                  <span className="sales-card-label">
                    Parceria
                  </span>
                  {sale.partner_name ? (
                    <span className="badge green">
                      {sale.partner_name}
                    </span>
                  ) : (
                    <span className="cell-sub">
                      Sem parceria
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="sales-card-finance">
              <span>Total</span>
              <strong>
                {formatCurrency(
                  sale.total_amount,
                )}
              </strong>
              <small>Lucro</small>
              <b>
                {formatCurrency(
                  sale.total_profit,
                )}
              </b>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
