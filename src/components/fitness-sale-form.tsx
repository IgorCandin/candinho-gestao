"use client";

import {
  FileText,
  LoaderCircle,
  PackageCheck,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import { FitnessCustomerPicker } from "@/components/fitness-customer-picker";
import type {
  FitnessCustomerRow,
  FitnessStockRow,
} from "@/lib/types";

const PAYMENT_METHODS = [
  "Pix",
  "Dinheiro",
  "Cartão",
  "Link de Pagamento",
  "Pagamento fracionado",
];

type DraftItem = {
  key: string;
  productId: string;
  variantId: string;
  quantity: string;
  unitPrice: string;
};

const key = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random()}`;

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export function FitnessSaleForm({
  stock,
  customers,
  responsible,
  companyMode = false,
  waitingByVariant = {},
  initialCustomerId,
  initialNotes = "",
}: {
  stock: FitnessStockRow[];
  customers: FitnessCustomerRow[];
  responsible: string;
  companyMode?: boolean;
  waitingByVariant?: Record<string, number>;
  initialCustomerId?: string;
  initialNotes?: string;
}) {
  const router = useRouter();

  const options = useMemo(
    () =>
      stock
        .filter(
          (row) =>
            row.product_active &&
            row.variant_active,
        )
        .sort((a, b) =>
          `${a.product_name}${a.size}${a.color}`.localeCompare(
            `${b.product_name}${b.size}${b.color}`,
            "pt-BR",
          ),
        ),
    [stock],
  );
  const productOptions = useMemo(() => {
    const unique = new Map<string, string>();
    options.forEach((row) => unique.set(row.product_id, row.product_name));
    return [...unique].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [options]);

  const [customerId, setCustomerId] =
    useState(initialCustomerId ?? "");
  const selectedCustomer = customers.find(
    (customer) => customer.id === customerId,
  );

  const [customerName, setCustomerName] =
    useState(selectedCustomer?.name ?? "");
  const [phone, setPhone] = useState(selectedCustomer?.phone ?? "");
  const [instagram, setInstagram] =
    useState(selectedCustomer?.instagram ?? "");
  const [city, setCity] = useState(selectedCustomer?.city ?? "");
  const [source, setSource] = useState(selectedCustomer?.source ?? "");

  const [quotedOn, setQuotedOn] =
    useState(today);
  const [items, setItems] = useState<
    DraftItem[]
  >([
    {
      key: "initial-fitness-item",
      productId: "",
      variantId: "",
      quantity: "1",
      unitPrice: "",
    },
  ]);

  const [paymentMode, setPaymentMode] =
    useState("receivable");
  const [paidOn, setPaidOn] = useState(today);
  const [paymentMethod, setPaymentMethod] =
    useState("Pix");
  const [paymentDueOn, setPaymentDueOn] =
    useState(today);

  const [delivered, setDelivered] =
    useState(false);
  const [deliveredOn, setDeliveredOn] =
    useState(today);

  const [notes, setNotes] = useState(initialNotes);
  const [scanCode, setScanCode] = useState("");
  const [loading, setLoading] =
    useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [confirmedStep, setConfirmedStep] = useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  const rowFor = (variantId: string) =>
    options.find(
      (row) => row.variant_id === variantId,
    );

  const update = (
    itemKey: string,
    change: Partial<DraftItem>,
  ) =>
    setItems((current) =>
      current.map((item) =>
        item.key === itemKey
          ? { ...item, ...change }
          : item,
      ),
    );

  const selectItem = (
    itemKey: string,
    variantId: string,
  ) => {
    const row = rowFor(variantId);

    update(itemKey, {
      productId: row?.product_id ?? "",
      variantId,
      unitPrice: row
        ? String(row.sale_price)
        : "",
    });
  };

  function addByCode() {
    const needle = scanCode.trim().toLocaleLowerCase("pt-BR");
    if (!needle) return;
    const matches = options.filter((row) => [row.internal_code, row.barcode_value, row.sku].some((code) => code?.toLocaleLowerCase("pt-BR") === needle));
    if (matches.length !== 1) {
      setMessage(matches.length > 1 ? "Há mais de uma peça com este código. Confira a etiqueta." : "Código não encontrado entre as peças ativas.");
      return;
    }
    const item = items.find((entry) => !entry.variantId) ?? items[items.length - 1];
    selectItem(item.key, matches[0].variant_id);
    setScanCode("");
    setMessage(null);
  }

  const total = items.reduce(
    (sum, item) =>
      sum +
      (Number(item.quantity) || 0) *
        (Number(item.unitPrice) || 0),
    0,
  );

  function chooseCustomer(id: string) {
    setCustomerId(id);

    const customer = customers.find(
      (item) => item.id === id,
    );

    if (!customer) return;

    setCustomerName(customer.name);
    setPhone(customer.phone ?? "");
    setInstagram(customer.instagram ?? "");
    setCity(customer.city ?? "");
    setSource(customer.source ?? "");
  }

  function startNewCustomer() {
    setCustomerId("");
    setCustomerName("");
    setPhone("");
    setInstagram("");
    setCity("");
    setSource("");
  }

  async function persist(asQuote: boolean) {
    setLoading(true);
    setMessage(null);

    try {
      if (companyMode && !selectedCustomer) {
        throw new Error("Selecione um cliente cadastrado na busca.");
      }
      if (!customerName.trim()) {
        throw new Error(
          "Informe o cliente.",
        );
      }

      if (
        items.some(
          (item) =>
            !item.variantId ||
            Number(item.quantity) <= 0 ||
            Number(item.unitPrice) < 0,
        )
      ) {
        throw new Error(
          "Revise os itens da venda.",
        );
      }

      const quoteUntil = new Date(`${quotedOn}T12:00:00`);
      quoteUntil.setDate(quoteUntil.getDate() + 7);
      const customerArgs = {
            p_customer_id:
              customerId || null,
            p_customer_name:
              customerName.trim(),
            p_customer_phone:
              phone.trim() || null,
            p_customer_instagram:
              instagram.trim() || null,
            p_city: city.trim() || null,
            p_customer_source:
              source.trim() || null,
            p_quoted_on: quotedOn,
            p_items: items.map((item) => ({
              variant_id: item.variantId,
              quantity: Number(
                item.quantity,
              ),
              unit_price: Number(
                item.unitPrice,
              ),
            })),
      };
      const { data, error } = asQuote
        ? await createClient().rpc("save_fitness_quote", {
            ...customerArgs,
            p_quote_id: null,
            p_valid_until: quoteUntil.toISOString().slice(0, 10),
            p_discount_amount: 0,
            p_responsible: responsible,
            p_notes: notes.trim() || null,
          })
        : await createClient().rpc("create_fitness_sale_v2", {
            ...customerArgs,
            p_payment_mode: paymentMode,
            p_paid_on:
              paymentMode === "paid"
                ? paidOn
                : null,
            p_payment_method:
              paymentMode === "paid"
                ? paymentMethod
                : null,
            p_payment_due_on:
              paymentMode === "combined"
                ? paymentDueOn
                : null,
            p_delivered: delivered,
            p_delivered_on:
              delivered
                ? deliveredOn
                : null,
            p_responsible: responsible,
            p_notes:
              notes.trim() || null,
          });

      if (error) throw error;

      setChoiceOpen(false);
      router.push(asQuote
        ? (companyMode ? `/company/orcamentos/fitness/${String(data)}` : `/fitness/orcamentos/${String(data)}`)
        : (companyMode ? `/company/concluir/fitness/${String(data)}` : `/fitness/vendas/${String(data)}`));
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a venda.",
      );
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (companyMode && !confirmedStep) {
      setMessage(null);
      setChoiceOpen(true);
      return;
    }
    void persist(false);
  }

  function confirmQuote() {
    setChoiceOpen(false);
    setConfirmedStep(true);
    window.setTimeout(() => document.getElementById("fitness-payment-step")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  return (
    <form
      className="new-sale-layout"
      onSubmit={submit}
    >
      <div className="new-sale-main">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Cliente</h2>
              <p>
                Procure na base inteira da Candinho.
                Se a pessoa já compra Suplementos,
                basta selecionar.
              </p>
            </div>
          </div>

          <div className="panel-body form-grid-two">
            <div className="field field-span-two">
              <span>Buscar cliente</span>
              <FitnessCustomerPicker
                customers={customers}
                selectedId={customerId}
                onSelect={chooseCustomer}
                onNew={startNewCustomer}
                allowNew={!companyMode}
              />
            </div>

            {companyMode ? (
              <div className="field field-span-two" role="status">
                {selectedCustomer
                  ? <small>Selecionado: <strong>{selectedCustomer.name}</strong>{selectedCustomer.city ? ` · ${selectedCustomer.city}` : ""}{selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}</small>
                  : <small>Escolha um cliente da lista. Para cadastrar alguém novo, use Company → Clientes.</small>}
              </div>
            ) : <>
            <label className="field">
              <span>Nome</span>
              <input
                className="input"
                required
                value={customerName}
                onChange={(event) => {
                  setCustomerName(
                    event.target.value,
                  );

                  if (
                    selectedCustomer &&
                    event.target.value !==
                      selectedCustomer.name
                  ) {
                    setCustomerId("");
                  }
                }}
              />
            </label>

            <label className="field">
              <span>Telefone</span>
              <input
                className="input"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Instagram</span>
              <input
                className="input"
                value={instagram}
                onChange={(event) =>
                  setInstagram(
                    event.target.value,
                  )
                }
              />
            </label>

            <label className="field">
              <span>Cidade</span>
              <input
                className="input"
                value={city}
                onChange={(event) =>
                  setCity(event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Origem</span>
              <select
                className="select"
                value={source}
                onChange={(event) =>
                  setSource(event.target.value)
                }
              >
                <option value="">
                  Não informado
                </option>
                {[
                  "Instagram",
                  "WhatsApp",
                  "Indicação",
                  "Academia",
                  "Cliente antigo",
                  "Candinho Company",
                  "Outro",
                ].map((item) => (
                  <option key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            </>}

            <label className="field">
              <span>Data da venda</span>
              <input
                className="input"
                type="date"
                value={quotedOn}
                onChange={(event) =>
                  setQuotedOn(
                    event.target.value,
                  )
                }
              />
            </label>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Itens</h2>
              <p>
                Produto, tamanho e cor. O estoque só
                baixa na entrega.
              </p>
            </div>

            <button
              type="button"
              className="button ghost"
              onClick={() =>
                setItems((current) => [
                  ...current,
                  {
                    key: key(),
                    productId: "",
                    variantId: "",
                    quantity: "1",
                    unitPrice: "",
                  },
                ])
              }
            >
              <Plus size={16} />
              Adicionar produto
            </button>
          </div>

          <div className="panel-body sale-form-items">
            <label className="field field-span-two">
              <span>Código ou código de barras</span>
              <div className="inline-form-actions">
                <input className="input" value={scanCode} onChange={(event) => setScanCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addByCode(); } }} placeholder="Aponte a leitora ou digite o código da etiqueta" />
                <button className="button ghost" type="button" onClick={addByCode}>Adicionar por código</button>
              </div>
              <small className="form-help">A leitora seleciona a peça no primeiro item vazio, incluindo tamanho e cor.</small>
            </label>
            {items.map((item, index) => {
              const row = rowFor(
                item.variantId,
              );

              return (
                <div
                  className="sale-form-item"
                  key={item.key}
                >
                  <div className="sale-form-item-head">
                    <strong>
                      Item {index + 1}
                    </strong>

                    {items.length > 1 && (
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() =>
                          setItems(
                            (current) =>
                              current.filter(
                                (value) =>
                                  value.key !==
                                  item.key,
                              ),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className={`sale-form-item-grid${companyMode ? " fitness-company-item-grid" : ""}`}>
                    {companyMode && <label className="field sale-product-field">
                      <span>Produto</span>
                      <select className="select" required value={item.productId} onChange={(event) => {
                        const productId = event.target.value;
                        const preferred = options.find((option) => option.product_id === productId && option.available_quantity > 0);
                        update(item.key, { productId, variantId: preferred?.variant_id ?? "", unitPrice: preferred ? String(preferred.sale_price) : "" });
                      }}>
                        <option value="">Escolha o modelo</option>
                        {productOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                      </select>
                    </label>}
                    <label className={`field sale-product-field${companyMode && options.filter((option) => option.product_id === item.productId && option.available_quantity > 0).length > 1 ? " variation-choice-multiple" : ""}`}>
                      <span>{companyMode ? "Tamanho e cor" : "Produto"}</span>
                      <select
                        className="select"
                        required
                        value={item.variantId}
                        onChange={(event) =>
                          selectItem(
                            item.key,
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          {companyMode ? "Escolha a variação" : "Selecione"}
                        </option>

                        {options.filter((option) => !companyMode || option.product_id === item.productId).map(
                          (option) => (
                            <option
                              key={
                                option.variant_id
                              }
                              value={
                                option.variant_id
                              }
                            >
                              {companyMode ? `${option.size} · ${option.color}` : `${option.product_name} · ${option.size} · ${option.color}`}
                              {option.available_quantity >
                              0
                                ? ` · disp. ${option.available_quantity}`
                                : ""}
                              {option.incoming_quantity > 0 ? ` · chegada livre ${Math.max(option.incoming_quantity - (waitingByVariant[option.variant_id] ?? 0), 0)}/${option.incoming_quantity}` : ""}
                              {option.internal_code ? ` · cód. ${option.internal_code}` : ""}
                            </option>
                          ),
                        )}
                      </select>
                      {companyMode && options.filter((option) => option.product_id === item.productId && option.available_quantity > 0).length > 1 && <small>Mais tamanhos ou cores disponíveis — confira a variação.</small>}
                    </label>

                    <label className="field">
                      <span>Qtd.</span>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          update(item.key, {
                            quantity:
                              event.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Preço</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) =>
                          update(item.key, {
                            unitPrice:
                              event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>

                  {row && (
                    <div className="sale-stock-strip">
                      <span>
                        Disponível{" "}
                        <strong>
                          {
                            row.available_quantity
                          }
                        </strong>
                      </span>
                      <span>
                        Reservado{" "}
                        <strong>
                          {
                            row.reserved_quantity
                          }
                        </strong>
                      </span>
                      <span>
                        A caminho{" "}
                        <strong>
                          {
                            row.incoming_quantity
                          }
                        </strong>
                      </span>
                      {row.incoming_quantity > 0 && <><span>Clientes anteriores aguardando <strong>{waitingByVariant[row.variant_id] ?? 0}</strong></span><span className={Math.max(row.incoming_quantity - (waitingByVariant[row.variant_id] ?? 0), 0) < Number(item.quantity) ? "warning-text" : ""}>Livre na chegada <strong>{Math.max(row.incoming_quantity - (waitingByVariant[row.variant_id] ?? 0), 0)}</strong></span></>}
                      <span>
                        Padrão{" "}
                        <strong>
                          {formatCurrency(
                            row.sale_price,
                          )}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            {companyMode && <button type="button" className="button ghost" onClick={() => setItems((current) => [...current, { key: key(), productId: "", variantId: "", quantity: "1", unitPrice: "" }])}><Plus size={16} />Adicionar outro produto</button>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Observações</h2>
            </div>
          </div>

          <div className="panel-body">
            <textarea
              className="textarea"
              rows={4}
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
            />
          </div>
        </article>
      </div>

      <aside className="new-sale-side">
        {companyMode && confirmedStep && <div className="v4515-inline-confirm-heading" id="fitness-payment-step"><span>Orçamento confirmado</span><strong>Agora finalize a venda</strong><small>Informe pagamento e entrega antes de salvar.</small><button type="button" className="button ghost" onClick={() => setConfirmedStep(false)}>Voltar à escolha</button></div>}
        {(!companyMode || confirmedStep) && <>
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Pagamento</h2>
            </div>
          </div>

          <div className={`panel-body ${companyMode ? "option-stack" : "product-switch-list"}`}>
            {companyMode ? ([
              ["receivable", "A receber", "Sem data combinada."],
              ["paid", "Pago", "Registra o recebimento integral."],
              ["combined", "Pagamento combinado", "Informe a data combinada."],
            ] as const).map(([value, title, description]) => <label className={`choice-card ${paymentMode === value ? "active" : ""}`} key={value}><input type="radio" name="fitnessPaymentMode" checked={paymentMode === value} onChange={() => setPaymentMode(value)}/><span><strong>{title}</strong><small>{description}</small></span></label>) : <label className="field">
              <span>Situação</span>
              <select
                className="select"
                value={paymentMode}
                onChange={(event) =>
                  setPaymentMode(
                    event.target.value,
                  )
                }
              >
                <option value="receivable">
                  A receber
                </option>
                <option value="paid">
                  Pago
                </option>
                <option value="combined">
                  Pagamento combinado
                </option>
              </select>
            </label>}

            {paymentMode === "paid" && (
              <>
                <label className="field">
                  <span>Data</span>
                  <input
                    className="input"
                    type="date"
                    value={paidOn}
                    onChange={(event) =>
                      setPaidOn(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="field">
                  <span>Forma</span>
                  <select
                    className="select"
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target.value,
                      )
                    }
                  >
                    {PAYMENT_METHODS.map(
                      (method) => (
                        <option key={method}>
                          {method}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </>
            )}

            {paymentMode === "combined" && (
              <label className="field">
                <span>Data combinada</span>
                <input
                  className="input"
                  type="date"
                  value={paymentDueOn}
                  onChange={(event) =>
                    setPaymentDueOn(
                      event.target.value,
                    )
                  }
                />
              </label>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Entrega</h2>
            </div>
          </div>

          <div className="panel-body product-switch-list">
            <label className="switch-row">
              <div>
                <strong>
                  Já foi entregue
                </strong>
                <span>
                  Baixa o estoque agora.
                </span>
              </div>

              <input
                type="checkbox"
                checked={delivered}
                onChange={(event) =>
                  setDelivered(
                    event.target.checked,
                  )
                }
              />
            </label>

            {delivered && (
              <label className="field">
                <span>Data</span>
                <input
                  className="input"
                  type="date"
                  value={deliveredOn}
                  onChange={(event) =>
                    setDeliveredOn(
                      event.target.value,
                    )
                  }
                />
              </label>
            )}
          </div>
        </article>
        </>}

        <article className="panel product-editor-summary">
          <div className="panel-body">
            <dl>
              <div>
                <dt>Total</dt>
                <dd>
                  {formatCurrency(total)}
                </dd>
              </div>
            </dl>

            {message && (
              <p className="form-error visible">
                {message}
              </p>
            )}

            <button
              className="button gold product-save-button"
              disabled={loading}
              name="saveMode"
              value="sale"
            >
              {loading ? (
                <LoaderCircle
                  className="spin"
                  size={17}
                />
              ) : (
                <Save size={17} />
              )}
              {companyMode ? (confirmedStep ? "Confirmar venda" : "Salvar orçamento") : "Salvar venda"}
            </button>
          </div>
        </article>
      </aside>
      {companyMode && choiceOpen && <div className="budget-choice-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) setChoiceOpen(false); }}><section className="budget-choice-modal" role="dialog" aria-modal="true" aria-labelledby="fitness-budget-choice-title"><button className="budget-choice-close" type="button" aria-label="Fechar" disabled={loading} onClick={() => setChoiceOpen(false)}><X size={18}/></button><div className="budget-choice-heading"><FileText size={25}/><div><span>Salvar orçamento · Fitness</span><h2 id="fitness-budget-choice-title">O cliente já confirmou?</h2><p>Escolha o destino. Você poderá consultar o orçamento nos dois casos.</p></div></div><div className="budget-choice-grid"><button className="budget-choice-card confirmed" type="button" disabled={loading} onClick={confirmQuote}><PackageCheck size={25}/><span><strong>Orçamento confirmado</strong><small>Continue para informar pagamento e entrega antes de criar a venda.</small></span></button><button className="budget-choice-card quote" type="button" disabled={loading} onClick={() => void persist(true)}><FileText size={25}/><span><strong>Apenas orçamento</strong><small>Salva a proposta sem registrar pagamento ou entrega.</small></span>{loading && <LoaderCircle className="spin" size={18}/>}</button></div>{message && <p className="form-error visible" role="alert">{message}</p>}</section></div>}
    </form>
  );
}
