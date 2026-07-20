"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleDollarSign,
  Clock3,
  PackageSearch,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export type InventoryIntelligenceSummary = {
  total_products: number;
  products_with_stock: number;
  stock_cost_value: number;
  stagnant_products_90d: number;
  stagnant_capital_90d: number;
  slow_products_60d: number;
  excess_products: number;
  excess_capital: number;
  critical_products: number;
  urgent_products: number;
  attention_products: number;
  expired_units: number;
  expires_30_units: number;
  expires_60_units: number;
  expires_90_units: number;
  quarantined_units: number;
  action_products: number;
  abc_a: number;
  abc_b: number;
  abc_c: number;
  abc_n: number;
  revenue_90d: number;
  profit_90d: number;
};

export type InventoryAbcSummary = {
  abc_class: string;
  products: number;
  revenue_90d: number;
  stock_cost_value: number;
  physical_units: number;
};

export type InventoryIntelligenceRow = {
  product_id: string;
  product_name: string;
  category: string;
  brand: string | null;
  image_url: string | null;
  cost_price: number;
  sale_price: number;
  min_stock: number;
  ideal_stock: number;
  supplier_id: string | null;
  supplier_name: string | null;
  lead_time_days: number;
  target_cover_days: number;
  flavor_tracking_enabled: boolean;
  lot_tracking_enabled: boolean;
  product_created_at: string;
  product_age_days: number;
  physical_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  incoming_quantity: number;
  backlog_quantity: number;
  weighted_daily_demand: number;
  coverage_days: number | null;
  target_units: number;
  suggested_order_quantity: number;
  estimated_order_cost: number;
  purchase_priority: string;
  estimated_stockout_on: string | null;
  units_30d: number;
  units_90d: number;
  revenue_90d: number;
  profit_90d: number;
  last_sale_at_all: string | null;
  days_since_last_sale: number | null;
  expired_units: number;
  expires_30_units: number;
  expires_60_units: number;
  expires_90_units: number;
  quarantined_units: number;
  stock_cost_value: number;
  excess_units: number;
  excess_capital: number;
  total_revenue_90d: number;
  cumulative_revenue_90d: number;
  abc_class: string;
  revenue_share_pct: number;
  cumulative_revenue_share_pct: number;
  slow_stock_60d: boolean;
  stagnant_stock_90d: boolean;
  overstock: boolean;
  top_action: string;
  action_priority: number;
  stagnant_capital_90d: number;
};

export type InventoryIntelligenceSnapshot = {
  generated_at: string | null;
  summary: InventoryIntelligenceSummary;
  abc: InventoryAbcSummary[];
  rows: InventoryIntelligenceRow[];
};

function actionMeta(row: InventoryIntelligenceRow) {
  if (row.top_action === "expired") {
    return {
      label: "Retirar lote vencido",
      color: "red",
      note: `${row.expired_units} unidade(s) vencida(s)`,
      href: "/estoque/lotes",
    };
  }

  if (row.top_action === "expiry_30") {
    return {
      label: "Priorizar saída",
      color: "red",
      note: `${row.expires_30_units} unidade(s) vencem em até 30 dias`,
      href: "/estoque/lotes",
    };
  }

  if (row.top_action === "stockout_critical") {
    return {
      label: "Repor imediatamente",
      color: "red",
      note:
        row.backlog_quantity > 0
          ? `${row.backlog_quantity} unidade(s) aguardando estoque`
          : "Risco crítico de ruptura",
      href: "/pedidos-fornecedor/planejamento",
    };
  }

  if (row.top_action === "reorder_urgent") {
    return {
      label: "Comprar agora",
      color: "orange",
      note: "Cobertura menor ou igual ao prazo do fornecedor",
      href: "/pedidos-fornecedor/planejamento",
    };
  }

  if (row.top_action === "stagnant") {
    return {
      label: "Estoque parado",
      color: "orange",
      note: `${formatCurrency(row.stagnant_capital_90d)} sem giro há 90+ dias`,
      href: `/estoque/${row.product_id}`,
    };
  }

  if (row.top_action === "overstock") {
    return {
      label: "Excesso estimado",
      color: "yellow",
      note: `${row.excess_units} un. · ${formatCurrency(row.excess_capital)} acima do alvo`,
      href: `/estoque/${row.product_id}`,
    };
  }

  if (row.top_action === "reorder_attention") {
    return {
      label: "Programar compra",
      color: "yellow",
      note: "Cobertura entrou na faixa de atenção",
      href: "/pedidos-fornecedor/planejamento",
    };
  }

  if (row.top_action === "expiry_60") {
    return {
      label: "Planejar saída",
      color: "yellow",
      note: `${row.expires_60_units} unidade(s) vencem em até 60 dias`,
      href: "/estoque/lotes",
    };
  }

  if (row.top_action === "slow") {
    return {
      label: "Giro lento",
      color: "purple",
      note: "Sem venda há 60+ dias",
      href: `/estoque/${row.product_id}`,
    };
  }

  if (row.top_action === "expiry_90") {
    return {
      label: "Acompanhar validade",
      color: "blue",
      note: `${row.expires_90_units} unidade(s) vencem em até 90 dias`,
      href: "/estoque/lotes",
    };
  }

  return {
    label: "Sem ação imediata",
    color: "green",
    note: "Cobertura e giro sem alerta prioritário",
    href: `/estoque/${row.product_id}`,
  };
}

function abcMeta(value: string) {
  if (value === "A") return { label: "A", color: "green" };
  if (value === "B") return { label: "B", color: "blue" };
  if (value === "C") return { label: "C", color: "yellow" };
  return { label: "Sem giro 90d", color: "gray" };
}

function saleRecency(row: InventoryIntelligenceRow) {
  if (row.days_since_last_sale !== null) {
    return `${row.days_since_last_sale} dia(s)`;
  }

  if (row.product_age_days < 60) {
    return `Produto novo · ${row.product_age_days} dia(s)`;
  }

  return "Sem venda registrada";
}

export function InventoryIntelligenceDashboard({
  snapshot,
}: {
  snapshot: InventoryIntelligenceSnapshot;
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

      return `${row.product_name} ${row.category} ${row.brand ?? ""} ${
        row.supplier_name ?? ""
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
            <span>Exigem ação</span>
            <strong>{snapshot.summary.action_products}</strong>
            <small>
              {snapshot.summary.critical_products} crítico(s) ·{" "}
              {snapshot.summary.attention_products} em atenção
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <Clock3 size={19} />
          </span>

          <div>
            <span>Estoque parado 90d+</span>
            <strong>{snapshot.summary.stagnant_products_90d}</strong>
            <small>
              {formatCurrency(snapshot.summary.stagnant_capital_90d)} em custo
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <TriangleAlert size={19} />
          </span>

          <div>
            <span>Excesso estimado</span>
            <strong>{snapshot.summary.excess_products}</strong>
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
            <small>{snapshot.summary.products_with_stock} produto(s) com saldo</small>
          </div>
        </article>
      </section>

      {(snapshot.summary.expired_units > 0 ||
        snapshot.summary.expires_30_units > 0 ||
        snapshot.summary.quarantined_units > 0) && (
        <article className="operation-home-alert">
          <AlertTriangle size={18} />

          <div>
            <strong>Atenção em lotes</strong>
            <span>
              {snapshot.summary.expired_units} vencida(s) ·{" "}
              {snapshot.summary.expires_30_units} vencendo em 30 dias ·{" "}
              {snapshot.summary.quarantined_units} em quarentena
            </span>
          </div>

          <Link className="button ghost compact-button" href="/estoque/lotes">
            Abrir lotes
          </Link>
        </article>
      )}

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>O que precisa de ação hoje</h2>
            <p>
              Prioridade única por produto, sem duplicar o planejador de compras
              nem a gestão de lotes.
            </p>
          </div>

          <span className="badge orange">{actionRows.length} produto(s)</span>
        </div>

        {actionRows.length === 0 ? (
          <div className="empty">
            <PackageSearch size={28} />
            <strong>Nenhuma ação prioritária</strong>
            O estoque não possui alerta operacional relevante neste momento.
          </div>
        ) : (
          <div className="inventory-attention-list">
            {actionRows.slice(0, 12).map((row) => {
              const meta = actionMeta(row);

              return (
                <Link
                  className="inventory-attention-row"
                  href={meta.href}
                  key={row.product_id}
                >
                  <TriangleAlert size={17} />

                  <div>
                    <strong>{row.product_name}</strong>
                    <span>{meta.note}</span>
                  </div>

                  <div>
                    <span className={`badge ${meta.color}`}>
                      <span className="dot" />
                      {meta.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </article>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Curva ABC · faturamento dos últimos 90 dias</h2>
            <p>
              A = até 80% do faturamento acumulado · B = até 95% · C = restante.
              Produtos sem faturamento no período ficam separados.
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
            <h2>Mapa completo do estoque</h2>
            <p>
              Giro, cobertura, capital, excesso, ruptura, Curva ABC e validade
              em uma única leitura.
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
              placeholder="Buscar produto, categoria, marca ou fornecedor"
            />
          </label>

          <select
            className="select inventory-status-filter"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
          >
            <option value="all">Todas as ações</option>
            <option value="stockout_critical">Ruptura crítica</option>
            <option value="reorder_urgent">Compra urgente</option>
            <option value="reorder_attention">Programar compra</option>
            <option value="stagnant">Estoque parado</option>
            <option value="slow">Giro lento</option>
            <option value="overstock">Excesso</option>
            <option value="expired">Vencido</option>
            <option value="expiry_30">Vence em 30 dias</option>
            <option value="expiry_60">Vence em 60 dias</option>
            <option value="expiry_90">Vence em 90 dias</option>
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
                <th>Produto</th>
                <th>ABC</th>
                <th>Estoque</th>
                <th>Giro 90d</th>
                <th>Última venda</th>
                <th>Cobertura</th>
                <th>Capital</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => {
                const action = actionMeta(row);
                const abc = abcMeta(row.abc_class);

                return (
                  <tr key={row.product_id}>
                    <td>
                      <Link className="table-link" href={`/estoque/${row.product_id}`}>
                        <strong>{row.product_name}</strong>
                      </Link>
                      <small>
                        {[row.brand, row.category].filter(Boolean).join(" · ")}
                      </small>
                    </td>

                    <td>
                      <span className={`badge ${abc.color}`}>{abc.label}</span>
                      <small>{row.revenue_share_pct.toFixed(1)}% do faturamento</small>
                    </td>

                    <td>
                      <strong>{row.available_quantity} disponível</strong>
                      <small>
                        físico {row.physical_quantity} · reservado{" "}
                        {row.reserved_quantity} · a caminho {row.incoming_quantity}
                      </small>
                    </td>

                    <td>
                      <strong>{row.units_90d} un.</strong>
                      <small>{formatCurrency(row.revenue_90d)}</small>
                    </td>

                    <td>
                      <strong>{saleRecency(row)}</strong>
                      <small>
                        {row.last_sale_at_all
                          ? formatDateOnly(row.last_sale_at_all)
                          : "Sem data de venda"}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {row.coverage_days === null
                          ? "Sem giro calculável"
                          : `${row.coverage_days.toFixed(1)} dias`}
                      </strong>
                      <small>alvo {row.target_cover_days} dias</small>
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
                      {row.estimated_stockout_on && (
                        <small>
                          ruptura estimada {formatDateOnly(row.estimated_stockout_on)}
                        </small>
                      )}
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
