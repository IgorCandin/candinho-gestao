"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  History,
  LoaderCircle,
  PackageCheck,
  RefreshCcw,
  ShoppingBag,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

type MovementRow = {
  movement_id: string;
  occurred_at: string;
  movement_type: string;
  movement_label: string;
  quantity_delta: number;
  location_code: string | null;
  location_name: string | null;
  flavor_name: string | null;
  sale_id: string | null;
  customer_name: string | null;
  outflow_id: string | null;
  outflow_reason: string | null;
  counterpart_name: string | null;
  notes: string | null;
  historical_correction: boolean;
};

function productIdFromPath(pathname: string) {
  const match = pathname.match(
    /\/(?:suplementos\/)?produtos\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  return match?.[1] ?? null;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function toneFor(row: MovementRow) {
  if (row.quantity_delta > 0) return "green";
  if (row.outflow_id || row.historical_correction) return "orange";
  if (row.movement_type === "sale") return "blue";
  if (row.movement_type === "adjustment") return "gray";
  return row.quantity_delta < 0 ? "red" : "gray";
}

function IconFor({ row }: { row: MovementRow }) {
  if (row.outflow_id || row.historical_correction) {
    return <Gift size={15} />;
  }

  if (row.movement_type === "sale") {
    return <ShoppingBag size={15} />;
  }

  if (row.quantity_delta > 0) {
    return <ArrowDownLeft size={15} />;
  }

  if (row.quantity_delta < 0) {
    return <ArrowUpRight size={15} />;
  }

  return <History size={15} />;
}

export function ProductMovementPanelV4533({
  enabled = true,
}: {
  enabled?: boolean;
}) {
  const pathname = usePathname();
  const productId = useMemo(
    () => productIdFromPath(pathname),
    [pathname],
  );

  const [host, setHost] = useState<HTMLElement | null>(null);
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/products/${productId}/movements`,
        { cache: "no-store" },
      );

      const payload = (await response.json()) as {
        error?: string;
        rows?: MovementRow[];
      };

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Não foi possível carregar as movimentações.",
        );
      }

      setRows(payload.rows ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as movimentações.",
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!enabled || !productId) {
      setHost(null);
      return;
    }

    let currentHost: HTMLDivElement | null = null;

    function attach() {
      const content =
        document.querySelector<HTMLElement>(".main > .content");

      if (!content) return false;

      const existing =
        content.querySelector<HTMLDivElement>(
          "[data-product-movement-host-v4533]",
        );

      if (existing) {
        setHost(existing);
        return true;
      }

      currentHost = document.createElement("div");
      currentHost.dataset.productMovementHostV4533 = "true";
      content.appendChild(currentHost);
      setHost(currentHost);
      return true;
    }

    if (!attach()) {
      const observer = new MutationObserver(() => {
        if (attach()) observer.disconnect();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => {
        observer.disconnect();
        currentHost?.remove();
        setHost(null);
      };
    }

    return () => {
      currentHost?.remove();
      setHost(null);
    };
  }, [enabled, productId, pathname]);

  useEffect(() => {
    setRows([]);
    setMessage(null);

    if (enabled && productId) {
      void load();
    }
  }, [enabled, productId, load]);

  if (!enabled || !productId || !host) return null;

  const entries = rows
    .filter((row) => row.quantity_delta > 0)
    .reduce((sum, row) => sum + row.quantity_delta, 0);

  const exits = rows
    .filter((row) => row.quantity_delta < 0)
    .reduce((sum, row) => sum + Math.abs(row.quantity_delta), 0);

  const content = (
    <article className="panel product-movement-panel-v4533">
      <div className="panel-head">
        <div>
          <h2>
            <History size={18} />
            Movimentações do produto
          </h2>
          <p>
            Linha do tempo auditável: vendas, brindes, uso interno,
            ajustes, transferências, compras e cancelamentos.
          </p>
        </div>

        <button
          className="button ghost compact-button"
          type="button"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle className="spin" size={14} />
          ) : (
            <RefreshCcw size={14} />
          )}
          Atualizar
        </button>
      </div>

      <div className="product-movement-summary-v4533">
        <article>
          <ArrowDownLeft size={16} />
          <span>
            <small>Entradas no histórico</small>
            <strong>+{entries}</strong>
          </span>
        </article>
        <article>
          <ArrowUpRight size={16} />
          <span>
            <small>Saídas no histórico</small>
            <strong>-{exits}</strong>
          </span>
        </article>
        <article>
          <PackageCheck size={16} />
          <span>
            <small>Linhas exibidas</small>
            <strong>{rows.length}</strong>
          </span>
        </article>
      </div>

      {message ? (
        <div className="bank-empty-state">{message}</div>
      ) : loading && rows.length === 0 ? (
        <div className="bank-empty-state">
          <LoaderCircle className="spin" size={20} />
          Carregando movimentações...
        </div>
      ) : rows.length === 0 ? (
        <div className="bank-empty-state">
          Nenhuma movimentação encontrada para este produto.
        </div>
      ) : (
        <div className="table-wrap product-movement-table-v4533">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Qtd.</th>
                <th>Local</th>
                <th>Vínculo / destino</th>
                <th>Sabor</th>
                <th>Observação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const tone = toneFor(row);
                const quantity =
                  row.quantity_delta > 0
                    ? `+${row.quantity_delta}`
                    : String(row.quantity_delta);

                return (
                  <tr key={row.movement_id}>
                    <td>
                      <strong>{formatDateTime(row.occurred_at)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${tone}`}>
                        <IconFor row={row} />
                        {row.movement_label}
                      </span>
                      {row.historical_correction && (
                        <small className="crm-cell-note">
                          histórico corrigido
                        </small>
                      )}
                    </td>
                    <td
                      className={
                        row.quantity_delta > 0
                          ? "positive"
                          : row.quantity_delta < 0
                            ? "negative"
                            : ""
                      }
                    >
                      <strong>{quantity}</strong>
                    </td>
                    <td>
                      <strong>{row.location_code ?? "—"}</strong>
                      <small className="crm-cell-note">
                        {row.location_name ?? ""}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {row.counterpart_name ??
                          row.customer_name ??
                          "—"}
                      </strong>
                    </td>
                    <td>{row.flavor_name ?? "—"}</td>
                    <td>
                      <span className="table-note">
                        {row.notes ?? "—"}
                      </span>
                    </td>
                    <td>
                      {row.sale_id ? (
                        <Link
                          className="button ghost compact-button"
                          href={`/suplementos/vendas/${row.sale_id}`}
                        >
                          Venda
                        </Link>
                      ) : row.outflow_id ? (
                        <Link
                          className="button ghost compact-button"
                          href="/suplementos/saidas"
                        >
                          Saída
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );

  return createPortal(content, host);
}
