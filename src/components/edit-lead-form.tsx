"use client";

import Link from "next/link";
import {
  Boxes,
  FilePenLine,
  LoaderCircle,
  Package,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type { CustomerOption, ProductOption } from "@/lib/types";

const STATUSES = [
  "Perguntou sobre",
  "Decidindo",
  "Está quase comprando",
  "Esperando receber",
  "Esperando pedido de fornecedor",
  "Cotação",
  "Aguardando",
] as const;

type FlavorOption = {
  id: string;
  productId: string;
  name: string;
};

type ComboItem = {
  productId: string;
  quantity: number;
};

type ComboOption = {
  id: string;
  name: string;
  description: string;
  salePrice: number;
  componentSummary: string;
  availableQuantity: number;
  stockStatus: string;
  items: ComboItem[];
};

type InitialLeadItem = {
  productId: string;
  flavorId: string;
  quantity: number;
};

type InterestMode = "product" | "combo";

export function EditLeadForm({
  leadId,
  customers,
  products,
  initialCustomerId,
  initialProductId,
  initialFlavorId,
  initialComboId,
  initialItems,
  initialStatus,
  initialNotes,
}: {
  leadId: string;
  customers: CustomerOption[];
  products: ProductOption[];
  initialCustomerId: string;
  initialProductId: string;
  initialFlavorId: string;
  initialComboId: string;
  initialItems: InitialLeadItem[];
  initialStatus: string;
  initialNotes: string;
}) {
  const router = useRouter();

  const [mode, setMode] = useState<InterestMode>(
    initialComboId ? "combo" : "product",
  );
  const [customerId, setCustomerId] =
    useState(initialCustomerId);
  const [productId, setProductId] =
    useState(initialProductId);
  const [flavorId, setFlavorId] =
    useState(initialFlavorId);
  const [comboId, setComboId] =
    useState(initialComboId);
  const [comboFlavors, setComboFlavors] = useState<
    Record<string, string>
  >(
    Object.fromEntries(
      initialItems
        .filter((item) => item.flavorId)
        .map((item) => [
          item.productId,
          item.flavorId,
        ]),
    ),
  );

  const [status, setStatus] = useState<
    (typeof STATUSES)[number]
  >(
    STATUSES.includes(
      initialStatus as (typeof STATUSES)[number],
    )
      ? (initialStatus as (typeof STATUSES)[number])
      : "Perguntou sobre",
  );

  const [notes, setNotes] =
    useState(initialNotes);
  const [flavors, setFlavors] = useState<
    FlavorOption[]
  >([]);
  const [combos, setCombos] = useState<
    ComboOption[]
  >([]);
  const [loadingOptions, setLoadingOptions] =
    useState(true);
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);

      const supabase = createClient();

      const [
        flavorResult,
        comboResult,
        comboItemResult,
      ] = await Promise.all([
        supabase
          .from("product_flavors")
          .select("id,product_id,name")
          .eq("active", true)
          .order("display_order")
          .order("name"),
        supabase
          .from("product_combo_overview")
          .select(
            "id,name,description,sale_price,component_summary,available_quantity,stock_status",
          )
          .eq("active", true)
          .order("name"),
        supabase
          .from("product_combo_items")
          .select(
            "combo_id,product_id,quantity,created_at",
          )
          .order("created_at"),
      ]);

      if (cancelled) return;

      const error =
        flavorResult.error ||
        comboResult.error ||
        comboItemResult.error;

      if (error) {
        setMessage(error.message);
        setLoadingOptions(false);
        return;
      }

      setFlavors(
        (flavorResult.data ?? []).map((row) => ({
          id: String(row.id),
          productId: String(row.product_id),
          name: String(row.name ?? ""),
        })),
      );

      const itemsByCombo = new Map<
        string,
        ComboItem[]
      >();

      for (const row of comboItemResult.data ?? []) {
        const combo = String(row.combo_id);
        const current =
          itemsByCombo.get(combo) ?? [];

        current.push({
          productId: String(row.product_id),
          quantity: Number(row.quantity ?? 1),
        });

        itemsByCombo.set(combo, current);
      }

      setCombos(
        (comboResult.data ?? []).map((row) => ({
          id: String(row.id),
          name: String(row.name ?? "Combo"),
          description:
            typeof row.description === "string"
              ? row.description
              : "",
          salePrice: Number(row.sale_price ?? 0),
          componentSummary:
            typeof row.component_summary === "string"
              ? row.component_summary
              : "",
          availableQuantity: Number(
            row.available_quantity ?? 0,
          ),
          stockStatus: String(
            row.stock_status ?? "",
          ),
          items:
            itemsByCombo.get(String(row.id)) ??
            [],
        })),
      );

      setLoadingOptions(false);
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const productFlavors = flavors.filter(
    (flavor) =>
      flavor.productId === productId,
  );

  const selectedCombo = useMemo(
    () =>
      combos.find(
        (combo) => combo.id === comboId,
      ) ?? null,
    [combos, comboId],
  );

  function flavorsFor(productId: string) {
    return flavors.filter(
      (flavor) =>
        flavor.productId === productId,
    );
  }

  function productName(id: string) {
    return (
      products.find(
        (product) => product.id === id,
      )?.name ?? "Produto"
    );
  }

  function switchMode(next: InterestMode) {
    setMode(next);
    setMessage(null);

    if (next === "product") {
      setComboId("");
      setComboFlavors({});
    } else {
      setProductId("");
      setFlavorId("");
    }
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!customerId) {
        throw new Error(
          "Selecione o cliente.",
        );
      }

      if (
        mode === "product" &&
        !productId
      ) {
        throw new Error(
          "Selecione o produto de interesse.",
        );
      }

      if (
        mode === "combo" &&
        !selectedCombo
      ) {
        throw new Error(
          "Selecione o combo de interesse.",
        );
      }

      const supabase = createClient();

      const { error } = await supabase.rpc(
        "update_lead_interest_v2",
        {
          p_lead_id: leadId,
          p_customer_id: customerId,
          p_product_id:
            mode === "product"
              ? productId
              : null,
          p_flavor_id:
            mode === "product"
              ? flavorId || null
              : null,
          p_combo_id:
            mode === "combo"
              ? selectedCombo?.id ?? null
              : null,
          p_combo_items:
            mode === "combo" &&
            selectedCombo
              ? selectedCombo.items.map(
                  (item) => ({
                    product_id:
                      item.productId,
                    flavor_id:
                      comboFlavors[
                        item.productId
                      ] || null,
                  }),
                )
              : [],
          p_lead_status: status,
          p_notes:
            notes.trim() || null,
        },
      );

      if (error) throw error;

      router.push(`/leads/${leadId}`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o lead.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="panel compact-form-panel"
      onSubmit={submit}
    >
      <div className="panel-head">
        <div>
          <h2>Editar lead</h2>
          <p>
            O interesse pode ser um produto
            individual ou um combo completo.
          </p>
        </div>
        <FilePenLine size={20} />
      </div>

      <div className="panel-body form-grid-two">
        <label className="field field-span-two">
          <span>Tipo de interesse</span>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            <button
              className={`button ${
                mode === "product"
                  ? "gold"
                  : "ghost"
              }`}
              type="button"
              onClick={() =>
                switchMode("product")
              }
            >
              <Package size={16} />
              Produto individual
            </button>

            <button
              className={`button ${
                mode === "combo"
                  ? "gold"
                  : "ghost"
              }`}
              type="button"
              onClick={() =>
                switchMode("combo")
              }
            >
              <Boxes size={16} />
              Combo
            </button>
          </div>
        </label>

        <label className="field">
          <span>Cliente</span>
          <select
            className="select"
            required
            value={customerId}
            onChange={(event) =>
              setCustomerId(
                event.target.value,
              )
            }
          >
            <option value="">
              Selecione o cliente
            </option>

            {customers.map(
              (customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.name}
                  {customer.city
                    ? ` · ${customer.city}`
                    : ""}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="field">
          <span>Status do lead</span>
          <select
            className="select"
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value as (typeof STATUSES)[number],
              )
            }
          >
            {STATUSES.map((value) => (
              <option key={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        {mode === "product" ? (
          <>
            <label className="field">
              <span>
                Produto de interesse
              </span>
              <select
                className="select"
                required
                value={productId}
                onChange={(event) => {
                  setProductId(
                    event.target.value,
                  );
                  setFlavorId("");
                }}
              >
                <option value="">
                  Selecione o produto
                </option>

                {products.map(
                  (product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            {productFlavors.length >
              0 && (
              <label className="field">
                <span>
                  Sabor de interesse
                </span>
                <select
                  className="select"
                  value={flavorId}
                  onChange={(event) =>
                    setFlavorId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Ainda não decidiu
                  </option>

                  {productFlavors.map(
                    (flavor) => (
                      <option
                        key={flavor.id}
                        value={flavor.id}
                      >
                        {flavor.name}
                      </option>
                    ),
                  )}
                </select>
              </label>
            )}
          </>
        ) : (
          <>
            <label className="field field-span-two">
              <span>
                Combo de interesse
              </span>

              <select
                className="select"
                required
                value={comboId}
                disabled={loadingOptions}
                onChange={(event) => {
                  setComboId(
                    event.target.value,
                  );
                  setComboFlavors({});
                }}
              >
                <option value="">
                  {loadingOptions
                    ? "Carregando combos..."
                    : "Selecione o combo"}
                </option>

                {combos.map((combo) => (
                  <option
                    key={combo.id}
                    value={combo.id}
                  >
                    {combo.name} ·{" "}
                    {formatCurrency(
                      combo.salePrice,
                    )}
                  </option>
                ))}
              </select>
            </label>

            {selectedCombo && (
              <div
                className="field-span-two"
                style={{
                  display: "grid",
                  gap: 10,
                  padding: 14,
                  border:
                    "1px solid var(--line)",
                  borderRadius: 14,
                  background:
                    "rgba(255,255,255,.018)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems:
                      "flex-start",
                    justifyContent:
                      "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>
                      {selectedCombo.name}
                    </strong>

                    <small
                      style={{
                        display: "block",
                        marginTop: 4,
                        color:
                          "var(--muted)",
                      }}
                    >
                      {selectedCombo.componentSummary ||
                        selectedCombo.description ||
                        `${selectedCombo.items.length} produto(s)`}
                    </small>
                  </div>

                  <strong>
                    {formatCurrency(
                      selectedCombo.salePrice,
                    )}
                  </strong>
                </div>

                {selectedCombo.items.map(
                  (item) => {
                    const itemFlavors =
                      flavorsFor(
                        item.productId,
                      );

                    return (
                      <div
                        key={
                          item.productId
                        }
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            itemFlavors.length >
                            0
                              ? "minmax(0,1fr) minmax(180px,.65fr)"
                              : "1fr",
                          gap: 9,
                          alignItems:
                            "center",
                          padding: "9px 0",
                          borderTop:
                            "1px solid var(--line)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {productName(
                            item.productId,
                          )}{" "}
                          ×{item.quantity}
                        </span>

                        {itemFlavors.length >
                          0 && (
                          <select
                            className="select"
                            value={
                              comboFlavors[
                                item
                                  .productId
                              ] ?? ""
                            }
                            onChange={(
                              event,
                            ) =>
                              setComboFlavors(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  [item.productId]:
                                    event
                                      .target
                                      .value,
                                }),
                              )
                            }
                          >
                            <option value="">
                              Sabor ainda não
                              decidido
                            </option>

                            {itemFlavors.map(
                              (
                                flavor,
                              ) => (
                                <option
                                  key={
                                    flavor.id
                                  }
                                  value={
                                    flavor.id
                                  }
                                >
                                  {
                                    flavor.name
                                  }
                                </option>
                              ),
                            )}
                          </select>
                        )}
                      </div>
                    );
                  },
                )}

                <small
                  style={{
                    color:
                      "var(--muted)",
                    lineHeight: 1.5,
                  }}
                >
                  Se algum sabor ainda não
                  estiver decidido, pode deixar
                  em branco. Ao converter o lead
                  em venda, o orçamento pedirá o
                  sabor antes da confirmação.
                </small>
              </div>
            )}
          </>
        )}

        <label className="field field-span-two">
          <span>Observações</span>
          <textarea
            className="textarea"
            rows={5}
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value,
              )
            }
            placeholder="Dúvidas, objetivo, mudança de produto, combo, sabor ou próximo passo."
          />
        </label>
      </div>

      <div className="form-footer">
        <Link
          className="button ghost"
          href={`/leads/${leadId}`}
        >
          Cancelar
        </Link>

        <button
          className="button gold"
          disabled={
            loading || loadingOptions
          }
        >
          {loading ? (
            <LoaderCircle
              className="spin"
              size={17}
            />
          ) : (
            <Save size={17} />
          )}
          {loading
            ? "Salvando..."
            : "Salvar alterações"}
        </button>
      </div>

      {message && (
        <p className="form-message">
          {message}
        </p>
      )}
    </form>
  );
}
