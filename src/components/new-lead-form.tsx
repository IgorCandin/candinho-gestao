"use client";

import Link from "next/link";
import {
  Boxes,
  CalendarClock,
  LoaderCircle,
  Package,
  Save,
  UserRoundPlus,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type {
  CustomerOption,
  ProductOption,
} from "@/lib/types";

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

type InterestMode =
  | "product"
  | "combo";

function defaultFollowupDate() {
  const date = new Date();
  date.setDate(
    date.getDate() + 2,
  );

  const year =
    date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function looksLikeStockWait(
  status: string,
  notes: string,
) {
  if (
    status ===
    "Esperando pedido de fornecedor"
  ) {
    return true;
  }

  const normalized =
    notes
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .toLowerCase();

  return /(estoque|cheg|quando.{0,20}entr|reposi|pedido.{0,20}fornecedor)/i.test(
    normalized,
  );
}

export function NewLeadForm({
  customers,
  products,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
}) {
  const router = useRouter();

  const [mode, setMode] =
    useState<InterestMode>(
      "product",
    );
  const [
    customerId,
    setCustomerId,
  ] = useState("");
  const [
    productId,
    setProductId,
  ] = useState("");
  const [
    flavorId,
    setFlavorId,
  ] = useState("");
  const [
    comboId,
    setComboId,
  ] = useState("");
  const [
    comboFlavors,
    setComboFlavors,
  ] = useState<
    Record<string, string>
  >({});
  const [
    status,
    setStatus,
  ] = useState<
    (typeof STATUSES)[number]
  >("Perguntou sobre");
  const [notes, setNotes] =
    useState("");
  const [
    followupOn,
    setFollowupOn,
  ] = useState(
    defaultFollowupDate(),
  );
  const [
    loading,
    setLoading,
  ] = useState(false);
  const [
    loadingOptions,
    setLoadingOptions,
  ] = useState(true);
  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);
  const [
    flavors,
    setFlavors,
  ] = useState<
    FlavorOption[]
  >([]);
  const [combos, setCombos] =
    useState<ComboOption[]>(
      [],
    );

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);

      const supabase =
        createClient();

      const [
        flavorResult,
        comboResult,
        comboItemResult,
      ] = await Promise.all([
        supabase
          .from(
            "product_flavors",
          )
          .select(
            "id,product_id,name",
          )
          .eq("active", true)
          .order(
            "display_order",
          )
          .order("name"),

        supabase
          .from(
            "product_combo_overview",
          )
          .select(
            "id,name,description,sale_price,component_summary,available_quantity,stock_status",
          )
          .eq("active", true)
          .order("name"),

        supabase
          .from(
            "product_combo_items",
          )
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
        setMessage(
          error.message,
        );
        setLoadingOptions(
          false,
        );
        return;
      }

      setFlavors(
        (
          flavorResult.data ??
          []
        ).map((row) => ({
          id: String(row.id),
          productId: String(
            row.product_id,
          ),
          name: String(
            row.name ?? "",
          ),
        })),
      );

      const itemsByCombo =
        new Map<
          string,
          ComboItem[]
        >();

      for (const row of
        comboItemResult.data ??
        []) {
        const id = String(
          row.combo_id,
        );

        const current =
          itemsByCombo.get(
            id,
          ) ?? [];

        current.push({
          productId: String(
            row.product_id,
          ),
          quantity: Number(
            row.quantity ?? 1,
          ),
        });

        itemsByCombo.set(
          id,
          current,
        );
      }

      setCombos(
        (
          comboResult.data ??
          []
        ).map((row) => ({
          id: String(row.id),
          name: String(
            row.name ??
              "Combo",
          ),
          description:
            typeof row.description ===
            "string"
              ? row.description
              : "",
          salePrice: Number(
            row.sale_price ??
              0,
          ),
          componentSummary:
            typeof row.component_summary ===
            "string"
              ? row.component_summary
              : "",
          availableQuantity:
            Number(
              row.available_quantity ??
                0,
            ),
          stockStatus: String(
            row.stock_status ??
              "",
          ),
          items:
            itemsByCombo.get(
              String(row.id),
            ) ?? [],
        })),
      );

      setLoadingOptions(false);
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const productFlavors =
    flavors.filter(
      (flavor) =>
        flavor.productId ===
        productId,
    );

  const selectedCombo =
    useMemo(
      () =>
        combos.find(
          (combo) =>
            combo.id ===
            comboId,
        ) ?? null,
      [combos, comboId],
    );

  const stockAutomation =
    looksLikeStockWait(
      status,
      notes,
    );

  function flavorsFor(
    product: string,
  ) {
    return flavors.filter(
      (flavor) =>
        flavor.productId ===
        product,
    );
  }

  function productName(
    product: string,
  ) {
    return (
      products.find(
        (item) =>
          item.id ===
          product,
      )?.name ?? "Produto"
    );
  }

  function switchMode(
    next: InterestMode,
  ) {
    setMode(next);
    setMessage(null);

    if (
      next === "product"
    ) {
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

      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase.rpc(
        "create_lead_interest_v3",
        {
          p_customer_id:
            customerId,
          p_product_id:
            mode === "product"
              ? productId
              : null,
          p_flavor_id:
            mode === "product"
              ? flavorId ||
                null
              : null,
          p_combo_id:
            mode === "combo"
              ? selectedCombo?.id ??
                null
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
                        item
                          .productId
                      ] ||
                      null,
                  }),
                )
              : [],
          p_lead_status:
            status,
          p_notes:
            notes.trim() ||
            null,
          p_lead_on: null,
        },
      );

      if (error) throw error;

      const leadId =
        String(data);

      const {
        error: agendaError,
      } = await supabase.rpc(
        "configure_lead_agenda_v1",
        {
          p_lead_id: leadId,
          p_followup_on:
            followupOn ||
            null,
        },
      );

      if (agendaError) {
        console.error(
          "Lead salvo, mas a Agenda não pôde ser sincronizada:",
          agendaError,
        );
      }

      router.push(
        `/leads/${leadId}`,
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o lead.",
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
          <h2>
            Informações do lead
          </h2>
          <p>
            Registre o interesse e já
            deixe o próximo passo na
            Agenda.
          </p>
        </div>

        <UserRoundPlus
          size={20}
        />
      </div>

      <div className="panel-body form-grid-two">
        <label className="field field-span-two">
          <span>
            Tipo de interesse
          </span>

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
                switchMode(
                  "product",
                )
              }
            >
              <Package
                size={16}
              />
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
                switchMode(
                  "combo",
                )
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

          <small>
            Cliente novo?{" "}
            <Link
              className="inline-link"
              href="/clientes/novo"
            >
              Cadastrar cliente
            </Link>
          </small>
        </label>

        <label className="field">
          <span>
            Status do lead
          </span>

          <select
            className="select"
            required
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value as (typeof STATUSES)[number],
              )
            }
          >
            {STATUSES.map(
              (value) => (
                <option
                  key={value}
                >
                  {value}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="field field-span-two">
          <span>
            Próximo contato na Agenda
          </span>

          <input
            className="input"
            type="date"
            value={followupOn}
            onChange={(event) =>
              setFollowupOn(
                event.target.value,
              )
            }
          />

          <small>
            Essa data vira um retorno
            automático na Agenda. Você
            pode alterar ou deixar vazio
            se o próximo passo depender
            apenas da chegada do estoque.
          </small>
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
                onChange={(
                  event,
                ) => {
                  setProductId(
                    event.target
                      .value,
                  );
                  setFlavorId(
                    "",
                  );
                }}
              >
                <option value="">
                  Selecione o produto
                </option>

                {products.map(
                  (product) => (
                    <option
                      key={
                        product.id
                      }
                      value={
                        product.id
                      }
                    >
                      {
                        product.name
                      }
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
                  onChange={(
                    event,
                  ) =>
                    setFlavorId(
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    Ainda não decidiu
                  </option>

                  {productFlavors.map(
                    (flavor) => (
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

                <small>
                  O sabor continua
                  opcional no lead.
                </small>
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
                disabled={
                  loadingOptions
                }
                onChange={(
                  event,
                ) => {
                  setComboId(
                    event.target
                      .value,
                  );
                  setComboFlavors(
                    {},
                  );
                }}
              >
                <option value="">
                  {loadingOptions
                    ? "Carregando combos..."
                    : "Selecione o combo"}
                </option>

                {combos.map(
                  (combo) => (
                    <option
                      key={combo.id}
                      value={
                        combo.id
                      }
                    >
                      {combo.name}
                      {" · "}
                      {formatCurrency(
                        combo.salePrice,
                      )}
                    </option>
                  ),
                )}
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
                    alignItems:
                      "flex-start",
                    justifyContent:
                      "space-between",
                    gap: 12,
                    flexWrap:
                      "wrap",
                  }}
                >
                  <div>
                    <strong>
                      {
                        selectedCombo.name
                      }
                    </strong>

                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          4,
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
                          padding:
                            "9px 0",
                          borderTop:
                            "1px solid var(--line)",
                        }}
                      >
                        <span
                          style={{
                            fontSize:
                              11,
                            fontWeight:
                              800,
                          }}
                        >
                          {productName(
                            item.productId,
                          )}{" "}
                          ×
                          {item.quantity}
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
                  Os produtos do combo
                  serão levados para o
                  orçamento quando o lead
                  for convertido. Sabores
                  ainda podem ser
                  definidos depois.
                </small>
              </div>
            )}
          </>
        )}

        <label className="field field-span-two">
          <span>
            Observações
          </span>

          <textarea
            className="textarea"
            rows={5}
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value,
              )
            }
            placeholder="Ex.: quer comprar assim que a creatina entrar no estoque."
          />
        </label>

        <div
          className="field-span-two"
          style={{
            display: "grid",
            gridTemplateColumns:
              "auto minmax(0,1fr)",
            gap: 10,
            alignItems: "start",
            padding: 14,
            border:
              "1px solid var(--line)",
            borderRadius: 14,
            background:
              stockAutomation
                ? "rgba(228,164,58,.055)"
                : "rgba(255,255,255,.018)",
          }}
        >
          <CalendarClock
            size={19}
          />

          <div>
            <strong>
              Agenda automática
            </strong>

            <small
              style={{
                display: "block",
                marginTop: 4,
                color:
                  "var(--muted)",
                lineHeight: 1.5,
              }}
            >
              {followupOn
                ? `O retorno será colocado na Agenda para ${followupOn
                    .split("-")
                    .reverse()
                    .join("/")}.`
                : "Sem data fixa de retorno."}
            </small>

            {stockAutomation && (
              <small
                style={{
                  display:
                    "block",
                  marginTop: 5,
                  color:
                    "var(--gold)",
                  lineHeight:
                    1.5,
                }}
              >
                O status/observação
                indica espera de
                estoque. Se o produto
                estiver zerado, a Agenda
                cria prioridade de
                compra. Assim que houver
                estoque disponível, ela
                troca para “Produto
                chegou · chamar cliente”.
              </small>
            )}
          </div>
        </div>
      </div>

      <div className="form-footer">
        <Link
          className="button ghost"
          href="/leads"
        >
          Cancelar
        </Link>

        <button
          className="button gold"
          disabled={
            loading ||
            loadingOptions
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
            ? "Salvando"
            : "Salvar lead"}
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
