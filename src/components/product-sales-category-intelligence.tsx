"use client";

import {
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type ProductSalesCategoryIntelligenceRow = {
  product_id: string;
  product_name: string;
  brand: string | null;
  category: string;
  current_category: string;
  suggested_category: string;
  units_30d: number;
  units_90d: number;
  units_all: number;
  last_sale_at: string | null;
  company_quantity: number;
  min_stock: number;
  ideal_stock: number;
  classification_reason: string;
  stock_policy: string;
};

function formatDate(value: string | null) {
  if (!value) return "Sem venda registrada";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function ProductSalesCategoryIntelligence({
  rows,
  canUpdate,
}: {
  rows: ProductSalesCategoryIntelligenceRow[];
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const changed = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.current_category !== row.suggested_category,
      ),
    [rows],
  );

  const visible = showAll ? rows : changed;

  const counts = useMemo(
    () => ({
      A: rows.filter(
        (row) => row.suggested_category === "A",
      ).length,
      B: rows.filter(
        (row) => row.suggested_category === "B",
      ).length,
      C: rows.filter(
        (row) => row.suggested_category === "C",
      ).length,
      Z: rows.filter(
        (row) => row.suggested_category === "Z",
      ).length,
    }),
    [rows],
  );

  async function refreshCategories() {
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await createClient().rpc(
        "refresh_product_sales_categories",
      );

      if (error) throw error;

      const result =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {};

      setMessage(
        `${Number(result.updated ?? 0)} produto(s) atualizado(s). Curva atual: A ${Number(
          result.A ?? 0,
        )} · B ${Number(result.B ?? 0)} · C ${Number(
          result.C ?? 0,
        )} · Z ${Number(result.Z ?? 0)}.`,
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar as categorias.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="panel smart-abcz-panel">
      <div className="panel-head smart-abcz-head">
        <div>
          <h2>Giro inteligente · Curva A/B/C/Z</h2>
          <p>
            A classificação usa vendas recentes. Z e produtos
            restritos não são alterados automaticamente.
          </p>
        </div>

        {canUpdate && (
          <button
            className="button gold"
            type="button"
            disabled={loading}
            onClick={() => void refreshCategories()}
          >
            <RefreshCw
              className={loading ? "spin" : undefined}
              size={16}
            />
            {loading
              ? "Atualizando..."
              : "Atualizar categorias"}
          </button>
        )}
      </div>

      <div className="smart-abcz-policy-grid">
        <div>
          <strong>A</strong>
          <span>Alto giro</span>
          <small>
            Manter estoque. Reposição aparece quando restar 1 unidade.
          </small>
        </div>

        <div>
          <strong>B</strong>
          <span>Giro regular</span>
          <small>
            Pode zerar. Reposição aparece quando chegar a 0.
          </small>
        </div>

        <div>
          <strong>C</strong>
          <span>Sob encomenda</span>
          <small>
            Pode zerar sem urgência automática de compra.
          </small>
        </div>

        <div>
          <strong>Z</strong>
          <span>Especial</span>
          <small>
            Alternativo, restrito ou fora da reposição normal.
          </small>
        </div>
      </div>

      <div className="smart-abcz-summary">
        <span>
          Sugestão atual:
          <strong>A {counts.A}</strong>
          <strong>B {counts.B}</strong>
          <strong>C {counts.C}</strong>
          <strong>Z {counts.Z}</strong>
        </span>

        <button
          className="button ghost compact-button"
          type="button"
          onClick={() => setShowAll((current) => !current)}
        >
          {showAll
            ? `Mostrar somente mudanças (${changed.length})`
            : `Ver todos (${rows.length})`}
        </button>
      </div>

      {message && (
        <p className="smart-abcz-message">{message}</p>
      )}

      <div className="table-wrap">
        <table className="table smart-abcz-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Atual</th>
              <th>Sugerida</th>
              <th>30 dias</th>
              <th>90 dias</th>
              <th>Estoque</th>
              <th>Motivo / política</th>
            </tr>
          </thead>

          <tbody>
            {visible.map((row) => {
              const movingUp =
                row.suggested_category === "A" &&
                row.current_category !== "A";

              const movingDown =
                row.current_category === "A" &&
                row.suggested_category !== "A";

              return (
                <tr key={row.product_id}>
                  <td>
                    <strong>{row.product_name}</strong>
                    <small className="crm-cell-note">
                      {row.brand
                        ? `${row.brand} · ${row.category}`
                        : row.category}
                    </small>
                  </td>

                  <td>
                    <span className={`smart-abcz-badge curve-${row.current_category}`}>
                      {row.current_category}
                    </span>
                  </td>

                  <td>
                    <span className={`smart-abcz-badge curve-${row.suggested_category}`}>
                      {row.suggested_category}
                    </span>
                    {movingUp && (
                      <TrendingUp
                        className="smart-abcz-change up"
                        size={14}
                      />
                    )}
                    {movingDown && (
                      <TrendingDown
                        className="smart-abcz-change down"
                        size={14}
                      />
                    )}
                  </td>

                  <td>{row.units_30d}</td>
                  <td>{row.units_90d}</td>
                  <td>{row.company_quantity}</td>

                  <td>
                    <strong className="smart-abcz-reason">
                      {row.classification_reason}
                    </strong>
                    <small className="crm-cell-note">
                      {row.stock_policy} · Última venda:{" "}
                      {formatDate(row.last_sale_at)}
                    </small>
                  </td>
                </tr>
              );
            })}

            {visible.length === 0 && (
              <tr>
                <td colSpan={7}>
                  Nenhuma mudança sugerida. As categorias estão alinhadas ao giro atual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
