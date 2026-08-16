/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ImageIcon } from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
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

  const selectedIds =
    useMemo(
      () => Array.from(selected),
      [selected],
    );

  const allSelected =
    sales.length > 0 &&
    sales.every((sale) =>
      selected.has(sale.id),
    );

  function toggle(
    id: string,
  ) {
    setSelected((current) => {
      const next = new Set(
        current,
      );

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
        const next = new Set(
          current,
        );

        for (const sale of sales) {
          next.delete(sale.id);
        }

        return next;
      }

      const next = new Set(
        current,
      );

      for (const sale of sales) {
        next.add(sale.id);
      }

      return next;
    });
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
      }}
    >
      {selectedIds.length > 0 && (
        <div
          className="panel-body"
          style={{
            display: "grid",
            gap: 8,
            borderBottom:
              "1px solid var(--line)",
          }}
        >
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
            <small
              style={{
                display: "block",
                marginTop: 3,
                color: "var(--muted)",
              }}
            >
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

      <div className="table-wrap">
        <table className="sales-history-table">
          <thead>
            <tr>
              <th
                style={{
                  width: 36,
                }}
              >
                <input
                  aria-label="Selecionar vendas desta página"
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th>Venda</th>
              <th>Produto</th>
              <th>
                Data do orçamento
              </th>
              <th>Pagamento</th>
              <th>Entrega</th>
              <th>Estoque</th>
              <th>Parceria</th>
              <th>Total</th>
              <th>Lucro</th>
            </tr>
          </thead>

          <tbody>
            {sales.map((sale) => (
              <tr
                key={sale.id}
                className="clickable-order-row"
                role="link"
                tabIndex={0}
                onClick={() =>
                  router.push(
                    `/vendas/${sale.id}`,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                      "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();
                    router.push(
                      `/vendas/${sale.id}`,
                    );
                  }
                }}
              >
                <td
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
                </td>

                <td>
                  <div className="pending-order-customer">
                    <div className="pending-order-thumb">
                      {sale.primary_image_url ? (
                        <img
                          src={sale.primary_image_url}
                          alt={
                            sale.product_summary ??
                            "Produto"
                          }
                        />
                      ) : (
                        <ImageIcon
                          size={20}
                        />
                      )}
                    </div>

                    <div>
                      {sale.customer_id ? (
                        <Link
                          className="cell-main table-link"
                          href={`/clientes/${sale.customer_id}`}
                          onClick={(
                            event,
                          ) =>
                            event.stopPropagation()
                          }
                        >
                          {
                            sale.customer_name
                          }
                        </Link>
                      ) : (
                        <div className="cell-main">
                          {
                            sale.customer_name
                          }
                        </div>
                      )}

                      <div className="cell-sub">
                        {[
                          sale.city,
                          sale.price_condition,
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                          "Clique para abrir os detalhes"}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="multiline">
                  {sale.primary_product_id ? (
                    <Link
                      className="table-link"
                      href={`/produtos/${sale.primary_product_id}`}
                      onClick={(
                        event,
                      ) =>
                        event.stopPropagation()
                      }
                    >
                      {sale.product_summary ??
                        "—"}
                    </Link>
                  ) : (
                    sale.product_summary ??
                    "—"
                  )}
                </td>

                <td>
                  {formatDate(
                    sale.quoted_at,
                  )}
                </td>

                <td>
                  {sale.paid_at ? (
                    <span className="date-status green">
                      {formatDate(
                        sale.paid_at,
                      )}
                    </span>
                  ) : sale.payment_due_at ? (
                    <span className="date-status orange">
                      {formatDateOnly(
                        sale.payment_due_at,
                      )}
                    </span>
                  ) : (
                    <Badge
                      value={
                        sale.payment_status
                      }
                    />
                  )}
                </td>

                <td>
                  {sale.delivered_at ? (
                    <span className="date-status green">
                      {formatDate(
                        sale.delivered_at,
                      )}
                    </span>
                  ) : (
                    <Badge
                      value={
                        sale.delivery_status
                      }
                    />
                  )}
                </td>

                <td>
                  <div className="cell-main">
                    {sale.location_code}
                  </div>
                  {sale.reservation_status && (
                    <div
                      className={`cell-sub reservation-${sale.reservation_status}`}
                    >
                      {getReservationStatusLabel(
                        sale.reservation_status,
                        "commercial",
                      )}
                    </div>
                  )}
                </td>

                <td>
                  {sale.partner_name ? (
                    <span className="badge green">
                      {sale.partner_name}
                    </span>
                  ) : (
                    <span className="cell-sub">
                      Sem parceria
                    </span>
                  )}
                </td>

                <td className="amount">
                  {formatCurrency(
                    sale.total_amount,
                  )}
                </td>

                <td className="amount positive">
                  {formatCurrency(
                    sale.total_profit,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
