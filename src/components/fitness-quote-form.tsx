"use client";

import {
  LoaderCircle,
  Plus,
  Save,
  Trash2,
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

type Draft = {
  key: string;
  variantId: string;
  quantity: string;
  unitPrice: string;
};

const key = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random()}`;

const day = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export function FitnessQuoteForm({
  stock,
  customers,
  responsible,
}: {
  stock: FitnessStockRow[];
  customers: FitnessCustomerRow[];
  responsible: string;
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

  const [customerId, setCustomerId] =
    useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] =
    useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState("");

  const [quotedOn, setQuotedOn] =
    useState(day());
  const [validUntil, setValidUntil] =
    useState(day(7));
  const [discount, setDiscount] =
    useState("0");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<Draft[]>([
    {
      key: key(),
      variantId: "",
      quantity: "1",
      unitPrice: "",
    },
  ]);

  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  const rowFor = (id: string) =>
    options.find((row) => row.variant_id === id);

  const update = (
    itemKey: string,
    change: Partial<Draft>,
  ) =>
    setItems((current) =>
      current.map((item) =>
        item.key === itemKey
          ? { ...item, ...change }
          : item,
      ),
    );

  const gross = items.reduce(
    (sum, item) =>
      sum +
      (Number(item.quantity) || 0) *
        (Number(item.unitPrice) || 0),
    0,
  );

  const total = Math.max(
    gross - (Number(discount) || 0),
    0,
  );

  function chooseCustomer(id: string) {
    setCustomerId(id);

    const customer = customers.find(
      (item) => item.id === id,
    );

    if (!customer) return;

    setName(customer.name);
    setPhone(customer.phone ?? "");
    setInstagram(customer.instagram ?? "");
    setCity(customer.city ?? "");
    setSource(customer.source ?? "");
  }

  function newCustomer() {
    setCustomerId("");
    setName("");
    setPhone("");
    setInstagram("");
    setCity("");
    setSource("");
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!name.trim()) {
        throw new Error(
          "Informe a cliente.",
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
          "Revise os itens do orçamento.",
        );
      }

      const { data, error } =
        await createClient().rpc(
          "save_fitness_quote",
          {
            p_quote_id: null,
            p_customer_id:
              customerId || null,
            p_customer_name: name.trim(),
            p_customer_phone:
              phone.trim() || null,
            p_customer_instagram:
              instagram.trim() || null,
            p_city: city.trim() || null,
            p_customer_source:
              source.trim() || null,
            p_quoted_on: quotedOn,
            p_valid_until: validUntil,
            p_items: items.map((item) => ({
              variant_id: item.variantId,
              quantity: Number(
                item.quantity,
              ),
              unit_price: Number(
                item.unitPrice,
              ),
            })),
            p_discount_amount:
              Number(discount) || 0,
            p_responsible: responsible,
            p_notes:
              notes.trim() || null,
          },
        );

      if (error) throw error;

      router.push(
        `/fitness/orcamentos/${String(data)}`,
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o orçamento.",
      );
    } finally {
      setLoading(false);
    }
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
                Busque na base unificada da Candinho.
                Cliente de Suplementos já aparece aqui.
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
                onNew={newCustomer}
              />
            </div>

            <label className="field">
              <span>Nome</span>
              <input
                className="input"
                required
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
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
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Itens da proposta</h2>
              <p>
                O orçamento não reserva estoque. A
                disponibilidade é validada ao converter
                em venda.
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
                    variantId: "",
                    quantity: "1",
                    unitPrice: "",
                  },
                ])
              }
            >
              <Plus size={16} />
              Adicionar
            </button>
          </div>

          <div className="panel-body sale-form-items">
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

                  <div className="sale-form-item-grid">
                    <label className="field sale-product-field">
                      <span>Produto</span>
                      <select
                        className="select"
                        value={item.variantId}
                        onChange={(event) => {
                          const selected =
                            rowFor(
                              event.target.value,
                            );

                          update(item.key, {
                            variantId:
                              event.target.value,
                            unitPrice: selected
                              ? String(
                                  selected.sale_price,
                                )
                              : "",
                          });
                        }}
                      >
                        <option value="">
                          Selecione
                        </option>

                        {options.map(
                          (option) => (
                            <option
                              key={
                                option.variant_id
                              }
                              value={
                                option.variant_id
                              }
                            >
                              {
                                option.product_name
                              }{" "}
                              · {option.size} ·{" "}
                              {option.color}
                              {option.available_quantity >
                              0
                                ? ` · disp. ${option.available_quantity}`
                                : ""}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="field">
                      <span>Qtd.</span>
                      <input
                        className="input"
                        type="number"
                        min="1"
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
                        A caminho{" "}
                        <strong>
                          {
                            row.incoming_quantity
                          }
                        </strong>
                      </span>
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
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Validade</h2>
            </div>
          </div>

          <div className="panel-body product-switch-list">
            <label className="field">
              <span>Data</span>
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

            <label className="field">
              <span>Válido até</span>
              <input
                className="input"
                type="date"
                value={validUntil}
                onChange={(event) =>
                  setValidUntil(
                    event.target.value,
                  )
                }
              />
            </label>

            <label className="field">
              <span>Desconto</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) =>
                  setDiscount(
                    event.target.value,
                  )
                }
              />
            </label>
          </div>
        </article>

        <article className="panel product-editor-summary">
          <div className="panel-body">
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>
                  {formatCurrency(gross)}
                </dd>
              </div>
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
            >
              {loading ? (
                <LoaderCircle
                  className="spin"
                  size={17}
                />
              ) : (
                <Save size={17} />
              )}
              Salvar orçamento
            </button>
          </div>
        </article>
      </aside>
    </form>
  );
}
