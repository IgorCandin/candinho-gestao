"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  LoaderCircle,
  PackageCheck,
  ScanBarcode,
  Search,
  ShieldAlert,
  ShieldCheck,
  Tags,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export type LotSummary = {
  tracking_products: number;
  active_lots: number;
  tracked_units: number;
  expired_units: number;
  expires_30_units: number;
  expires_60_units: number;
  expires_90_units: number;
  quarantined_units: number;
  untracked_units: number;
  tracking_mismatches: number;
};

export type LotRow = {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  brand: string | null;
  flavor_id: string | null;
  flavor_name: string | null;
  location_id: string;
  location_code: string;
  location_name: string;
  lot_number: string;
  expires_on: string | null;
  received_on: string | null;
  unit_cost: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
  quantity_on_hand: number;
  status: string;
  notes: string | null;
  expiry_status: string;
  days_to_expiry: number | null;
  created_at: string;
  updated_at: string;
};

export type LotCoverageRow = {
  product_id: string;
  product_name: string;
  flavor_id: string | null;
  flavor_name: string | null;
  location_id: string;
  location_code: string;
  location_name: string;
  physical_quantity: number;
  tracked_quantity: number;
  untracked_quantity: number;
  tracking_difference: number;
  tracking_status: string;
};

export type LotProduct = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  lot_tracking_enabled: boolean;
  flavor_tracking_enabled: boolean;
  physical_quantity: number;
};

export type LotTrace = {
  lot_movement_id: string;
  lot_id: string | null;
  lot_number: string | null;
  expires_on: string | null;
  product_id: string;
  product_name: string;
  flavor_id: string | null;
  flavor_name: string | null;
  location_id: string;
  location_code: string;
  quantity_delta: number;
  allocation_kind: string;
  movement_type: string;
  sale_id: string | null;
  sale_at: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  transfer_group_id: string | null;
  created_at: string;
};

export type LotDashboardSnapshot = {
  generated_at: string | null;
  summary: LotSummary;
  lots: LotRow[];
  coverage: LotCoverageRow[];
  products: LotProduct[];
  recent_trace: LotTrace[];
};

function expiryMeta(status: string) {
  if (status === "expired") {
    return {
      label: "Vencido",
      color: "red",
    };
  }

  if (status === "quarantined") {
    return {
      label: "Quarentena",
      color: "orange",
    };
  }

  if (status === "expires_30") {
    return {
      label: "Vence em até 30d",
      color: "red",
    };
  }

  if (status === "expires_60") {
    return {
      label: "Vence em até 60d",
      color: "orange",
    };
  }

  if (status === "expires_90") {
    return {
      label: "Vence em até 90d",
      color: "yellow",
    };
  }

  return {
    label: "Validade ok",
    color: "green",
  };
}

function coverageMeta(status: string) {
  if (status === "mismatch") {
    return {
      label: "Divergência",
      color: "red",
    };
  }

  if (status === "legacy_untracked") {
    return {
      label: "Legado sem lote",
      color: "orange",
    };
  }

  if (status === "fully_tracked") {
    return {
      label: "100% rastreado",
      color: "green",
    };
  }

  return {
    label: "Sem estoque",
    color: "gray",
  };
}

function ActivateTracking({
  products,
}: {
  products: LotProduct[];
}) {
  const router = useRouter();
  const candidates = products.filter(
    (product) => !product.lot_tracking_enabled,
  );
  const [productId, setProductId] = useState(
    candidates[0]?.id ?? "",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function activate() {
    if (!productId) return;

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "set_product_lot_tracking",
        {
          p_product_id: productId,
          p_enabled: true,
        },
      );

      if (error) throw error;

      setMessage(
        "Rastreio ativado. O estoque atual ficou marcado como legado até você classificar os lotes.",
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível ativar o rastreio.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (candidates.length === 0) {
    return (
      <div className="empty">
        <ShieldCheck size={24} />
        <strong>
          Todos os produtos elegíveis já estão configurados
        </strong>
        O controle de lote está ativo nos produtos selecionados
        da operação.
      </div>
    );
  }

  return (
    <div className="panel-body form-grid-two">
      <label className="field field-span-two">
        <span>Produto</span>

        <select
          className="select"
          value={productId}
          onChange={(event) =>
            setProductId(event.target.value)
          }
        >
          {candidates.map((product) => (
            <option
              value={product.id}
              key={product.id}
            >
              {product.name}
              {product.physical_quantity > 0
                ? ` · ${product.physical_quantity} un. atuais`
                : ""}
            </option>
          ))}
        </select>

        <small>
          Ao ativar, os próximos recebimentos passam a exigir
          lote e validade. O estoque já existente não recebe
          lote inventado.
        </small>
      </label>

      <div className="field field-span-two">
        <button
          className="button gold"
          type="button"
          disabled={loading || !productId}
          onClick={activate}
        >
          {loading ? (
            <LoaderCircle
              className="spin"
              size={15}
            />
          ) : (
            <ShieldCheck size={15} />
          )}

          {loading
            ? "Ativando"
            : "Ativar controle de lote"}
        </button>

        {message && (
          <small className="form-message">
            {message}
          </small>
        )}
      </div>
    </div>
  );
}

function LegacyClassificationForm({
  row,
}: {
  row: LotCoverageRow;
}) {
  const router = useRouter();
  const [lotNumber, setLotNumber] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [quantity, setQuantity] = useState(
    String(row.untracked_quantity),
  );
  const [receivedOn, setReceivedOn] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "classify_legacy_inventory_lot",
        {
          p_product_id: row.product_id,
          p_location_id: row.location_id,
          p_flavor_id: row.flavor_id,
          p_lot_number: lotNumber.trim(),
          p_expires_on: expiresOn,
          p_quantity: Number(quantity),
          p_received_on: receivedOn || null,
          p_unit_cost: null,
          p_notes: notes.trim() || null,
        },
      );

      if (error) throw error;

      setLotNumber("");
      setExpiresOn("");
      setReceivedOn("");
      setNotes("");
      setMessage("Classificação registrada.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível classificar o lote.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <details>
      <summary className="button ghost compact-button">
        <ScanBarcode size={14} />
        Classificar estoque
      </summary>

      <form
        className="panel-body form-grid-two"
        onSubmit={submit}
      >
        <label className="field">
          <span>Lote</span>
          <input
            className="input"
            required
            value={lotNumber}
            onChange={(event) =>
              setLotNumber(event.target.value)
            }
            placeholder="Ex.: L240701"
          />
        </label>

        <label className="field">
          <span>Validade</span>
          <input
            className="input"
            type="date"
            required
            value={expiresOn}
            onChange={(event) =>
              setExpiresOn(event.target.value)
            }
          />
        </label>

        <label className="field">
          <span>Quantidade deste lote</span>
          <input
            className="input"
            type="number"
            min="1"
            max={row.untracked_quantity}
            required
            value={quantity}
            onChange={(event) =>
              setQuantity(event.target.value)
            }
          />
          <small>
            Restam {row.untracked_quantity} unidade(s) sem lote
            neste ponto.
          </small>
        </label>

        <label className="field">
          <span>Data de recebimento</span>
          <input
            className="input"
            type="date"
            value={receivedOn}
            onChange={(event) =>
              setReceivedOn(event.target.value)
            }
          />
          <small>Opcional para estoque antigo.</small>
        </label>

        <label className="field field-span-two">
          <span>Observação</span>
          <input
            className="input"
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Ex.: conferido fisicamente no pote"
          />
        </label>

        <div className="field field-span-two">
          <button
            className="button gold"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle
                className="spin"
                size={15}
              />
            ) : (
              <PackageCheck size={15} />
            )}

            {loading
              ? "Salvando"
              : "Registrar lote sem mover estoque"}
          </button>

          {message && (
            <small className="form-message">
              {message}
            </small>
          )}
        </div>
      </form>
    </details>
  );
}

function LotQuarantineAction({
  lot,
}: {
  lot: LotRow;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "set_inventory_lot_quarantine",
        {
          p_lot_id: lot.id,
          p_quarantined:
            lot.status !== "quarantined",
          p_notes:
            lot.status === "quarantined"
              ? "Quarentena liberada pela operação"
              : "Lote colocado em quarentena pela operação",
        },
      );

      if (error) throw error;

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="button ghost compact-button"
      type="button"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? (
        <LoaderCircle
          className="spin"
          size={14}
        />
      ) : lot.status === "quarantined" ? (
        <ShieldCheck size={14} />
      ) : (
        <ShieldAlert size={14} />
      )}

      {lot.status === "quarantined"
        ? "Liberar"
        : "Quarentena"}
    </button>
  );
}

export function LotInventoryManager({
  snapshot,
}: {
  snapshot: LotDashboardSnapshot;
}) {
  const [search, setSearch] = useState("");
  const [expiryFilter, setExpiryFilter] =
    useState("all");

  const lots = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("pt-BR");

    return snapshot.lots.filter((lot) => {
      if (
        expiryFilter !== "all" &&
        lot.expiry_status !== expiryFilter
      ) {
        return false;
      }

      if (!query) return true;

      return `${lot.product_name} ${
        lot.flavor_name ?? ""
      } ${lot.lot_number} ${lot.location_code} ${
        lot.supplier_name ?? ""
      }`
        .toLocaleLowerCase("pt-BR")
        .includes(query);
    });
  }, [snapshot.lots, search, expiryFilter]);

  const legacyRows = snapshot.coverage.filter(
    (row) =>
      row.tracking_status === "legacy_untracked" &&
      row.untracked_quantity > 0,
  );

  const mismatchRows = snapshot.coverage.filter(
    (row) => row.tracking_status === "mismatch",
  );

  return (
    <>
      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon">
            <ScanBarcode size={19} />
          </span>

          <div>
            <span>Produtos rastreados</span>
            <strong>
              {snapshot.summary.tracking_products}
            </strong>
            <small>
              {snapshot.summary.active_lots} lote(s) com saldo
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <CalendarClock size={19} />
          </span>

          <div>
            <span>Vence em até 30 dias</span>
            <strong>
              {snapshot.summary.expires_30_units}
            </strong>
            <small>
              {snapshot.summary.expired_units} unidade(s)
              já vencida(s)
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <AlertTriangle size={19} />
          </span>

          <div>
            <span>Estoque legado</span>
            <strong>
              {snapshot.summary.untracked_units}
            </strong>
            <small>
              Unidades ainda sem lote classificado
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <ShieldAlert size={19} />
          </span>

          <div>
            <span>Quarentena</span>
            <strong>
              {snapshot.summary.quarantined_units}
            </strong>
            <small>
              {snapshot.summary.tracking_mismatches} divergência(s)
              de rastreio
            </small>
          </div>
        </article>
      </section>

      {(snapshot.summary.expired_units > 0 ||
        mismatchRows.length > 0) && (
        <article className="operation-home-alert">
          <AlertTriangle size={18} />

          <div>
            <strong>
              Atenção operacional em lotes
            </strong>

            <span>
              {snapshot.summary.expired_units} unidade(s)
              vencida(s) · {mismatchRows.length} divergência(s)
              entre estoque físico e composição rastreada
            </span>
          </div>
        </article>
      )}

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Ativar rastreabilidade</h2>
            <p>
              Ative produto por produto. Nada existente recebe
              lote ou validade inventados.
            </p>
          </div>

          <ShieldCheck size={20} />
        </div>

        <ActivateTracking
          products={snapshot.products}
        />
      </article>

      {legacyRows.length > 0 && (
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Estoque antigo sem lote</h2>
              <p>
                Classifique o que já estava no estoque antes do
                V29. Essa ação não altera o saldo físico.
              </p>
            </div>

            <span className="badge orange">
              {legacyRows.reduce(
                (sum, row) =>
                  sum + row.untracked_quantity,
                0,
              )}{" "}
              un.
            </span>
          </div>

          <div className="inventory-attention-list">
            {legacyRows.map((row) => (
              <div
                className="inventory-attention-row"
                key={`${row.product_id}:${row.flavor_id ?? "none"}:${row.location_id}`}
              >
                <ScanBarcode size={17} />

                <div>
                  <strong>
                    {row.product_name}
                    {row.flavor_name
                      ? ` · ${row.flavor_name}`
                      : ""}
                  </strong>

                  <span>
                    {row.location_code} · físico{" "}
                    {row.physical_quantity} · rastreado{" "}
                    {row.tracked_quantity}
                  </span>
                </div>

                <div>
                  <strong>
                    {row.untracked_quantity} sem lote
                  </strong>

                  <LegacyClassificationForm
                    row={row}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Lotes em estoque</h2>
            <p>
              FEFO usa primeiro o lote válido com vencimento
              mais próximo. Lotes vencidos e em quarentena não
              entram na saída automática de vendas.
            </p>
          </div>

          <strong>{lots.length}</strong>
        </div>

        <div className="inventory-toolbar">
          <label className="inventory-search">
            <Search size={16} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar produto, lote, sabor, local ou fornecedor"
            />
          </label>

          <select
            className="select inventory-status-filter"
            value={expiryFilter}
            onChange={(event) =>
              setExpiryFilter(event.target.value)
            }
          >
            <option value="all">
              Todas as validades
            </option>
            <option value="expired">
              Vencidos
            </option>
            <option value="quarantined">
              Quarentena
            </option>
            <option value="expires_30">
              Até 30 dias
            </option>
            <option value="expires_60">
              Até 60 dias
            </option>
            <option value="expires_90">
              Até 90 dias
            </option>
            <option value="ok">
              Validade ok
            </option>
          </select>
        </div>

        {lots.length === 0 ? (
          <div className="empty">
            <ScanBarcode size={28} />
            <strong>
              Nenhum lote com saldo neste filtro
            </strong>
            Ative o rastreio de um produto e classifique o
            estoque atual, ou receba um novo pedido com lote e
            validade.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Lote</th>
                  <th>Validade</th>
                  <th>Local</th>
                  <th>Quantidade</th>
                  <th>Fornecedor</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {lots.map((lot) => {
                  const meta = expiryMeta(
                    lot.expiry_status,
                  );

                  return (
                    <tr key={lot.id}>
                      <td>
                        <Link
                          className="table-link"
                          href={`/estoque/lotes/${lot.id}`}
                        >
                          <strong>
                            {lot.product_name}
                          </strong>
                        </Link>

                        <small>
                          {[lot.flavor_name, lot.brand]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {lot.lot_number}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {lot.expires_on
                            ? formatDateOnly(
                                lot.expires_on,
                              )
                            : "Sem validade"}
                        </strong>

                        {lot.days_to_expiry !== null && (
                          <small>
                            {lot.days_to_expiry < 0
                              ? `${Math.abs(
                                  lot.days_to_expiry,
                                )} dia(s) vencido`
                              : `${lot.days_to_expiry} dia(s)`}
                          </small>
                        )}
                      </td>

                      <td>
                        {lot.location_code}
                      </td>

                      <td className="amount positive">
                        {lot.quantity_on_hand}
                      </td>

                      <td>
                        {lot.supplier_name ?? "—"}

                        {lot.unit_cost !== null && (
                          <small>
                            custo{" "}
                            {formatCurrency(
                              lot.unit_cost,
                            )}
                          </small>
                        )}
                      </td>

                      <td>
                        <span
                          className={`badge ${meta.color}`}
                        >
                          <span className="dot" />
                          {meta.label}
                        </span>
                      </td>

                      <td>
                        <div className="page-header-actions">
                          <Link
                            className="button ghost compact-button"
                            href={`/estoque/lotes/${lot.id}`}
                          >
                            Ver rastreio
                          </Link>

                          <LotQuarantineAction
                            lot={lot}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {snapshot.recent_trace.length > 0 && (
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Rastreabilidade recente</h2>
              <p>
                Últimas saídas ligadas a vendas. O lote aparece
                quando a unidade já fazia parte do estoque
                rastreado.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Lote</th>
                  <th>Cliente</th>
                  <th>Quantidade</th>
                  <th>Local</th>
                  <th>Venda</th>
                </tr>
              </thead>

              <tbody>
                {snapshot.recent_trace
                  .slice(0, 20)
                  .map((row) => (
                    <tr
                      key={row.lot_movement_id}
                    >
                      <td>
                        <strong>
                          {row.product_name}
                        </strong>

                        <small>
                          {row.flavor_name ?? ""}
                        </small>
                      </td>

                      <td>
                        {row.lot_number ??
                          "Estoque legado sem lote"}
                      </td>

                      <td>
                        {row.customer_name ??
                          "Cliente não identificado"}
                      </td>

                      <td>
                        {Math.abs(
                          row.quantity_delta,
                        )}
                      </td>

                      <td>
                        {row.location_code}
                      </td>

                      <td>
                        {row.sale_id ? (
                          <Link
                            className="table-link"
                            href={`/vendas/${row.sale_id}`}
                          >
                            Abrir venda
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </>
  );
}
