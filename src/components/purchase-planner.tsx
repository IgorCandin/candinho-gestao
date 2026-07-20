"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  PackagePlus,
  Search,
  Settings2,
  ShoppingCart,
  Tags,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type PlanningSummary = {
  critical_products: number;
  urgent_products: number;
  attention_products: number;
  suggested_products: number;
  suggested_units: number;
  suggested_investment: number;
  suggested_sale_value: number;
  suggested_potential_profit: number;
  without_supplier: number;
};

type PlanningRow = {
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
  minimum_order_amount: number;
  free_shipping_threshold: number;
  payment_terms: string | null;
  freight_notes: string | null;
  flavor_tracking_enabled: boolean;
  sold_30d: number;
  sold_60d: number;
  sold_90d: number;
  last_sale_at: string | null;
  sales_90d_count: number;
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
  estimated_order_sale_value: number;
  estimated_order_potential_profit: number;
  purchase_priority: string;
  estimated_stockout_on: string | null;
  days_since_last_sale: number | null;
  needs_flavor_distribution: boolean;
};

type SupplierPlanning = {
  id: string;
  name: string;
  notes: string | null;
  lead_time_days: number;
  target_cover_days: number;
  minimum_order_amount: number;
  free_shipping_threshold: number;
  payment_terms: string | null;
  freight_notes: string | null;
  suggested_products: number;
  suggested_units: number;
  suggested_order_cost: number;
  critical_products: number;
  urgent_products: number;
  gap_to_minimum_order: number;
  gap_to_free_shipping: number;
};

export type PurchasePlanningSnapshot = {
  generated_at: string | null;
  summary: PlanningSummary;
  rows: PlanningRow[];
  suppliers: SupplierPlanning[];
};

const PRIORITY_META: Record<
  string,
  { label: string; color: string; rank: number }
> = {
  critical: { label: "Crítico", color: "red", rank: 0 },
  urgent: { label: "Urgente", color: "orange", rank: 1 },
  attention: { label: "Atenção", color: "yellow", rank: 2 },
  monitor: { label: "Monitorar", color: "blue", rank: 3 },
  ok: { label: "Cobertura ok", color: "green", rank: 4 },
};

function priorityMeta(value: string) {
  return (
    PRIORITY_META[value] ?? {
      label: value,
      color: "gray",
      rank: 9,
    }
  );
}

function coverageLabel(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Sem giro recente";
  if (value <= 0) return "Sem cobertura";
  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} dias`;
}

function thresholdNote(
  threshold: number,
  gap: number,
  reachedLabel: string,
  missingLabel: string,
) {
  if (threshold <= 0) return "Não configurado";
  if (gap <= 0) return reachedLabel;
  return `${missingLabel} ${formatCurrency(gap)}`;
}

function SupplierSettings({
  supplier,
}: {
  supplier: SupplierPlanning;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const form = new FormData(event.currentTarget);
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "update_supplier_planning_settings",
        {
          p_supplier_id: supplier.id,
          p_lead_time_days: Number(form.get("lead_time_days") ?? 7),
          p_target_cover_days: Number(
            form.get("target_cover_days") ?? 30,
          ),
          p_minimum_order_amount: Number(
            form.get("minimum_order_amount") ?? 0,
          ),
          p_free_shipping_threshold: Number(
            form.get("free_shipping_threshold") ?? 0,
          ),
          p_payment_terms:
            String(form.get("payment_terms") ?? "").trim() ||
            null,
          p_freight_notes:
            String(form.get("freight_notes") ?? "").trim() ||
            null,
        },
      );

      if (error) throw error;

      setMessage("Configuração salva.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <details>
      <summary className="button ghost compact-button">
        <Settings2 size={14} />
        Configurar fornecedor
      </summary>

      <form
        className="panel-body form-grid-two"
        onSubmit={submit}
      >
        <label className="field">
          <span>Prazo médio de entrega</span>
          <input
            className="input"
            name="lead_time_days"
            type="number"
            min="0"
            max="365"
            defaultValue={supplier.lead_time_days}
          />
          <small>Dias entre o pedido e a chegada.</small>
        </label>

        <label className="field">
          <span>Cobertura alvo depois da chegada</span>
          <input
            className="input"
            name="target_cover_days"
            type="number"
            min="1"
            max="365"
            defaultValue={supplier.target_cover_days}
          />
          <small>
            Quantos dias de venda o estoque deve suportar.
          </small>
        </label>

        <label className="field">
          <span>Pedido mínimo</span>
          <input
            className="input"
            name="minimum_order_amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={supplier.minimum_order_amount}
          />
        </label>

        <label className="field">
          <span>Frete grátis a partir de</span>
          <input
            className="input"
            name="free_shipping_threshold"
            type="number"
            min="0"
            step="0.01"
            defaultValue={supplier.free_shipping_threshold}
          />
        </label>

        <label className="field">
          <span>Condição de pagamento</span>
          <input
            className="input"
            name="payment_terms"
            defaultValue={supplier.payment_terms ?? ""}
            placeholder="Ex.: Pix, 28 dias, 3x..."
          />
        </label>

        <label className="field">
          <span>Frete / observação logística</span>
          <input
            className="input"
            name="freight_notes"
            defaultValue={supplier.freight_notes ?? ""}
            placeholder="Ex.: frete calculado após orçamento"
          />
        </label>

        <div className="field field-span-two">
          <button
            className="button gold"
            type="submit"
            disabled={saving}
          >
            {saving ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Settings2 size={15} />
            )}
            {saving ? "Salvando" : "Salvar configuração"}
          </button>

          {message && (
            <small className="form-message">{message}</small>
          )}
        </div>
      </form>
    </details>
  );
}

export function PurchasePlanner({
  snapshot,
}: {
  snapshot: PurchasePlanningSnapshot;
}) {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const [onlySuggested, setOnlySuggested] = useState(true);

  const rows = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("pt-BR");

    return snapshot.rows
      .filter(
        (row) =>
          !onlySuggested ||
          row.suggested_order_quantity > 0,
      )
      .filter(
        (row) =>
          priority === "all" ||
          row.purchase_priority === priority,
      )
      .filter(
        (row) =>
          supplier === "all" ||
          (supplier === "none"
            ? !row.supplier_id
            : row.supplier_id === supplier),
      )
      .filter((row) => {
        if (!query) return true;

        return `${row.product_name} ${row.category} ${
          row.brand ?? ""
        } ${row.supplier_name ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(query);
      })
      .sort((a, b) => {
        return (
          priorityMeta(a.purchase_priority).rank -
            priorityMeta(b.purchase_priority).rank ||
          b.estimated_order_cost -
            a.estimated_order_cost ||
          a.product_name.localeCompare(
            b.product_name,
            "pt-BR",
          )
        );
      });
  }, [
    snapshot.rows,
    search,
    priority,
    supplier,
    onlySuggested,
  ]);

  const relevantSuppliers = [...snapshot.suppliers].sort(
    (a, b) =>
      Number(b.suggested_products > 0) -
        Number(a.suggested_products > 0) ||
      b.suggested_order_cost -
        a.suggested_order_cost ||
      a.name.localeCompare(b.name, "pt-BR"),
  );

  return (
    <>
      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon">
            <AlertTriangle size={19} />
          </span>
          <div>
            <span>Risco imediato</span>
            <strong>
              {snapshot.summary.critical_products}
            </strong>
            <small>
              Produtos críticos por falta ou demanda pendente
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <PackagePlus size={19} />
          </span>
          <div>
            <span>Sugestão de compra</span>
            <strong>
              {snapshot.summary.suggested_units} un.
            </strong>
            <small>
              {snapshot.summary.suggested_products} produto(s)
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <CircleDollarSign size={19} />
          </span>
          <div>
            <span>Investimento sugerido</span>
            <strong>
              {formatCurrency(
                snapshot.summary.suggested_investment,
              )}
            </strong>
            <small>
              Baseado no custo atual cadastrado
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <BrainCircuit size={19} />
          </span>
          <div>
            <span>Lucro potencial</span>
            <strong>
              {formatCurrency(
                snapshot.summary
                  .suggested_potential_profit,
              )}
            </strong>
            <small>
              Potencial bruto da reposição sugerida
            </small>
          </div>
        </article>
      </section>

      {snapshot.summary.without_supplier > 0 && (
        <article className="operation-home-alert">
          <AlertTriangle size={18} />
          <div>
            <strong>
              Há produtos sem fornecedor padrão
            </strong>
            <span>
              {snapshot.summary.without_supplier} produto(s)
              com sugestão de compra precisam ter fornecedor
              definido no cadastro do produto.
            </span>
          </div>
        </article>
      )}

      <section>
        <div className="section-heading">
          <div>
            <span>Condições comerciais</span>
            <h2>Planejamento por fornecedor</h2>
            <p>
              Configure prazo, cobertura alvo, pedido mínimo e
              frete grátis. O cálculo de reposição se adapta
              automaticamente.
            </p>
          </div>
        </div>

        <div className="inventory-location-grid">
          {relevantSuppliers.map((row) => (
            <article
              className="inventory-location-card"
              key={row.id}
            >
              <div className="inventory-location-card-head">
                <span className="inventory-location-icon">
                  <Truck size={19} />
                </span>

                <span>
                  <strong>{row.name}</strong>
                  <small>
                    Prazo {row.lead_time_days} dias · cobertura{" "}
                    {row.target_cover_days} dias
                  </small>
                </span>

                {(row.critical_products > 0 ||
                  row.urgent_products > 0) && (
                  <AlertTriangle size={17} />
                )}
              </div>

              <div className="inventory-location-numbers">
                <span>
                  <small>Produtos</small>
                  <b>{row.suggested_products}</b>
                </span>
                <span>
                  <small>Unidades</small>
                  <b>{row.suggested_units}</b>
                </span>
                <span>
                  <small>Sugestão</small>
                  <b>
                    {formatCurrency(
                      row.suggested_order_cost,
                    )}
                  </b>
                </span>
              </div>

              <div className="inventory-location-footer">
                <span>
                  Pedido mínimo:{" "}
                  {thresholdNote(
                    row.minimum_order_amount,
                    row.gap_to_minimum_order,
                    "atingido",
                    "faltam",
                  )}
                </span>
                <small>
                  Frete grátis:{" "}
                  {thresholdNote(
                    row.free_shipping_threshold,
                    row.gap_to_free_shipping,
                    "faixa atingida",
                    "faltam",
                  )}
                </small>
              </div>

              {(row.payment_terms ||
                row.freight_notes) && (
                <div className="inventory-location-alert">
                  {[row.payment_terms, row.freight_notes]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}

              <div className="page-header-actions">
                <Link
                  className="button gold compact-button"
                  href="/pedidos-fornecedor/novo"
                >
                  <ShoppingCart size={14} />
                  Criar pedido
                </Link>

                <SupplierSettings supplier={row} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Produtos para decisão de compra</h2>
            <p>
              A sugestão usa giro recente ponderado, estoque
              disponível, reservas, faltas pendentes, itens a
              caminho e prazo do fornecedor.
            </p>
          </div>

          <strong>{rows.length}</strong>
        </div>

        <div className="inventory-toolbar">
          <label className="inventory-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar produto, categoria, marca ou fornecedor"
            />
          </label>

          <select
            className="select inventory-status-filter"
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value)
            }
          >
            <option value="all">
              Todas as prioridades
            </option>
            <option value="critical">Críticos</option>
            <option value="urgent">Urgentes</option>
            <option value="attention">Atenção</option>
            <option value="monitor">Monitorar</option>
            <option value="ok">Cobertura ok</option>
          </select>

          <select
            className="select inventory-status-filter"
            value={supplier}
            onChange={(event) =>
              setSupplier(event.target.value)
            }
          >
            <option value="all">
              Todos os fornecedores
            </option>
            <option value="none">
              Sem fornecedor padrão
            </option>
            {snapshot.suppliers.map((row) => (
              <option
                value={row.id}
                key={row.id}
              >
                {row.name}
              </option>
            ))}
          </select>

          <label className="detail-with-icon">
            <input
              type="checkbox"
              checked={onlySuggested}
              onChange={(event) =>
                setOnlySuggested(event.target.checked)
              }
            />
            Só com compra sugerida
          </label>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Giro 30 / 60 / 90d</th>
                <th>Disponível</th>
                <th>A caminho</th>
                <th>Falta p/ vendas</th>
                <th>Cobertura</th>
                <th>Fornecedor</th>
                <th>Sugestão</th>
                <th>Investimento</th>
                <th>Prioridade</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const meta = priorityMeta(
                  row.purchase_priority,
                );

                return (
                  <tr key={row.product_id}>
                    <td>
                      <Link
                        className="table-link"
                        href={`/produtos/${row.product_id}`}
                      >
                        <strong>
                          {row.product_name}
                        </strong>
                      </Link>

                      <small>
                        {[row.category, row.brand]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>

                      {row.needs_flavor_distribution && (
                        <small>
                          <span className="badge blue">
                            <Tags size={11} />
                            Distribuir compra por sabor
                          </span>
                        </small>
                      )}
                    </td>

                    <td>
                      <strong>
                        {row.sold_30d} / {row.sold_60d} /{" "}
                        {row.sold_90d}
                      </strong>
                      <small>
                        vendas acumuladas por janela
                      </small>
                    </td>

                    <td>
                      <strong>
                        {row.available_quantity}
                      </strong>
                      <small>
                        físico {row.physical_quantity} ·
                        reservado {row.reserved_quantity}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {row.incoming_quantity}
                      </strong>
                    </td>

                    <td
                      className={
                        row.backlog_quantity > 0
                          ? "warning-text"
                          : ""
                      }
                    >
                      <strong>
                        {row.backlog_quantity}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {coverageLabel(
                          row.coverage_days,
                        )}
                      </strong>

                      {row.estimated_stockout_on && (
                        <small>
                          previsão de ruptura{" "}
                          {formatDateOnly(
                            row.estimated_stockout_on,
                          )}
                        </small>
                      )}
                    </td>

                    <td>
                      <strong>
                        {row.supplier_name ??
                          "Sem fornecedor"}
                      </strong>
                      <small>
                        prazo {row.lead_time_days}d · alvo{" "}
                        {row.target_cover_days}d
                      </small>
                    </td>

                    <td>
                      <strong>
                        {row.suggested_order_quantity} un.
                      </strong>
                      <small>
                        alvo operacional{" "}
                        {row.target_units}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {formatCurrency(
                          row.estimated_order_cost,
                        )}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`badge ${meta.color}`}
                      >
                        <span className="dot" />
                        {meta.label}
                      </span>

                      {row.purchase_priority ===
                        "critical" &&
                        row.backlog_quantity > 0 && (
                          <small>
                            há venda aguardando estoque
                          </small>
                        )}

                      {row.purchase_priority ===
                        "ok" &&
                        row.suggested_order_quantity >
                          0 && (
                          <small>
                            compra para cobertura alvo
                          </small>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="empty">
            <CheckCircle2 size={26} />
            <strong>
              Nenhum produto neste filtro
            </strong>
            Ajuste os filtros ou visualize também os produtos
            sem compra sugerida.
          </div>
        )}
      </article>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Como a sugestão é calculada</h2>
            <p>
              O sistema recomenda. A decisão final de compra
              continua sendo sua.
            </p>
          </div>
          <BrainCircuit size={20} />
        </div>

        <div className="panel-body sale-detail-list">
          <div className="sale-detail-line">
            <span>Giro recente</span>
            <strong>
              Mais peso para os últimos 30 dias
            </strong>
          </div>

          <div className="sale-detail-line">
            <span>Estoque considerado</span>
            <strong>
              Locais marcados para reposição
            </strong>
          </div>

          <div className="sale-detail-line">
            <span>Compromissos</span>
            <strong>
              Reservas e vendas aguardando estoque
            </strong>
          </div>

          <div className="sale-detail-line">
            <span>Compras existentes</span>
            <strong>
              Unidades já a caminho são descontadas
            </strong>
          </div>

          <div className="sale-detail-line">
            <span>Prazo</span>
            <strong>
              Lead time + cobertura alvo do fornecedor
            </strong>
          </div>

          <div className="sale-detail-line">
            <span>Produtos com sabores</span>
            <strong>
              Sugestão total; distribuição por sabor é explícita
            </strong>
          </div>
        </div>
      </article>
    </>
  );
}
