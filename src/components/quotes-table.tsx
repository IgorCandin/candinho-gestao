"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  FileDown,
  Search,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { QuoteRow } from "@/lib/types";

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "quoted", label: "Em orçamento" },
  { value: "expired", label: "Vencidos" },
  { value: "confirmed", label: "Confirmados" },
  { value: "lost", label: "Perdidos" },
  { value: "cancelled", label: "Cancelados" },
] as const;

export function QuotesTable({ quotes }: { quotes: QuoteRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");

    return quotes.filter((quote) => {
      const matchesStatus =
        status === "all" || quote.effective_status === status;

      const haystack =
        `${quote.quote_number} ${quote.customer_name} ${quote.product_summary}`.toLocaleLowerCase(
          "pt-BR",
        );

      return matchesStatus && (!normalized || haystack.includes(normalized));
    });
  }, [quotes, query, status]);

  const openQuote = (id: string) => router.push(`/orcamentos/${id}`);

  return (
    <>
      <div className="quote-toolbar">
        <label className="quote-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cliente, produto ou número"
          />
        </label>

        <div className="quote-filter-row">
          {FILTERS.map((filter) => (
            <button
              className={`quote-filter ${
                status === filter.value ? "active" : ""
              }`}
              type="button"
              key={filter.value}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <strong>Nenhum orçamento encontrado</strong>
          Ajuste a busca ou o filtro selecionado.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="quotes-table">
            <thead>
              <tr>
                <th>Orçamento</th>
                <th>Cliente</th>
                <th>Produtos</th>
                <th>Data</th>
                <th>Validade</th>
                <th>Situação</th>
                <th>Total</th>
                <th aria-label="Ações" />
              </tr>
            </thead>

            <tbody>
              {filtered.map((quote) => (
                <tr
                  key={quote.id}
                  className="clickable-data-row"
                  role="link"
                  tabIndex={0}
                  onClick={() => openQuote(quote.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openQuote(quote.id);
                    }
                  }}
                >
                  <td>
                    <Link
                      onClick={(event) => event.stopPropagation()}
                      className="cell-main table-link"
                      href={`/orcamentos/${quote.id}`}
                    >
                      #{quote.quote_number}
                    </Link>
                    <div className="cell-sub">
                      Estoque {quote.location_code}
                    </div>
                  </td>

                  <td>
                    <Link
                      onClick={(event) => event.stopPropagation()}
                      className="table-link detail-with-icon"
                      href={`/clientes/${quote.customer_id}`}
                    >
                      <UserRound size={14} />
                      {quote.customer_name}
                    </Link>
                  </td>

                  <td className="multiline">
                    <span>{quote.product_summary || "—"}</span>
                    {quote.gift_product_name && quote.gift_quantity > 0 && (
                      <small className="cell-sub">
                        Brinde: {quote.gift_product_name} ×{quote.gift_quantity}
                      </small>
                    )}
                  </td>

                  <td>{formatDateOnly(quote.quoted_on)}</td>
                  <td>{formatDateOnly(quote.valid_until)}</td>
                  <td>
                    <Badge value={quote.effective_status} />
                  </td>

                  <td className="amount">
                    <strong>{formatCurrency(quote.total_amount)}</strong>
                    {quote.discount_amount > 0 && (
                      <div className="cell-sub">
                        -{formatCurrency(quote.discount_amount)} desconto
                      </div>
                    )}
                  </td>

                  <td>
                    <div
                      className="quote-row-actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {quote.sale_id ? (
                        <Link
                          className="icon-link"
                          href={`/vendas/${quote.sale_id}`}
                          title="Abrir venda convertida"
                          aria-label={`Abrir venda convertida do orçamento ${quote.quote_number}`}
                        >
                          <ShoppingBag size={17} />
                        </Link>
                      ) : (
                        <Link
                          className="icon-link"
                          href={`/orcamentos/${quote.id}`}
                          title="Abrir orçamento"
                          aria-label={`Abrir orçamento ${quote.quote_number}`}
                        >
                          <Eye size={17} />
                        </Link>
                      )}

                      <a
                        className="icon-link"
                        href={`/api/orcamentos/${quote.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir PDF"
                        aria-label={`Abrir PDF do orçamento ${quote.quote_number}`}
                      >
                        <FileDown size={17} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
