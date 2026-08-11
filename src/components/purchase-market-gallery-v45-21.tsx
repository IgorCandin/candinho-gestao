/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckSquare2,
  CircleDollarSign,
  Clock3,
  History,
  PackageCheck,
  PackagePlus,
  Search,
  ShoppingCart,
  Square,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { PurchasePlanningSnapshot } from "@/components/purchase-planner";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type PlanningRow = PurchasePlanningSnapshot["rows"][number];

export type PurchaseLastCostV4521 = {
  cost: number | null;
  purchased_on: string | null;
};

export type PurchaseLeadSignalV4521 = {
  leads_30d: number;
  leads_90d: number;
  last_lead_at: string | null;
};

export type PurchaseSupplierHistoryV4521 = {
  supplier_id: string;
  supplier_name: string;
  product_id: string;
  product_name: string;
  unit_cost: number;
  ordered_on: string;
};

type Tab = "market" | "suppliers";

function priorityLabel(value: string) {
  if (value === "critical") return "Risco imediato";
  if (value === "urgent") return "Urgente";
  if (value === "attention") return "Atenção";
  if (value === "monitor") return "Monitorar";
  return "Cobertura ok";
}

function priorityRank(value: string) {
  if (value === "critical") return 0;
  if (value === "urgent") return 1;
  if (value === "attention") return 2;
  if (value === "monitor") return 3;
  return 4;
}

function demandScore(
  row: PlanningRow,
  lead: PurchaseLeadSignalV4521 | undefined,
) {
  const zeroBoost = row.available_quantity <= 0 ? 70 : 0;
  const backlogBoost = Math.max(0, row.backlog_quantity) * 120;
  const leadBoost =
    (lead?.leads_30d ?? 0) * 42 +
    (lead?.leads_90d ?? 0) * 10;
  const salesBoost = row.sold_30d * 18 + row.sold_90d * 5;
  const priorityBoost =
    row.purchase_priority === "critical"
      ? 180
      : row.purchase_priority === "urgent"
        ? 140
        : row.purchase_priority === "attention"
          ? 90
          : row.purchase_priority === "monitor"
            ? 30
            : 0;

  return (
    priorityBoost +
    backlogBoost +
    zeroBoost +
    leadBoost +
    salesBoost
  );
}

function normalized(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function PurchaseMarketGalleryV4521({
  snapshot,
  lastCosts,
  leadSignals,
  supplierHistory,
}: {
  snapshot: PurchasePlanningSnapshot;
  lastCosts: Record<string, PurchaseLastCostV4521>;
  leadSignals: Record<string, PurchaseLeadSignalV4521>;
  supplierHistory: PurchaseSupplierHistoryV4521[];
}) {
  const [tab, setTab] = useState<Tab>("market");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const rankedRows = useMemo(
    () =>
      [...snapshot.rows].sort((a, b) => {
        const priority =
          priorityRank(a.purchase_priority) -
          priorityRank(b.purchase_priority);
        if (priority !== 0) return priority;

        const score =
          demandScore(b, leadSignals[b.product_id]) -
          demandScore(a, leadSignals[a.product_id]);
        if (score !== 0) return score;

        return a.product_name.localeCompare(b.product_name, "pt-BR");
      }),
    [snapshot.rows, leadSignals],
  );

  const filteredRows = useMemo(() => {
    const q = normalized(query.trim());
    if (!q) return rankedRows;

    return rankedRows.filter((row) =>
      normalized(
        `${row.product_name} ${row.brand ?? ""} ${row.category}`,
      ).includes(q),
    );
  }, [rankedRows, query]);

  const brandGroups = useMemo(() => {
    const map = new Map<string, PlanningRow[]>();

    for (const row of filteredRows) {
      const brand = row.brand?.trim() || "Sem marca";
      const current = map.get(brand) ?? [];
      current.push(row);
      map.set(brand, current);
    }

    return [...map.entries()]
      .map(([brand, rows]) => ({
        brand,
        rows,
        score: Math.max(
          ...rows.map((row) =>
            demandScore(row, leadSignals[row.product_id]),
          ),
        ),
        urgent: rows.filter(
          (row) => row.purchase_priority === "critical",
        ).length,
      }))
      .sort(
        (a, b) =>
          b.urgent - a.urgent ||
          b.score - a.score ||
          a.brand.localeCompare(b.brand, "pt-BR"),
      );
  }, [filteredRows, leadSignals]);

  const supplierGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        rows: PurchaseSupplierHistoryV4521[];
      }
    >();

    for (const row of supplierHistory) {
      const key = row.supplier_id || row.supplier_name;
      const current = map.get(key) ?? {
        id: row.supplier_id,
        name: row.supplier_name,
        rows: [],
      };
      current.rows.push(row);
      map.set(key, current);
    }

    return [...map.values()]
      .map((group) => {
        const latestByProduct = new Map<
          string,
          PurchaseSupplierHistoryV4521
        >();

        for (const row of [...group.rows].sort((a, b) =>
          b.ordered_on.localeCompare(a.ordered_on),
        )) {
          if (!latestByProduct.has(row.product_id)) {
            latestByProduct.set(row.product_id, row);
          }
        }

        return {
          ...group,
          products: [...latestByProduct.values()],
          lastOrder:
            group.rows
              .map((row) => row.ordered_on)
              .sort()
              .at(-1) ?? null,
        };
      })
      .sort((a, b) =>
        (b.lastOrder ?? "").localeCompare(a.lastOrder ?? ""),
      );
  }, [supplierHistory]);

  function toggle(productId: string) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  const orderHref = selectedIds.length
    ? `/suplementos/pedidos-fornecedor/novo?produtos=${encodeURIComponent(
        selectedIds.join(","),
      )}`
    : "/suplementos/pedidos-fornecedor/novo";

  return (
    <div className="v4521-purchase-planner">
      <section className="v4521-purchase-summary">
        <article>
          <AlertTriangle size={18} />
          <span>Risco imediato</span>
          <strong>{snapshot.summary.critical_products}</strong>
          <small>Ruptura de alto giro ou demanda aguardando</small>
        </article>

        <article>
          <PackagePlus size={18} />
          <span>Sugestão de compra</span>
          <strong>{snapshot.summary.suggested_units} un.</strong>
          <small>
            {snapshot.summary.suggested_products} produto(s)
          </small>
        </article>

        <article>
          <CircleDollarSign size={18} />
          <span>Investimento sugerido</span>
          <strong>
            {formatCurrency(snapshot.summary.suggested_investment)}
          </strong>
          <small>Somente urgência compatível com o caixa atual</small>
        </article>

        <article>
          <TrendingUp size={18} />
          <span>Lucro potencial</span>
          <strong>
            {formatCurrency(
              snapshot.summary.suggested_potential_profit,
            )}
          </strong>
          <small>Potencial bruto da reposição sugerida</small>
        </article>
      </section>

      <section className="panel v4521-purchase-workspace">
        <div className="v4521-purchase-toolbar">
          <div>
            <span className="eyebrow">Comprar como você compra</span>
            <h2>Mercado, demanda e oportunidade</h2>
            <p>
              Primeiro veja o que está pedindo reposição e agrupe por
              marca. Fornecedor entra depois, quando você encontrar a
              condição boa do dia.
            </p>
          </div>

          <div className="v4521-planner-tabs" role="tablist">
            <button
              className={tab === "market" ? "active" : ""}
              type="button"
              onClick={() => setTab("market")}
            >
              <ShoppingCart size={15} />
              Mercado e demanda
            </button>
            <button
              className={tab === "suppliers" ? "active" : ""}
              type="button"
              onClick={() => setTab("suppliers")}
            >
              <History size={15} />
              Fornecedores
            </button>
          </div>
        </div>

        {tab === "market" ? (
          <>
            <div className="v4521-market-controls">
              <label>
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Busque DARK LAB, Growth, whey, creatina..."
                />
              </label>

              <div className="v4521-selection-summary">
                <span>
                  <strong>{selectedIds.length}</strong> selecionado(s)
                </span>
                <Link
                  className={`button gold ${
                    selectedIds.length ? "" : "disabled"
                  }`}
                  href={orderHref}
                >
                  <ShoppingCart size={16} />
                  {selectedIds.length
                    ? "Montar pedido"
                    : "Novo pedido"}
                </Link>
              </div>
            </div>

            <div className="v4521-brand-sections">
              {brandGroups.map((group) => (
                <section
                  className="v4521-brand-section"
                  key={group.brand}
                >
                  <header>
                    <div>
                      <span>Marca</span>
                      <h3>{group.brand}</h3>
                    </div>
                    <small>
                      {group.rows.length} produto(s)
                      {group.urgent > 0
                        ? ` · ${group.urgent} crítico(s)`
                        : ""}
                    </small>
                  </header>

                  <div className="v4521-product-gallery">
                    {group.rows.map((row) => {
                      const lead = leadSignals[row.product_id];
                      const lastCost = lastCosts[row.product_id];
                      const selected = selectedIds.includes(
                        row.product_id,
                      );
                      const currentVsLast =
                        lastCost?.cost && lastCost.cost > 0
                          ? row.cost_price - lastCost.cost
                          : null;

                      return (
                        <article
                          className={`v4521-purchase-product-card ${
                            selected ? "selected" : ""
                          }`}
                          key={row.product_id}
                        >
                          <button
                            className="v4521-select-product"
                            type="button"
                            onClick={() => toggle(row.product_id)}
                            aria-label={
                              selected
                                ? `Remover ${row.product_name}`
                                : `Selecionar ${row.product_name}`
                            }
                          >
                            {selected ? (
                              <CheckSquare2 size={18} />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>

                          <div className="v4521-purchase-product-image">
                            {row.image_url ? (
                              <img
                                src={row.image_url}
                                alt=""
                                loading="lazy"
                              />
                            ) : (
                              <PackageCheck size={28} />
                            )}
                          </div>

                          <div className="v4521-purchase-product-copy">
                            <span
                              className={`badge ${
                                row.purchase_priority === "critical"
                                  ? "red"
                                  : row.purchase_priority ===
                                      "attention"
                                    ? "orange"
                                    : row.purchase_priority ===
                                        "monitor"
                                      ? "blue"
                                      : "green"
                              }`}
                            >
                              {priorityLabel(
                                row.purchase_priority,
                              )}
                            </span>

                            <h4>{row.product_name}</h4>
                            <small>{row.category}</small>
                          </div>

                          <div className="v4521-demand-grid">
                            <span>
                              <PackageCheck size={13} />
                              Disponível
                              <strong>
                                {row.available_quantity}
                              </strong>
                            </span>
                            <span>
                              <PackagePlus size={13} />
                              A caminho
                              <strong>
                                {row.incoming_quantity}
                              </strong>
                            </span>
                            <span>
                              <TrendingUp size={13} />
                              Vendas 30d
                              <strong>{row.sold_30d}</strong>
                            </span>
                            <span>
                              <UsersRound size={13} />
                              Leads 30d
                              <strong>{lead?.leads_30d ?? 0}</strong>
                            </span>
                          </div>

                          {(row.backlog_quantity > 0 ||
                            (lead?.leads_90d ?? 0) > 0) && (
                            <div className="v4521-demand-reason">
                              {row.backlog_quantity > 0 && (
                                <strong>
                                  {row.backlog_quantity} venda(s)
                                  aguardando
                                </strong>
                              )}
                              {(lead?.leads_90d ?? 0) > 0 && (
                                <span>
                                  {lead?.leads_90d} lead(s) em 90d
                                  {lead?.last_lead_at
                                    ? ` · último ${formatDateOnly(
                                        lead.last_lead_at,
                                      )}`
                                    : ""}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="v4521-cost-compare">
                            <span>
                              Custo cadastrado
                              <strong>
                                {formatCurrency(row.cost_price)}
                              </strong>
                            </span>
                            <span>
                              Último custo
                              <strong>
                                {lastCost?.cost
                                  ? formatCurrency(lastCost.cost)
                                  : "Sem histórico"}
                              </strong>
                            </span>
                            {currentVsLast !== null && (
                              <small
                                className={
                                  currentVsLast > 0
                                    ? "warning-text"
                                    : "positive"
                                }
                              >
                                {currentVsLast > 0 ? "+" : ""}
                                {formatCurrency(currentVsLast)} vs.
                                última compra
                              </small>
                            )}
                          </div>

                          <div className="v4521-card-footer">
                            <Link
                              href={`/suplementos/produtos/${row.product_id}`}
                            >
                              Ver produto
                            </Link>
                            {row.suggested_order_quantity > 0 && (
                              <strong>
                                Nexus sugere{" "}
                                {row.suggested_order_quantity} un.
                              </strong>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}

              {brandGroups.length === 0 && (
                <div className="empty-state">
                  Nenhum produto encontrado para essa busca.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="v4521-supplier-history">
            <div className="v4521-supplier-history-intro">
              <Building2 size={20} />
              <div>
                <strong>Histórico por fornecedor</strong>
                <span>
                  Use como memória de onde você já comprou e por
                  quanto. O pedido não precisa nascer daqui.
                </span>
              </div>
              <Link
                className="button ghost compact-button"
                href="/suplementos/fornecedores"
              >
                Configurar fornecedores
              </Link>
            </div>

            <div className="v4521-supplier-history-grid">
              {supplierGroups.map((supplier) => {
                const planning = snapshot.suppliers.find(
                  (row) => row.id === supplier.id,
                );

                return (
                  <article key={supplier.id || supplier.name}>
                    <header>
                      <div>
                        <span>Fornecedor</span>
                        <h3>{supplier.name}</h3>
                      </div>
                      <small>
                        {supplier.lastOrder
                          ? `Último pedido ${formatDateOnly(
                              supplier.lastOrder,
                            )}`
                          : "Sem data"}
                      </small>
                    </header>

                    {planning && (
                      <div className="v4521-supplier-terms">
                        <span>
                          <Clock3 size={13} />
                          {planning.lead_time_days} dias
                        </span>
                        <span>
                          Pedido mínimo{" "}
                          <strong>
                            {planning.minimum_order_amount > 0
                              ? formatCurrency(
                                  planning.minimum_order_amount,
                                )
                              : "não configurado"}
                          </strong>
                        </span>
                        <span>
                          Frete grátis{" "}
                          <strong>
                            {planning.free_shipping_threshold > 0
                              ? formatCurrency(
                                  planning.free_shipping_threshold,
                                )
                              : "não configurado"}
                          </strong>
                        </span>
                      </div>
                    )}

                    <div className="v4521-supplier-products">
                      {supplier.products.slice(0, 12).map((row) => (
                        <div key={row.product_id}>
                          <span>{row.product_name}</span>
                          <strong>
                            {formatCurrency(row.unit_cost)}
                          </strong>
                          <small>
                            {formatDateOnly(row.ordered_on)}
                          </small>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}

              {supplierGroups.length === 0 && (
                <div className="empty-state">
                  Ainda não há histórico de compra por fornecedor.
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
