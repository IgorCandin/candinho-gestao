import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Layers3,
  Plus,
  Save,
  X,
} from "lucide-react";
import { getBankCardsAndInvoices } from "@/lib/bank-data";
import {
  formatCurrency,
  formatDateOnly,
  formatMonthYear,
} from "@/lib/format";
import {
  createBankCard,
  markBankInvoicePaid,
  saveBankInvoices,
} from "./actions";

function todayInBrazil() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

function currentMonthInBrazil() {
  return `${todayInBrazil().slice(
    0,
    7,
  )}-01`;
}

function addMonths(
  month: string,
  offset: number,
) {
  const [year, monthNumber] =
    month.split("-").map(Number);

  const date = new Date(
    Date.UTC(
      year,
      monthNumber - 1 + offset,
      1,
    ),
  );

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}-01`;
}

function invoiceDueDate(
  referenceMonth: string,
  dueDay: unknown,
) {
  const day = Number(dueDay ?? 0);

  if (
    !Number.isInteger(day) ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const [year, month] =
    referenceMonth
      .split("-")
      .map(Number);

  const lastDay = new Date(
    Date.UTC(year, month, 0),
  ).getUTCDate();

  return `${year}-${String(
    month,
  ).padStart(2, "0")}-${String(
    Math.min(day, lastDay),
  ).padStart(2, "0")}`;
}

function inputMoney(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  return Number(value)
    .toFixed(2)
    .replace(".", ",");
}

function statusLabel(
  status: unknown,
) {
  const value = String(
    status ?? "planned",
  );

  if (value === "open")
    return "Aberta";
  if (value === "closed")
    return "Fechada";
  if (value === "paid")
    return "Paga";
  if (value === "overdue")
    return "Vencida";
  if (value === "cancelled")
    return "Cancelada";

  return "Planejada";
}

function statusClass(
  status: unknown,
) {
  const value = String(
    status ?? "planned",
  );

  if (value === "paid")
    return "green";
  if (value === "overdue")
    return "red";
  if (value === "closed")
    return "orange";

  return "gray";
}

export default async function BankInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    acao?: string;
    modo?: string;
    cartao?: string;
    salvo?: string;
  }>;
}) {
  const params =
    await searchParams;

  const { cards, invoices } =
    await getBankCardsAndInvoices();

  const updating =
    params.acao === "atualizar";

  const creatingCard =
    params.acao === "novo-cartao";

  const mode =
    params.modo === "todas"
      ? "todas"
      : "individual";

  const selectedCard =
    cards.find(
      (card) =>
        String(card.id) ===
        params.cartao,
    ) ??
    cards[0] ??
    null;

  const selectedIndex =
    selectedCard
      ? cards.findIndex(
          (card) =>
            String(card.id) ===
            String(
              selectedCard.id,
            ),
        )
      : -1;

  const nextCard =
    mode === "todas" &&
    selectedIndex >= 0
      ? cards[
          selectedIndex + 1
        ] ?? null
      : null;

  const startMonth =
    currentMonthInBrazil();

  const months = Array.from(
    { length: 12 },
    (_, index) =>
      addMonths(
        startMonth,
        index,
      ),
  );

  const invoiceMap = new Map(
    invoices
      .filter(
        (invoice) =>
          String(
            invoice.card_id,
          ) ===
          String(
            selectedCard?.id ??
              "",
          ),
      )
      .map((invoice) => [
        String(
          invoice.reference_month,
        ),
        invoice,
      ]),
  );

  const monthGroups = new Map<
    string,
    Record<string, unknown>[]
  >();

  for (const invoice of invoices) {
    const referenceMonth =
      String(
        invoice.reference_month ??
          "",
      );

    if (!referenceMonth) continue;

    const current =
      monthGroups.get(
        referenceMonth,
      ) ?? [];

    current.push(invoice);
    monthGroups.set(
      referenceMonth,
      current,
    );
  }

  const groupedMonths = Array.from(
    monthGroups.entries(),
  ).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const today = todayInBrazil();

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">
            Candinho Bank
          </div>

          <h1>Faturas</h1>

          <p>
            Cada mês aparece como um bloco
            único com todas as faturas dos
            cartões. O que já foi pago fica
            preservado no histórico sem
            continuar como pendência.
          </p>
        </div>

        <div className="bank-header-actions">
          <span className="bank-module-badge">
            <CreditCard size={16} />
            {cards.length} cartões
          </span>

          {!updating &&
            !creatingCard && (
              <Link
                className="button ghost"
                href="/bank/faturas?acao=novo-cartao"
              >
                <Plus size={16} />
                Novo cartão
              </Link>
            )}

          {!updating &&
            !creatingCard &&
            cards.length > 0 && (
              <Link
                className="button gold"
                href="/bank/faturas?acao=atualizar"
              >
                <CreditCard
                  size={16}
                />
                Atualizar faturas
              </Link>
            )}
        </div>
      </div>

      {params.salvo && (
        <div className="bank-success-banner">
          <CheckCircle2
            size={18}
          />

          <div>
            <strong>
              {params.salvo ===
              "cartao-criado"
                ? "Cartão criado com sucesso."
                : "Faturas salvas com sucesso."}
            </strong>

            <span>
              O Dashboard e a visão
              mensal já usam os novos
              valores.
            </span>
          </div>
        </div>
      )}

      {creatingCard && (
        <article className="panel bank-charge-form-panel">
          <div className="panel-head">
            <div>
              <h2>Novo cartão</h2>
              <p>
                Cadastre o cartão antes
                de informar suas faturas.
              </p>
            </div>

            <Link
              className="icon-link"
              href="/bank/faturas"
              aria-label="Fechar"
            >
              <X size={17} />
            </Link>
          </div>

          <form
            action={createBankCard}
          >
            <div className="panel-body bank-charge-form-grid">
              <label className="field">
                <span>
                  Nome do cartão
                </span>
                <input
                  className="input"
                  name="name"
                  placeholder="Ex.: Nubank Giulia"
                  required
                />
              </label>

              <label className="field">
                <span>
                  Instituição
                </span>
                <input
                  className="input"
                  name="institution"
                  placeholder="Ex.: Nubank"
                />
              </label>

              <label className="field">
                <span>Titular</span>
                <input
                  className="input"
                  name="holder_name"
                  placeholder="Ex.: Giulia"
                />
              </label>

              <label className="field">
                <span>
                  Dia do vencimento
                </span>
                <input
                  className="input"
                  name="due_day"
                  type="number"
                  min="1"
                  max="31"
                  required
                />
              </label>

              <label className="field">
                <span>
                  Dia do fechamento
                </span>
                <input
                  className="input"
                  name="closing_day"
                  type="number"
                  min="1"
                  max="31"
                />
              </label>

              <label className="field">
                <span>Origem</span>
                <input
                  className="input"
                  name="origin"
                  placeholder="Pessoal, Company..."
                />
              </label>

              <label className="field bank-charge-form-wide">
                <span>
                  Observações
                </span>
                <textarea
                  className="input bank-textarea"
                  name="notes"
                />
              </label>
            </div>

            <div className="bank-balance-update-actions">
              <Link
                className="button ghost"
                href="/bank/faturas"
              >
                Cancelar
              </Link>

              <button
                className="button gold"
                type="submit"
              >
                <Save size={16} />
                Salvar cartão
              </button>
            </div>
          </form>
        </article>
      )}

      {updating &&
        cards.length > 0 &&
        selectedCard && (
          <article className="panel bank-invoice-update-panel">
            <div className="panel-head">
              <div>
                <h2>
                  Atualizar faturas
                </h2>

                <p>
                  Campo vazio significa
                  não informado. Fatura
                  paga continua
                  preservada e bloqueada
                  para edição.
                </p>
              </div>

              <Link
                className="icon-link"
                href="/bank/faturas"
                aria-label="Fechar atualização"
              >
                <X size={17} />
              </Link>
            </div>

            <div className="bank-invoice-mode-row">
              <div className="bank-invoice-mode-tabs">
                <Link
                  className={
                    mode ===
                    "individual"
                      ? "active"
                      : ""
                  }
                  href={`/bank/faturas?acao=atualizar&modo=individual&cartao=${encodeURIComponent(
                    String(
                      selectedCard.id,
                    ),
                  )}`}
                >
                  <CreditCard
                    size={15}
                  />
                  Individualmente
                </Link>

                <Link
                  className={
                    mode === "todas"
                      ? "active"
                      : ""
                  }
                  href={`/bank/faturas?acao=atualizar&modo=todas&cartao=${encodeURIComponent(
                    String(
                      cards[0]?.id ??
                        "",
                    ),
                  )}`}
                >
                  <Layers3
                    size={15}
                  />
                  Atualizar todas
                </Link>
              </div>

              {mode === "todas" && (
                <span className="bank-invoice-progress">
                  Cartão{" "}
                  {selectedIndex + 1} de{" "}
                  {cards.length}
                </span>
              )}
            </div>

            <form
              className="bank-invoice-selector"
              method="get"
            >
              <input
                type="hidden"
                name="acao"
                value="atualizar"
              />

              <input
                type="hidden"
                name="modo"
                value={mode}
              />

              <label className="field">
                <span>
                  Cartão selecionado
                </span>

                <select
                  className="input"
                  name="cartao"
                  defaultValue={String(
                    selectedCard.id,
                  )}
                >
                  {cards.map(
                    (card) => (
                      <option
                        key={String(
                          card.id,
                        )}
                        value={String(
                          card.id,
                        )}
                      >
                        {String(
                          card.name ??
                            "Cartão",
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <button
                className="button ghost"
                type="submit"
              >
                Abrir cartão
              </button>
            </form>

            <form
              action={saveBankInvoices}
            >
              <input
                type="hidden"
                name="card_id"
                value={String(
                  selectedCard.id,
                )}
              />

              <input
                type="hidden"
                name="mode"
                value={mode}
              />

              <input
                type="hidden"
                name="next_card_id"
                value={String(
                  nextCard?.id ?? "",
                )}
              />

              <div className="bank-invoice-card-summary">
                <div>
                  <span>Cartão</span>
                  <strong>
                    {String(
                      selectedCard.name ??
                        "Cartão",
                    )}
                  </strong>
                </div>

                <div>
                  <span>Titular</span>
                  <strong>
                    {String(
                      selectedCard.holder_name ??
                        "Não informado",
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Vencimento
                  </span>
                  <strong>
                    {selectedCard.due_day
                      ? `Dia ${String(
                          selectedCard.due_day,
                        )}`
                      : "Não informado"}
                  </strong>
                </div>
              </div>

              <div className="bank-invoice-month-list">
                {months.map(
                  (month) => {
                    const invoice =
                      invoiceMap.get(
                        month,
                      );

                    const dueDate =
                      invoice?.due_date
                        ? String(
                            invoice.due_date,
                          )
                        : invoiceDueDate(
                            month,
                            selectedCard.due_day,
                          );

                    const status =
                      invoice?.status ??
                      "planned";

                    const paid =
                      String(
                        status,
                      ) === "paid";

                    return (
                      <div
                        className="bank-invoice-month-row"
                        key={month}
                      >
                        <input
                          type="hidden"
                          name="reference_month"
                          value={month}
                        />

                        <div className="bank-invoice-month-title">
                          <strong>
                            {formatMonthYear(
                              month,
                            )}
                          </strong>

                          <span>
                            {dueDate
                              ? `Vence em ${formatDateOnly(
                                  dueDate,
                                )}`
                              : "Vencimento não configurado"}
                          </span>
                        </div>

                        <label className="field">
                          <span>
                            Valor da
                            fatura
                          </span>

                          <div className="bank-money-input">
                            <b>R$</b>

                            <input
                              className="input"
                              type="text"
                              inputMode="decimal"
                              name={`amount:${month}`}
                              defaultValue={inputMoney(
                                invoice?.amount,
                              )}
                              placeholder="Não informado"
                              disabled={
                                paid
                              }
                            />
                          </div>
                        </label>

                        <label className="field bank-invoice-recurring-mode">
                          <span>
                            Esse valor já
                            inclui
                            recorrências?
                          </span>

                          <select
                            className="input"
                            name={`includes_recurring:${month}`}
                            defaultValue={
                              invoice?.includes_recurring ===
                              false
                                ? "false"
                                : "true"
                            }
                            disabled={
                              paid
                            }
                          >
                            <option value="true">
                              Sim · é o
                              total da
                              fatura
                            </option>
                            <option value="false">
                              Não · somar
                              recorrências
                            </option>
                          </select>
                        </label>

                        <div className="bank-invoice-month-status">
                          <span
                            className={`badge ${
                              paid
                                ? "green"
                                : "gray"
                            }`}
                          >
                            {statusLabel(
                              status,
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              <div className="bank-balance-update-actions">
                <Link
                  className="button ghost"
                  href="/bank/faturas"
                >
                  Cancelar
                </Link>

                <button
                  className="button gold"
                  type="submit"
                >
                  {mode ===
                  "todas" ? (
                    <>
                      {nextCard ? (
                        <ChevronRight
                          size={16}
                        />
                      ) : (
                        <Save
                          size={16}
                        />
                      )}

                      {nextCard
                        ? "Salvar e próxima fatura"
                        : "Salvar e finalizar"}
                    </>
                  ) : (
                    <>
                      <Save
                        size={16}
                      />
                      Salvar faturas
                    </>
                  )}
                </button>
              </div>
            </form>
          </article>
        )}

      <section
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        {groupedMonths.map(
          ([month, rows]) => {
            const total =
              rows.reduce(
                (sum, invoice) =>
                  sum +
                  Number(
                    invoice.amount ??
                      0,
                  ),
                0,
              );

            const openCount =
              rows.filter(
                (invoice) =>
                  ![
                    "paid",
                    "cancelled",
                  ].includes(
                    String(
                      invoice.status ??
                        "planned",
                    ),
                  ),
              ).length;

            return (
              <article
                className="panel"
                key={month}
              >
                <div className="panel-head">
                  <div>
                    <h2>
                      {formatMonthYear(
                        month,
                      )}
                    </h2>

                    <p>
                      {rows.length}{" "}
                      fatura(s) ·{" "}
                      {openCount} ainda
                      aberta(s)
                    </p>
                  </div>

                  <span className="badge gold">
                    {formatCurrency(
                      total,
                    )}
                  </span>
                </div>

                <div className="bank-charge-list">
                  {rows.map(
                    (invoice) => {
                      const status =
                        String(
                          invoice.status ??
                            "planned",
                        );

                      const paid =
                        status ===
                        "paid";

                      const canPay =
                        ![
                          "paid",
                          "cancelled",
                        ].includes(
                          status,
                        ) &&
                        Number(
                          invoice.amount ??
                            0,
                        ) > 0;

                      return (
                        <div
                          className="bank-charge-item"
                          key={String(
                            invoice.id,
                          )}
                        >
                          <div className="bank-charge-date">
                            <strong>
                              {invoice.due_date
                                ? formatDateOnly(
                                    String(
                                      invoice.due_date,
                                    ),
                                  ).slice(
                                    0,
                                    5,
                                  )
                                : "—"}
                            </strong>

                            <span>
                              Cartão
                            </span>
                          </div>

                          <div className="bank-charge-main">
                            <strong>
                              {String(
                                invoice.card_name ??
                                  "Cartão",
                              )}
                            </strong>

                            <span>
                              {String(
                                invoice.holder_name ??
                                  invoice.institution ??
                                  "",
                              )}
                            </span>
                          </div>

                          <div className="bank-charge-value">
                            <strong>
                              {invoice.amount ===
                              null
                                ? "Não informado"
                                : formatCurrency(
                                    Number(
                                      invoice.amount ??
                                        0,
                                    ),
                                  )}
                            </strong>

                            <span
                              className={`badge ${statusClass(
                                status,
                              )}`}
                            >
                              {statusLabel(
                                status,
                              )}
                            </span>
                          </div>

                          <div>
                            {canPay ? (
                              <form
                                action={
                                  markBankInvoicePaid
                                }
                              >
                                <input
                                  type="hidden"
                                  name="invoice_id"
                                  value={String(
                                    invoice.id,
                                  )}
                                />

                                <input
                                  type="hidden"
                                  name="paid_on"
                                  value={
                                    today
                                  }
                                />

                                <button
                                  className="button ghost compact-button"
                                  type="submit"
                                >
                                  <CheckCircle2
                                    size={14}
                                  />
                                  Paguei
                                </button>
                              </form>
                            ) : paid ? (
                              <span className="badge green">
                                Pago
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </article>
            );
          },
        )}

        {groupedMonths.length ===
          0 && (
          <article className="panel">
            <div className="empty">
              <CreditCard size={28} />
              <strong>
                Nenhuma fatura
                informada
              </strong>
              Use Atualizar faturas
              para preencher os
              cartões.
            </div>
          </article>
        )}
      </section>
    </section>
  );
}
