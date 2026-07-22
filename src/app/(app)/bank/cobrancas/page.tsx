import Link from "next/link";
import {
  CheckCircle2,
  CircleDollarSign,
  Plus,
  ReceiptText,
  Save,
  WalletCards,
  X,
} from "lucide-react";
import {
  getBankAccounts,
  getBankCharges,
} from "@/lib/bank-data";
import {
  getBankMonthHomeData,
  type BankMonthCommitment,
} from "@/lib/bank-home-data";
import {
  formatCurrency,
  formatDateOnly,
} from "@/lib/format";
import { markBankCommitmentAsPaid } from "../actions";
import {
  createBankCharge,
  markBankChargePaid,
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

function statusLabel(
  status: unknown,
) {
  const value = String(
    status ?? "pending",
  );

  if (value === "overdue")
    return "Vencida";
  if (value === "paid")
    return "Paga";
  if (value === "partial")
    return "Parcial";
  if (value === "cancelled")
    return "Cancelada";

  return "Pendente";
}

function statusClass(
  status: unknown,
) {
  const value = String(
    status ?? "pending",
  );

  if (value === "overdue")
    return "red";
  if (value === "paid")
    return "green";
  if (value === "partial")
    return "orange";

  return "gray";
}

function monthCommitmentDate(
  item: BankMonthCommitment,
) {
  return item.dueMode ===
    "month_only"
    ? "Sem dia fixo"
    : item.dueDate
      ? formatDateOnly(
          item.dueDate,
        )
      : "—";
}

export default async function BankChargesPage({
  searchParams,
}: {
  searchParams: Promise<{
    acao?: string;
    salvo?: string;
    pagar?: string;
  }>;
}) {
  const params =
    await searchParams;

  const [
    charges,
    accounts,
    month,
  ] = await Promise.all([
    getBankCharges(),
    getBankAccounts(),
    getBankMonthHomeData(),
  ]);

  const creating =
    params.acao === "nova";

  const selectedCharge =
    params.pagar
      ? charges.find(
          (charge) =>
            String(charge.id) ===
            params.pagar,
        )
      : null;

  const selectedStatus =
    String(
      selectedCharge?.effective_status ??
        "",
    );

  const canPaySelected =
    Boolean(selectedCharge) &&
    ![
      "paid",
      "cancelled",
    ].includes(selectedStatus);

  const today = todayInBrazil();

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">
            Candinho Bank
          </div>

          <h1>
            Pagamentos e cobranças
          </h1>

          <p>
            A parte de cima mostra tudo
            que ainda precisa ser pago
            neste mês. A tabela de baixo
            guarda apenas cobranças
            avulsas cadastradas.
          </p>
        </div>

        <div className="bank-header-actions">
          <span className="bank-module-badge">
            <CircleDollarSign
              size={16}
            />
            {
              month.commitments
                .length
            }{" "}
            pendência(s) no mês
          </span>

          {!creating && (
            <Link
              className="button gold"
              href="/bank/cobrancas?acao=nova"
            >
              <Plus size={16} />
              Nova cobrança avulsa
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
              "paga"
                ? "Pagamento registrado com sucesso."
                : "Cobrança cadastrada com sucesso."}
            </strong>

            <span>
              O Dashboard já usa o
              novo estado.
            </span>
          </div>
        </div>
      )}

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>
              Pendências de{" "}
              {month.monthLabel}
            </h2>

            <p>
              Mensalidades, faturas,
              dívidas e cobranças aparecem
              juntas aqui. Pendências sem
              dia fixo não são tratadas
              como atrasadas.
            </p>
          </div>

          <span className="badge gold">
            {formatCurrency(
              month.monthCommitmentTotal,
            )}
          </span>
        </div>

        {month.commitments.length ===
        0 ? (
          <div className="empty">
            <CheckCircle2
              size={28}
            />

            <strong>
              Nenhum pagamento pendente
              neste mês
            </strong>

            O que já foi pago saiu da
            fila mensal.
          </div>
        ) : (
          <div className="bank-charge-list">
            {month.commitments.map(
              (item) => (
                <div
                  className="bank-charge-item"
                  key={item.id}
                >
                  <div className="bank-charge-date">
                    <strong>
                      {item.dueMode ===
                      "month_only"
                        ? "Mês"
                        : item.dueDate
                          ? formatDateOnly(
                              item.dueDate,
                            ).slice(
                              0,
                              5,
                            )
                          : "—"}
                    </strong>

                    <span>
                      {item.origin ??
                        "Geral"}
                    </span>
                  </div>

                  <div className="bank-charge-main">
                    <strong>
                      {item.title}
                    </strong>

                    <span>
                      {monthCommitmentDate(
                        item,
                      )}
                    </span>
                  </div>

                  <div className="bank-charge-value">
                    <strong>
                      {formatCurrency(
                        item.amount,
                      )}
                    </strong>
                  </div>

                  <form
                    action={
                      markBankCommitmentAsPaid
                    }
                  >
                    <input
                      type="hidden"
                      name="commitment_key"
                      value={item.id}
                    />

                    <input
                      type="hidden"
                      name="reference_month"
                      value={
                        month.referenceMonth
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
                </div>
              ),
            )}
          </div>
        )}
      </article>

      {creating && (
        <article className="panel bank-charge-form-panel">
          <div className="panel-head">
            <div>
              <h2>
                Nova cobrança avulsa
              </h2>

              <p>
                Use para algo com valor e
                vencimento específicos que
                não seja uma mensalidade
                recorrente.
              </p>
            </div>

            <Link
              className="icon-link"
              href="/bank/cobrancas"
            >
              <X size={17} />
            </Link>
          </div>

          <form
            action={createBankCharge}
          >
            <div className="bank-charge-form-grid">
              <label className="field bank-charge-form-wide">
                <span>
                  Nome da cobrança
                </span>

                <input
                  className="input"
                  name="title"
                  placeholder="Ex.: DAS CNPJ"
                  required
                />
              </label>

              <label className="field">
                <span>Valor</span>
                <div className="bank-money-input">
                  <b>R$</b>
                  <input
                    className="input"
                    inputMode="decimal"
                    name="amount"
                    required
                  />
                </div>
              </label>

              <label className="field">
                <span>
                  Vencimento
                </span>
                <input
                  className="input"
                  type="date"
                  name="due_date"
                  defaultValue={today}
                  required
                />
              </label>

              <label className="field">
                <span>Origem</span>
                <select
                  className="input"
                  name="origin"
                  defaultValue="Pessoal"
                >
                  <option value="Pessoal">
                    Pessoal
                  </option>
                  <option value="Candinho Company">
                    Candinho Company
                  </option>
                  <option value="Candinho Suplementos">
                    Candinho Suplementos
                  </option>
                  <option value="Candinho Fitness">
                    Candinho Fitness
                  </option>
                  <option value="Outro">
                    Outro
                  </option>
                </select>
              </label>

              <label className="field">
                <span>
                  Categoria
                </span>
                <input
                  className="input"
                  name="category"
                />
              </label>

              <label className="field bank-charge-form-wide">
                <span>
                  Descrição
                </span>
                <textarea
                  className="input bank-textarea"
                  name="description"
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
                href="/bank/cobrancas"
              >
                Cancelar
              </Link>

              <button
                className="button gold"
                type="submit"
              >
                <Save size={16} />
                Salvar cobrança
              </button>
            </div>
          </form>
        </article>
      )}

      {selectedCharge &&
        canPaySelected && (
          <article className="panel bank-charge-payment-panel">
            <div className="panel-head">
              <div>
                <h2>
                  Registrar pagamento
                </h2>
                <p>
                  Marque a cobrança como
                  paga e, se desejar,
                  informe a conta usada.
                </p>
              </div>

              <Link
                className="icon-link"
                href="/bank/cobrancas"
              >
                <X size={17} />
              </Link>
            </div>

            <form
              action={
                markBankChargePaid
              }
            >
              <input
                type="hidden"
                name="charge_id"
                value={String(
                  selectedCharge.id,
                )}
              />

              <div className="bank-charge-payment-fields">
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

                <label className="field">
                  <span>
                    Conta usada
                  </span>
                  <select
                    className="input"
                    name="payment_account_id"
                    defaultValue=""
                  >
                    <option value="">
                      Não informar conta
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
              </div>

              <div className="bank-balance-update-actions">
                <Link
                  className="button ghost"
                  href="/bank/cobrancas"
                >
                  Cancelar
                </Link>

                <button
                  className="button gold"
                  type="submit"
                >
                  <CheckCircle2
                    size={16}
                  />
                  Confirmar pagamento
                </button>
              </div>
            </form>
          </article>
        )}

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>
              Cobranças avulsas
              cadastradas
            </h2>

            <p>
              Esta lista pode estar vazia
              mesmo quando existem contas
              do mês: mensalidades,
              faturas e parcelas são
              compromissos de outras
              categorias.
            </p>
          </div>

          <strong>
            {charges.length}
          </strong>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cobrança</th>
                <th>Origem</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>
                  Valor restante
                </th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {charges.map(
                (charge) => {
                  const status =
                    String(
                      charge.effective_status ??
                        "pending",
                    );

                  const canPay =
                    ![
                      "paid",
                      "cancelled",
                    ].includes(
                      status,
                    );

                  return (
                    <tr
                      key={String(
                        charge.id,
                      )}
                    >
                      <td>
                        <div className="cell-main">
                          {String(
                            charge.title ??
                              "Cobrança",
                          )}
                        </div>
                        <div className="cell-sub">
                          {String(
                            charge.category ??
                              "Sem categoria",
                          )}
                        </div>
                      </td>

                      <td>
                        {String(
                          charge.origin ??
                            "—",
                        )}
                      </td>

                      <td>
                        {formatDateOnly(
                          String(
                            charge.due_date ??
                              "",
                          ),
                        )}
                      </td>

                      <td>
                        <span
                          className={`badge ${statusClass(
                            status,
                          )}`}
                        >
                          {statusLabel(
                            status,
                          )}
                        </span>
                      </td>

                      <td className="amount">
                        {formatCurrency(
                          Number(
                            charge.remaining_amount ??
                              0,
                          ),
                        )}
                      </td>

                      <td>
                        {canPay ? (
                          <Link
                            className="button ghost bank-charge-pay-button"
                            href={`/bank/cobrancas?pagar=${encodeURIComponent(
                              String(
                                charge.id,
                              ),
                            )}`}
                          >
                            <WalletCards
                              size={14}
                            />
                            Marcar como
                            pago
                          </Link>
                        ) : (
                          <span className="bank-charge-action-done">
                            <ReceiptText
                              size={14}
                            />
                            Finalizada
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                },
              )}

              {charges.length ===
                0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      <ReceiptText
                        size={28}
                      />
                      <strong>
                        Nenhuma cobrança
                        avulsa
                      </strong>
                      Isso não significa
                      que o mês está sem
                      contas. Veja as
                      pendências mensais
                      acima.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
