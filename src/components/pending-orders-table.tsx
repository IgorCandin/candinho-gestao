/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { PendingOrderRow } from "@/lib/types";

export function PendingOrdersTable({ orders }: { orders: PendingOrderRow[] }) {
  const router = useRouter();

  function openOrder(orderId: string) {
    router.push(`/pedidos-pendentes/${orderId}`);
  }

  return (
    <div className="table-wrap">
      <table className="pending-orders-table">
        <thead>
          <tr>
            <th>Venda</th>
            <th>Produto</th>
            <th>Data</th>
            <th>Pagamento</th>
            <th>Entrega</th>
            <th>Origem</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="clickable-order-row"
              role="link"
              tabIndex={0}
              aria-label={`Abrir venda de ${order.customer_name}`}
              onClick={() => openOrder(order.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openOrder(order.id);
                }
              }}
            >
              <td>
                <div className="pending-order-customer">
                  <div className="pending-order-thumb">
                    {order.primary_image_url ? (
                      <img src={order.primary_image_url} alt={order.product_summary ?? "Produto"} />
                    ) : (
                      <ImageIcon size={20} />
                    )}
                  </div>
                  <div>
                    {order.customer_id ? <Link className="cell-main table-link" href={`/clientes/${order.customer_id}`} onClick={(event) => event.stopPropagation()}>{order.customer_name}</Link> : <div className="cell-main">{order.customer_name}</div>}
                    <div className="cell-sub">Clique para abrir os detalhes</div>
                  </div>
                </div>
              </td>
              <td className="multiline">{order.product_summary ?? "—"}</td>
              <td>{formatDateOnly(order.business_date)}</td>
              <td><Badge value={order.payment_status} /></td>
              <td><Badge value={order.delivery_status} /></td>
              <td>{order.location_code}</td>
              <td className="amount">{formatCurrency(order.total_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
