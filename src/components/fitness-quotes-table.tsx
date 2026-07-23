"use client";

import Link from "next/link";
import { FileText, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type Row = {
  id: string;
  quote_number: number | string;
  customer_id: string;
  customer_name: string;
  quoted_on: string;
  valid_until: string;
  total_units: number;
  total_amount: number;
  status: string;
  product_summary: string | null;
  primary_product_id?: string | null;
  sale_id?: string | null;
};

function statusLabel(status: string) {
  if (status === "quoted") return "Em orçamento";
  if (status === "confirmed") return "Convertido";
  if (status === "lost") return "Perdido";
  return "Cancelado";
}

export function FitnessQuotesTable({ rows }: { rows: Row[] }) {
  const router = useRouter();

  if (rows.length === 0) {
    return <div className="empty compact"><strong>Nenhum orçamento Fitness registrado.</strong></div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Orçamento</th>
            <th>Cliente</th>
            <th>Produto</th>
            <th>Data</th>
            <th>Validade</th>
            <th>Itens</th>
            <th>Total</th>
            <th>Status</th>
            <th/>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="clickable-data-row"
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/fitness/orcamentos/${row.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/fitness/orcamentos/${row.id}`);
                }
              }}
            >
              <td>
                <Link
                  className="table-link cell-main"
                  href={`/fitness/orcamentos/${row.id}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  #{row.quote_number}
                </Link>
              </td>
              <td>
                <Link
                  className="table-link"
                  href={`/fitness/clientes/${row.customer_id}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  {row.customer_name}
                </Link>
              </td>
              <td>
                {row.primary_product_id ? (
                  <Link
                    className="table-link"
                    href={`/fitness/produtos/${row.primary_product_id}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {row.product_summary || "Produto"}
                  </Link>
                ) : (
                  <span>{row.product_summary || "—"}</span>
                )}
              </td>
              <td>{formatDateOnly(row.quoted_on)}</td>
              <td>{formatDateOnly(row.valid_until)}</td>
              <td>{row.total_units}</td>
              <td>{formatCurrency(Number(row.total_amount ?? 0))}</td>
              <td>{statusLabel(row.status)}</td>
              <td>
                <div className="quote-row-actions" onClick={(event) => event.stopPropagation()}>
                  <a
                    className="icon-button"
                    href={`/api/fitness/orcamentos/${row.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir PDF"
                  >
                    <FileText size={16}/>
                  </a>
                  {row.sale_id && (
                    <Link
                      className="icon-button"
                      href={`/fitness/vendas/${row.sale_id}`}
                      title="Abrir venda convertida"
                    >
                      <ShoppingBag size={16}/>
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
