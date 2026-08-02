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

export function FitnessConsignmentForm({
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
            row.variant_active &&
            row.available_quantity > 0,
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

  const [startedOn, setStartedOn] =
    useState(day());
  const [expected, setExpected] =
    useState(day(3));

  const [items, setItems] = useState<Draft[]>([
    {
      key: key(),
      variantId: "",
      quantity: "1",
      unitPrice: "",
    },
  ]);

  const [notes, setNotes] = useState("");
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
            Number(item.quantity) <= 0,
        )
      ) {
        throw new Error(
          "Revise as peças enviadas para prova.",
        );
      }

      for (const item of items) {
        const row = rowFor(item.variantId);

        if (
          row &&
          Number(item.quantity) >
            row.available_quantity
        ) {
          throw new Error(
            `${row.product_name} · ${row.size} · ${row.color}: disponível ${row.available_quantity}.`,
          );
        }
      }

      const { data, error } =
        await createClient().rpc(
          "create_fitness_consignment",
          {
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
            p_started_on: startedOn,
            p_expected_return_on:
              expected || null,
            p_items: items.map((item) => ({
              variant_id: item.variantId,
              quantity: Number(
                item.quantity,
              ),
              unit_price: Number(
                item.unitPrice ||
                  rowFor(item.variantId)
                    ?.sale_price ||
                  0,
              ),
            })),
            p_responsible: responsible,
            p_notes:
              notes.trim() || null,
          },
        );

      if (error) throw error;

      router.push(
        `/fitness/consignacoes/${String(data)}`,
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a consignação.",
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
                Quem está levando as peças para
                experimentar. A busca inclui a base
                inteira da Candinho.
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

            <label className="field">
              <span>Data de saída</span>
              <input
                className="input"
                type="date"
                value={startedOn}
                onChange={(event) =>
                  setStartedOn(
                    event.target.value,
                  )
                }
              />
            </label>

            <label className="field">
              <span>Previsão de acerto</span>
              <input
                className="input"
                type="date"
                value={expected}
                onChange={(event) =>
                  setExpected(
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
              <h2>Peças em prova</h2>
              <p>
                Enquanto estiverem com a cliente,
                deixam de aparecer como disponíveis.
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
                      Peça {index + 1}
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
                      <span>
                        Produto · tamanho · cor
                      </span>
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
                              {option.color} · disp.{" "}
                              {
                                option.available_quantity
                              }
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
                        max={
                          row?.available_quantity
                        }
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
                      <span>
                        Preço se ficar
                      </span>
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
                        Preço{" "}
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
              placeholder="Ex.: levou para provar em casa; combinar retorno na sexta."
            />
          </div>
        </article>
      </div>

      <aside className="new-sale-side">
        <article className="panel product-editor-summary">
          <div className="panel-body">
            <p>
              Ao salvar, as peças continuam no estoque
              físico, mas ficam marcadas como{" "}
              <strong>em prova</strong> e não podem ser
              prometidas para outra cliente.
            </p>

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
              Gerar consignação
            </button>
          </div>
        </article>
      </aside>
    </form>
  );
}
