import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  HandCoins,
  Handshake,
  History,
  Plus,
  Save,
  WalletCards,
  X,
} from "lucide-react";
import {
  getBankAccounts,
  getBankDebts,
} from "@/lib/bank-data";
import {
  formatCurrency,
  formatDateOnly,
} from "@/lib/format";
import {
  adjustBankDebtHistory,
  createBankDebt,
  payBankDebtInstallment,
  postponeBankDebtPayment,
} from "./actions";

function todayInBrazil() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

function debtTypeLabel(
  value: unknown,
) {
  return String(
    value ?? "loan",
  ) === "note"
    ? "Notinha"
    : "Empréstimo";
}

function debtStatusLabel(
  value: unknown,
) {
  const status = String(
    value ?? "active",
  );

  if (status === "paid")
    return "Quitado";
  if (status === "paused")
    return "Pausado";
  if (status === "cancelled")
    return "Cancelado";
  if (status === "overdue")
    return "Atrasado";

  return "Ativo";
}

function debtStatusClass(
  value: unknown,
) {
  const status = String(
    value ?? "active",
  );

  if (status === "paid")
    return "green";
  if (status === "overdue")
    return "red";
  if (status === "paused")
    return "orange";

  return "gray";
}

function referenceMonth(
  value: unknown,
) {
  const date =
    typeof value === "string"
      ? value
      : "";

  return date.length >= 7
    ? date.slice(0, 7)
    : "";
}

export default async function BankDebtsPage({
  searchParams,
}: {
  searchParams: Promise<{
    acao?: string;
    salvo?: string;
    pagar?: string;
    adiar?: string;
    ajustar?: string;
  }>;
}) {
  const params =
    await searchParams;

  const [debts, accounts] =
    await Promise.all([
      getBankDebts(),
      getBankAccounts(),
    ]);

  const creating =
    params.acao === "nova";

  const selectedPaymentDebt =
    params.pagar
      ? debts.find(
          (debt) =>
            String(debt.id) ===
            params.pagar,
        )
      : null;

  const selectedPostponeDebt =
    params.adiar
      ? debts.find(
          (debt) =>
            String(debt.id) ===
            params.adiar,
        )
      : null;

  const selectedAdjustmentDebt =
    params.ajustar
      ? debts.find(
          (debt) =>
            String(debt.id) ===
            params.ajustar,
        )
      : null;

  const today = todayInBrazil();

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">
            Candinho Bank
          </div>

          <h1>
            Empréstimos e Notinhas
          </h1>

          <p>
            Acompanhe saldo restante,
            pagamentos reais e pendências
            mensais. O ajuste histórico é
            uma ferramenta de conciliação
            inicial, não uma rotina diária.
          </p>
        </div>

        <div className="bank-header-actions">
          <span className="bank-module-badge">
            <Handshake size={16} />
            {debts.length} registros
          </span>

          {!creating && (
            <Link
              className="button gold"
              href="/bank/emprestimos?acao=nova"
            >
              <Plus size={16} />
              Nova dívida
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
              "ajustada"
                ? "Histórico conciliado com sucesso."
                : params.salvo ===
                    "paga"
                  ? "Pagamento registrado com sucesso."
                  : params.salvo ===
                      "adiada"
                    ? "Pagamento adiado com sucesso."
                    : "Dívida cadastrada com sucesso."}
            </strong>

            <span>
              O Dashboard e as
              projeções já usam o novo
              estado.
            </span>
          </div>
        </div>
      )}

      {creating && (
        <article className="panel bank-debt-form-panel">
          <div className="panel-head">
            <div>
              <h2>Nova dívida</h2>
              <p>
                Use Empréstimo para
                dívidas parceladas e
                Notinha para valores
                informais.
              </p>
            </div>

            <Link
              className="icon-link"
              href="/bank/emprestimos"
              aria-label="Fechar cadastro"
            >
              <X size={17} />
            </Link>
          </div>

          <form
            action={createBankDebt}
          >
            <div className="bank-debt-form-grid">
              <label className="field bank-debt-form-wide">
                <span>
                  Nome da dívida
                </span>
                <input
                  className="input"
                  name="name"
                  placeholder="Ex.: Empréstimo Ian"
                  required
                />
              </label>

              <label className="field">
                <span>Tipo</span>
                <select
                  className="select"
                  name="debt_type"
                  defaultValue="loan"
                >
                  <option value="loan">
                    Empréstimo
                  </option>
                  <option value="note">
                    Notinha
                  </option>
                </select>
              </label>

              <label className="field">
                <span>
                  Credor / para quem
                  devo
                </span>
                <input
                  className="input"
                  name="creditor_name"
                />
              </label>

              <label className="field">
                <span>
                  Valor total
                </span>
                <div className="bank-money-input">
                  <b>R$</b>
                  <input
                    className="input"
                    inputMode="decimal"
                    name="original_amount"
                    required
                  />
                </div>
              </label>

              <label className="field">
                <span>
                  Parcela planejada
                </span>
                <div className="bank-money-input">
                  <b>R$</b>
                  <input
                    className="input"
                    inputMode="decimal"
                    name="monthly_amount"
                  />
                </div>
              </label>

              <label className="field">
                <span>
                  Data inicial
                </span>
                <input
                  className="input"
                  type="date"
                  name="start_date"
                  defaultValue={today}
                />
              </label>

              <label className="field">
                <span>
                  Próximo vencimento
                </span>
                <input
                  className="input"
                  type="date"
                  name="next_due_date"
                />
              </label>

              <label className="field bank-debt-form-wide">
                <span>Origem</span>
                <input
                  className="input"
                  name="origin"
                />
              </label>

              <label className="field bank-debt-form-wide">
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
                href="/bank/emprestimos"
              >
                Cancelar
              </Link>

              <button
                className="button gold"
                type="submit"
              >
                <Save size={16} />
                Salvar dívida
              </button>
            </div>
          </form>
        </article>
      )}

      {selectedPaymentDebt && (
        <article className="panel bank-debt-action-panel">
          <div className="panel-head">
            <div>
              <h2>
                Registrar pagamento
              </h2>

              <p>
                O valor pago será
                abatido do saldo
                restante.
              </p>
            </div>

            <Link
              className="icon-link"
              href="/bank/emprestimos"
            >
              <X size={17} />
            </Link>
          </div>

          <form
            action={
              payBankDebtInstallment
            }
          >
            <input
              type="hidden"
              name="debt_id"
              value={String(
                selectedPaymentDebt.id,
              )}
            />

            <div className="bank-debt-action-fields">
              <label className="field">
                <span>
                  Valor pago
                </span>
                <div className="bank-money-input">
                  <b>R$</b>
                  <input
                    className="input"
                    inputMode="decimal"
                    name="amount"
                    placeholder={
                      Number(
                        selectedPaymentDebt.monthly_amount ??
                          0,
                      ) > 0
                        ? String(
                            Number(
                              selectedPaymentDebt.monthly_amount,
                            ).toFixed(
                              2,
                            ),
                          ).replace(
                            ".",
                            ",",
                          )
                        : "Vazio = quitar restante"
                    }
                  />
                </div>
              </label>

              <label className="field">
                <span>
                  Data do pagamento
                </span>
                <input
                  className="input"
                  type="date"
                  name="paid_on"
                  defaultValue={today}
                  required
                />
              </label>

              <label className="field bank-debt-form-wide">
                <span>
                  Conta usada
                </span>

                <select
                  className="select"
                  name="payment_account_id"
                  defaultValue=""
                >
                  <option value="">
                    Não informar
                  </option>

                  {accounts.map(
                    (account) => (
                      <option
                        key={String(
                          account.id,
                        )}
                        value={String(
                          account.id,
                        )}
                      >
                        {String(
                          account.name ??
                            "Conta",
                        )}{" "}
                        —{" "}
                        {formatCurrency(
                          Number(
                            account.balance ??
                              0,
                          ),
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="field bank-debt-form-wide">
                <span>
                  Observação
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
                href="/bank/emprestimos"
              >
                Cancelar
              </Link>

              <button
                className="button gold"
                type="submit"
              >
                <WalletCards
                  size={16}
                />
                Confirmar pagamento
              </button>
            </div>
          </form>
        </article>
      )}

      {selectedAdjustmentDebt && (
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>
                Ajustar histórico
              </h2>

              <p>
                Use uma única vez para
                informar quanto já havia
                sido pago antes do
                controle atual. Nenhum
                valor é inventado pelo
                sistema.
              </p>
            </div>

            <Link
              className="icon-link"
              href="/bank/emprestimos"
            >
              <X size={17} />
            </Link>
          </div>

          <form
            action={
              adjustBankDebtHistory
            }
          >
            <input
              type="hidden"
              name="debt_id"
              value={String(
                selectedAdjustmentDebt.id,
              )}
            />

            <div className="panel-body form-grid-two">
              <label className="field">
                <span>
                  Total já pago até hoje
                </span>

                <div className="bank-money-input">
                  <b>R$</b>
                  <input
                    className="input"
                    name="total_paid"
                    inputMode="decimal"
                    defaultValue={Number(
                      selectedAdjustmentDebt.total_paid ??
                        0,
                    )
                      .toFixed(2)
                      .replace(
                        ".",
                        ",",
                      )}
                    required
                  />
                </div>

                <small>
                  Valor original:{" "}
                  {formatCurrency(
                    Number(
                      selectedAdjustmentDebt.original_amount ??
                        0,
                    ),
                  )}
                </small>
              </label>

              <label className="field">
                <span>
                  Forma de vencimento
                </span>

                <select
                  className="select"
                  name="due_mode"
                  defaultValue={String(
                    selectedAdjustmentDebt.due_mode ??
                      "fixed_day",
                  )}
                >
                  <option value="fixed_day">
                    Tem uma data fixa
                  </option>

                  <option value="month_only">
                    Pendência do mês ·
                    sem dia fixo
                  </option>
                </select>
              </label>

              <label className="field">
                <span>
                  Próxima data fixa
                </span>

                <input
                  className="input"
                  type="date"
                  name="next_due_date"
                  defaultValue={
                    String(
                      selectedAdjustmentDebt.due_mode ??
                        "fixed_day",
                    ) ===
                    "fixed_day"
                      ? String(
                          selectedAdjustmentDebt.next_due_date ??
                            "",
                        )
                      : ""
                  }
                />

                <small>
                  Preencha quando a
                  dívida tiver dia
                  específico.
                </small>
              </label>

              <label className="field">
                <span>
                  Próximo mês de
                  referência
                </span>

                <input
                  className="input"
                  type="month"
                  name="next_reference_month"
                  defaultValue={
                    String(
                      selectedAdjustmentDebt.due_mode ??
                        "",
                    ) ===
                    "month_only"
                      ? referenceMonth(
                          selectedAdjustmentDebt.next_due_date,
                        )
                      : ""
                  }
                />

                <small>
                  Use quando o acerto
                  pode acontecer em
                  qualquer dia do mês.
                </small>
              </label>

              <label className="field field-span-two">
                <span>
                  Observação do acerto
                </span>
                <textarea
                  className="input bank-textarea"
                  name="notes"
                  placeholder="Ex.: Corrigindo as parcelas que já estavam pagas antes de começar a usar o Bank."
                />
              </label>
            </div>

            <div className="bank-balance-update-actions">
              <Link
                className="button ghost"
                href="/bank/emprestimos"
              >
                Cancelar
              </Link>

              <button
                className="button gold"
                type="submit"
              >
                <History size={16} />
                Salvar acerto
                histórico
              </button>
            </div>
          </form>
        </article>
      )}

      {selectedPostponeDebt && (
        <article className="panel bank-debt-action-panel">
          <div className="panel-head">
            <div>
              <h2>
                Adiar pagamento
              </h2>
              <p>
                Move o próximo
                vencimento em um mês
                sem alterar o saldo.
              </p>
            </div>
          </div>

          <form
            action={
              postponeBankDebtPayment
            }
          >
            <input
              type="hidden"
              name="debt_id"
              value={String(
                selectedPostponeDebt.id,
              )}
            />

            <div className="panel-body">
              <label className="field">
                <span>
                  Motivo /
                  observação
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
                href="/bank/emprestimos"
              >
                Cancelar
              </Link>

              <button
                className="button gold"
                type="submit"
              >
                <CalendarClock
                  size={16}
                />
                Adiar 1 mês
              </button>
            </div>
          </form>
        </article>
      )}

      <div className="bank-card-grid">
        {debts.map((debt) => {
          const status = String(
            debt.effective_status ??
              debt.status ??
              "active",
          );

          const dueMode =
            String(
              debt.due_mode ??
                "fixed_day",
            );

          const canAct = ![
            "paid",
            "cancelled",
          ].includes(status);

          const hasDueDate =
            Boolean(
              debt.next_due_date,
            );

          return (
            <article
              className="panel bank-detail-card bank-debt-card"
              key={String(debt.id)}
            >
              <div className="panel-body">
                <div className="bank-detail-card-head">
                  <div>
                    <span>
                      {debtTypeLabel(
                        debt.debt_type,
                      )}
                    </span>

                    <h2>
                      {String(
                        debt.name ??
                          "Dívida",
                      )}
                    </h2>

                    {Boolean(
                      debt.creditor_name,
                    ) && (
                      <small>
                        Credor:{" "}
                        {String(
                          debt.creditor_name,
                        )}
                      </small>
                    )}
                  </div>

                  <span
                    className={`badge ${debtStatusClass(
                      status,
                    )}`}
                  >
                    {debtStatusLabel(
                      status,
                    )}
                  </span>
                </div>

                <div className="bank-detail-values">
                  <div>
                    <span>
                      Saldo restante
                    </span>
                    <strong>
                      {formatCurrency(
                        Number(
                          debt.remaining_amount ??
                            0,
                        ),
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Parcela planejada
                    </span>
                    <strong>
                      {formatCurrency(
                        Number(
                          debt.monthly_amount ??
                            0,
                        ),
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Próximo pagamento
                    </span>

                    <strong>
                      {dueMode ===
                      "month_only"
                        ? hasDueDate
                          ? `Mês ${referenceMonth(
                              debt.next_due_date,
                            )
                              .split(
                                "-",
                              )
                              .reverse()
                              .join(
                                "/",
                              )} · sem dia fixo`
                          : "Sem referência"
                        : hasDueDate
                          ? formatDateOnly(
                              String(
                                debt.next_due_date,
                              ),
                            )
                          : "—"}
                    </strong>
                  </div>
                </div>

                <div className="bank-debt-progress">
                  <div>
                    <span>Pago</span>
                    <strong>
                      {formatCurrency(
                        Number(
                          debt.total_paid ??
                            0,
                        ),
                      )}{" "}
                      de{" "}
                      {formatCurrency(
                        Number(
                          debt.original_amount ??
                            0,
                        ),
                      )}
                    </strong>
                  </div>

                  <div className="bank-debt-progress-track">
                    <i
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            Number(
                              debt.original_amount ??
                                0,
                            ) > 0
                              ? (Number(
                                  debt.total_paid ??
                                    0,
                                ) /
                                  Number(
                                    debt.original_amount ??
                                      1,
                                  )) *
                                100
                              : 0,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bank-debt-card-actions">
                  {canAct && (
                    <Link
                      className="button gold"
                      href={`/bank/emprestimos?pagar=${encodeURIComponent(
                        String(
                          debt.id,
                        ),
                      )}`}
                    >
                      <HandCoins
                        size={15}
                      />
                      Paguei
                    </Link>
                  )}

                  <Link
                    className="button ghost"
                    href={`/bank/emprestimos?ajustar=${encodeURIComponent(
                      String(debt.id),
                    )}`}
                  >
                    <History
                      size={15}
                    />
                    Ajustar histórico
                  </Link>

                  {canAct &&
                    hasDueDate &&
                    dueMode ===
                      "fixed_day" && (
                      <Link
                        className="button ghost"
                        href={`/bank/emprestimos?adiar=${encodeURIComponent(
                          String(
                            debt.id,
                          ),
                        )}`}
                      >
                        <CalendarClock
                          size={15}
                        />
                        Adiar pagamento
                      </Link>
                    )}
                </div>
              </div>
            </article>
          );
        })}

        {debts.length === 0 && (
          <article className="panel">
            <div className="empty">
              <strong>
                Nenhum empréstimo ou
                notinha cadastrado
              </strong>
              Use Nova dívida para
              cadastrar o primeiro
              registro.
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
