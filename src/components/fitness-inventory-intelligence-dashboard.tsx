"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleDollarSign,
  Search,
  Shirt,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

export type FitnessInventoryIntelligenceSummary = {
  total_variants: number;
  total_products: number;
  variants_with_stock: number;
  stock_cost_value: number;
  out_of_stock_variants: number;
  low_stock_variants: number;
  stagnant_variants_90d: number;
  stagnant_capital_90d: number;
  slow_variants_60d: number;
  excess_variants: number;
  excess_capital: number;
  consigned_units: number;
  overdue_consigned_units: number;
  overdue_consignments: number;
  action_variants: number;
  revenue_90d: number;
  profit_90d: number;
};

export type FitnessInventoryAbcSummary = {
  abc_class: string;
  products: number;
  revenue_90d: number;
  stock_cost_value: number;
  physical_units: number;
};

export type FitnessInventoryIntelligenceRow = {
  variant_id: string;
  product_id: string;
  product_name: string;
  category: string;
  image_url: string | null;
  size: string;
  color: string;
  sku: string | null;
  cost_price: number;
  sale_price: number;
  minimum_stock: number;
  reorder_target: number;
  default_supplier_id: string | null;
  default_supplier_name: string | null;
  physical_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  incoming_quantity: number;
  consigned_quantity: number;
  stock_cost_value: number;
  stock_sale_value: number;
  stock_status: string;
  operational_status: string;
  quantity_below_minimum: number;
  suggested_reorder_quantity: number;
  variant_created_at: string;
  variant_age_days: number;
  units_30d: number;
  units_60d: number;
  units_90d: number;
  revenue_90d: number;
  profit_90d: number;
  last_sale_on: string | null;
  days_since_last_sale: number | null;
  open_consigned_quantity: number;
  overdue_consigned_quantity: number;
  overdue_consignment_count: number;
  weighted_daily_demand: number;
  excess_units: number;
  excess_capital: number;
  coverage_days: number | null;
  slow_stock_60d: boolean;
  stagnant_stock_90d: boolean;
  abc_class: string;
  product_revenue_90d: number;
  product_revenue_share_pct: number;
  overstock: boolean;
  top_action: string;
  action_priority: number;
  stagnant_capital_90d: number;
};

export type FitnessInventoryIntelligenceSnapshot = {
  generated_at: string | null;
  summary: FitnessInventoryIntelligenceSummary;
  abc: FitnessInventoryAbcSummary[];
  rows: FitnessInventoryIntelligenceRow[];
};

function abcMeta(value: string) {
  if (value === "A") return { label: "A", color: "green" };
  if (value === "B") return { label: "B", color: "blue" };
  if (value === "C") return { label: "C", color: "yellow" };
  return { label: "Sem giro 90d", color: "gray" };
}

function actionMeta(row: FitnessInventoryIntelligenceRow) {
  if (row.top_action === "consignment_overdue") {
    return {
      label: "Prova atrasada",
      color: "red",
      note: `${row.overdue_consigned_quantity} peça(s) fora do prazo`,
      href: "/fitness/consignacoes",
    };
  }

  if (row.top_action === "stockout_critical") {
    return {
      label: "Ruptura crítica",
      color: "red",
      note: "Variação zerada com necessidade operacional",
      href: "/fitness/pedidos/novo",
    };
  }

  if (row.top_action === "reorder_attention") {
    return {
      label: "Repor variação",
      color: "orange",
      note: `${row.suggested_reorder_quantity} peça(s) sugerida(s)`,
      href: "/fitness/pedidos/novo",
    };
  }

  if (row.top_action === "stagnant") {
    return {
      label: "Estoque parado",
      color: "orange",
      note: `${formatCurrency(row.stagnant_capital_90d)} sem giro há 90+ dias`,
      href: "/fitness/estoque",
    };
  }

  if (row.top_action === "overstock") {
    return {
      label: "Excesso estimado",
      color: "yellow",
      note: `${row.excess_units} peça(s) · ${formatCurrency(row.excess_capital)}`,
      href: "/fitness/estoque",
    };
  }

  if (row.top_action === "slow") {
    return {
      label: "Giro lento",
      color: "purple",
      note: "Sem venda há 60+ dias",
      href: "/fitness/estoque",
    };
  }

  if (row.top_action === "consigned") {
    return {
      label: "Em prova",
      color: "blue",
      note: `${row.open_consigned_quantity} peça(s) com cliente`,
      href: "/fitness/consignacoes",
    };
  }

  return {
    label: "Sem ação imediata",
    color: "green",
    note: "Variação sem alerta prioritário",
    href: "/fitness/estoque",
  };
}

function lastSaleLabel(row: FitnessInventoryIntelligenceRow) {
  if (row.days_since_last_sale !== null) {
    return `${row.days_since_last_sale} dia(s)`;
  }

  if (row.variant_age_days < 60) {
    return `Variação nova · ${row.variant_age_days} dia(s)`;
  }

  return "Sem venda registrada";
}

export function FitnessInventoryIntelligenceDashboard({
  snapshot,
}: {
  snapshot: FitnessInventoryIntelligenceSnapshot;
}) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [abcFilter, setAbcFilter] = useState("all");

  const actionRows = snapshot.rows.filter(
    (row) => row.top_action !== "healthy",
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");

    return snapshot.rows.filter((row) => {
      if (actionFilter !== "all" && row.top_action !== actionFilter) {
        return false;
      }

      if (abcFilter !== "all" && row.abc_class !== abcFilter) {
        return false;
      }

      if (!query) return true;

      return `${row.product_name} ${row.category} ${row.color} ${row.size} ${
        row.default_supplier_name ?? ""
      }`
        .toLocaleLowerCase("pt-BR")
        .includes(query);
    });
  }, [snapshot.rows, search, actionFilter, abcFilter]);

  return (
    <>
      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon">
            <AlertTriangle size={19} />
          </span>
          <div>
            <span>Variações com ação</span>
            <strong>{snapshot.summary.action_variants}</strong>
            <small>
              {snapshot.summary.out_of_stock_variants} zerada(s) ·{" "}
              {snapshot.summary.low_stock_variants} baixa(s)
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <Shirt size={19} />
          </span>
          <div>
            <span>Peças em prova</span>
            <strong>{snapshot.summary.consigned_units}</strong>
            <small>
              {snapshot.summary.overdue_consigned_units} fora do prazo
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <TriangleAlert size={19} />
          </span>
          <div>
            <span>Excesso estimado</span>
            <strong>{snapshot.summary.excess_variants}</strong>
            <small>{formatCurrency(snapshot.summary.excess_capital)} acima do alvo</small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <CircleDollarSign size={19} />
          </span>
          <div>
            <span>Capital em estoque</span>
            <strong>{formatCurrency(snapshot.summary.stock_cost_value)}</strong>
            <small>{snapshot.summary.variants_with_stock} variação(ões) com saldo</small>
          </div>
        </article>
      </section>

      {snapshot.summary.overdue_consigned_units > 0 && (
        <article className="operation-home-alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Consignações fora do prazo</strong>
            <span>
              {snapshot.summary.overdue_consigned_units} peça(s) precisam de
              retorno ou acerto com o cliente.
            </span>
          </div>
          <Link className="button ghost compact-button" href="/fitness/consignacoes">
            Abrir consignações
          </Link>
        </article>
      )}

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>O que precisa de ação hoje</h2>
            <p>
              Variações zeradas, excesso, giro lento e peças em prova aparecem
              em uma fila única.
            </p>
          </div>
          <span className="badge orange">{actionRows.length} variação(ões)</span>
        </div>

        <div className="inventory-attention-list">
          {actionRows.slice(0, 12).map((row) => {
            const meta = actionMeta(row);

            return (
              <Link
                className="inventory-attention-row"
                href={meta.href}
                key={row.variant_id}
              >
                <TriangleAlert size={17} />

                <div>
                  <strong>{row.product_name}</strong>
                  <span>
                    {[row.color, row.size].filter(Boolean).join(" · ")} ·{" "}
                    {meta.note}
                  </span>
                </div>

                <span className={`badge ${meta.color}`}>
                  <span className="dot" />
                  {meta.label}
                </span>
              </Link>
            );
          })}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Curva ABC por produto · últimos 90 dias</h2>
            <p>
              A classificação usa o faturamento do produto completo; cor e
              tamanho permanecem separados apenas para decisão de estoque.
            </p>
          </div>
        </div>

        <div className="sale-stock-strip">
          {snapshot.abc.map((row) => {
            const meta = abcMeta(row.abc_class);

            return (
              <span key={row.abc_class}>
                <small>
                  <span className={`badge ${meta.color}`}>{meta.label}</span>
                </small>
                <strong>{row.products} produto(s)</strong>
                <small>{formatCurrency(row.revenue_90d)} faturados</small>
              </span>
            );
          })}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Mapa de peças e variações</h2>
            <p>
              Estoque físico, reservado, em prova, a caminho, giro e capital por
              cor e tamanho.
            </p>
          </div>
          <strong>{filteredRows.length}</strong>
        </div>

        <div className="inventory-toolbar">
          <label className="inventory-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar produto, cor, tamanho ou fornecedor"
            />
          </label>

          <select
            className="select inventory-status-filter"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
          >
            <option value="all">Todas as ações</option>
            <option value="consignment_overdue">Prova atrasada</option>
            <option value="stockout_critical">Ruptura crítica</option>
            <option value="reorder_attention">Repor variação</option>
            <option value="stagnant">Estoque parado</option>
            <option value="slow">Giro lento</option>
            <option value="overstock">Excesso</option>
            <option value="consigned">Em prova</option>
            <option value="healthy">Sem ação imediata</option>
          </select>

          <select
            className="select inventory-status-filter"
            value={abcFilter}
            onChange={(event) => setAbcFilter(event.target.value)}
          >
            <option value="all">Todas as classes ABC</option>
            <option value="A">Classe A</option>
            <option value="B">Classe B</option>
            <option value="C">Classe C</option>
            <option value="N">Sem faturamento 90d</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Peça</th>
                <th>ABC</th>
                <th>Estoque</th>
                <th>Em prova</th>
                <th>Giro 90d</th>
                <th>Última venda</th>
                <th>Capital</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => {
                const action = actionMeta(row);
                const abc = abcMeta(row.abc_class);

                return (
                  <tr key={row.variant_id}>
                    <td>
                      <strong>{row.product_name}</strong>
                      <small>
                        {[row.color, row.size, row.sku].filter(Boolean).join(" · ")}
                      </small>
                    </td>

                    <td>
                      <span className={`badge ${abc.color}`}>{abc.label}</span>
                      <small>
                        {row.product_revenue_share_pct.toFixed(1)}% do faturamento
                      </small>
                    </td>

                    <td>
                      <strong>{row.available_quantity} disponível</strong>
                      <small>
                        físico {row.physical_quantity} · reservado{" "}
                        {row.reserved_quantity} · a caminho {row.incoming_quantity}
                      </small>
                    </td>

                    <td>
                      <strong>{row.open_consigned_quantity}</strong>
                      {row.overdue_consigned_quantity > 0 && (
                        <small className="warning-text">
                          {row.overdue_consigned_quantity} atrasada(s)
                        </small>
                      )}
                    </td>

                    <td>
                      <strong>{row.units_90d} un.</strong>
                      <small>{formatCurrency(row.revenue_90d)}</small>
                    </td>

                    <td>
                      <strong>{lastSaleLabel(row)}</strong>
                    </td>

                    <td>
                      <strong>{formatCurrency(row.stock_cost_value)}</strong>
                      {row.overstock && (
                        <small className="warning-text">
                          excesso {formatCurrency(row.excess_capital)}
                        </small>
                      )}
                    </td>

                    <td>
                      <Link className="table-link" href={action.href}>
                        <span className={`badge ${action.color}`}>
                          <span className="dot" />
                          {action.label}
                        </span>
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
