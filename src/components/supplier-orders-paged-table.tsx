import Link from "next/link";
import { ArrowUpDown, PackageCheck, Truck } from "lucide-react";
import { CommercialPagination } from "@/components/commercial-pagination";
import type { SupplierOrderSummary } from "@/lib/types";
import { formatCurrency, formatDateOnly } from "@/lib/format";

function statusLabel(status: string) {
  if (status === "received") return "Recebido";
  if (status === "partial") return "Parcial";
  if (status === "cancelled") return "Cancelado";
  return "A caminho";
}

export function SupplierOrdersPagedTable({
  orders,
  tab,
  sort,
  page,
  pageSize,
  total,
  totalPages,
  pendingCount,
  historyCount,
}: {
  orders: SupplierOrderSummary[];
  tab: "pending" | "history";
  sort: "date" | "supplier" | "pending";
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pendingCount: number;
  historyCount: number;
}) {
  return (
    <>
      <nav className="period-tabs" aria-label="Situação dos pedidos de fornecedor">
        <Link
          className={`period-tab ${tab === "pending" ? "active" : ""}`}
          href="/pedidos-fornecedor?tab=pending"
        >
          Pendentes ({pendingCount})
        </Link>
        <Link
          className={`period-tab ${tab === "history" ? "active" : ""}`}
          href="/pedidos-fornecedor?tab=history"
        >
          Histórico ({historyCount})
        </Link>
      </nav>

      <article className="panel">
        <div className="supplier-table-toolbar">
          <span>{total} {total === 1 ? "pedido" : "pedidos"}</span>

          <form method="get">
            <input type="hidden" name="tab" value={tab} />
            <div>
              <ArrowUpDown size={15} />
              <select
                className="select compact-select"
                name="sort"
                defaultValue={sort}
              >
                <option value="date">Mais recente</option>
                <option value="supplier">Fornecedor A–Z</option>
                <option value="pending">Mais unidades pendentes</option>
              </select>
              <button className="button ghost compact-button" type="submit">
                Ordenar
              </button>
            </div>
          </form>
        </div>

        {orders.length === 0 ? (
          <div className="empty">
            <strong>Nenhum pedido nesta situação</strong>
            Os pedidos aparecerão aqui quando forem registrados.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table supplier-orders-table">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Produtos</th>
                  <th>Data</th>
                  <th>Destino</th>
                  <th>Recebimento</th>
                  <th>Vendas aguardando</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        className="supplier-order-row-link"
                        href={`/pedidos-fornecedor/${order.id}`}
                      >
                        <span className={`supplier-order-icon ${order.status}`}>
                          {order.status === "received"
                            ? <PackageCheck size={18} />
                            : <Truck size={18} />}
                        </span>
                        <span>
                          <strong>{order.supplier_name}</strong>
                          <small>{statusLabel(order.status)}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <Link
                        className="table-link"
                        href={`/pedidos-fornecedor/${order.id}`}
                      >
                        {order.product_summary ?? "—"}
                      </Link>
                    </td>
                    <td>{formatDateOnly(order.ordered_on)}</td>
                    <td>{order.destination_code}</td>
                    <td>
                      <span className={`date-status ${order.status === "received" ? "green" : "orange"}`}>
                        {order.received_units}/{order.ordered_units} un.
                      </span>
                    </td>
                    <td>
                      {order.waiting_sales_count > 0
                        ? <span className="date-status orange">{order.waiting_sales_count} venda(s)</span>
                        : <span className="muted-value">—</span>}
                    </td>
                    <td>
                      <strong>{formatCurrency(order.order_total)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <CommercialPagination
          pathname="/pedidos-fornecedor"
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          params={{ tab, sort }}
        />
      </article>
    </>
  );
}
