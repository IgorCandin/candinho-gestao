"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type Row = {
  id: string;
  customer_name: string;
  city: string | null;
  product_summary: string | null;
  quoted_on: string;
  payment_status: string;
  delivery_status: string;
  reservation_status: string | null;
  total_amount: number;
  customer_id?: string | null;
  primary_product_id?: string | null;
};

const label = (name: string, city: string | null) =>
  city?.trim() ? `${name} - ${city}` : name;

export function FitnessSalesTable({ sales }: { sales: Row[] }) {
  const router = useRouter();

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Produtos</th>
            <th>Data</th>
            <th>Pagamento</th>
            <th>Entrega</th>
            <th>Reserva</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr
              key={sale.id}
              className="clickable-data-row"
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/fitness/vendas/${sale.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/fitness/vendas/${sale.id}`);
                }
              }}
            >
              <td>
                {sale.customer_id ? (
                  <Link
                    className="table-link"
                    href={`/fitness/clientes/${sale.customer_id}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <strong>{label(sale.customer_name, sale.city)}</strong>
                  </Link>
                ) : (
                  <strong>{label(sale.customer_name, sale.city)}</strong>
                )}
                <small className="crm-cell-note">Clique fora do nome para abrir a venda</small>
              </td>
              <td>
                {sale.primary_product_id ? (
                  <Link
                    className="table-link"
                    href={`/fitness/produtos/${sale.primary_product_id}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {sale.product_summary || "Produto"}
                  </Link>
                ) : (
                  sale.product_summary || "—"
                )}
              </td>
              <td>{formatDateOnly(sale.quoted_on)}</td>
              <td><Badge value={sale.payment_status}/></td>
              <td><Badge value={sale.delivery_status}/></td>
              <td>
                {sale.reservation_status
                  ? <Badge value={sale.reservation_status}/>
                  : <span className="muted-value">—</span>}
              </td>
              <td>{formatCurrency(sale.total_amount)}</td>
            </tr>
          ))}
          {sales.length === 0 && (
            <tr><td colSpan={7}>Nenhuma venda registrada.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
