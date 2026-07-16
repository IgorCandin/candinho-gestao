import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  HandCoins,
  Handshake,
  Plus,
  Save,
  WalletCards,
  X,
} from "lucide-react";
import { getBankAccounts, getBankDebts } from "@/lib/bank-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import {
  createBankDebt,
  payBankDebtInstallment,
  postponeBankDebtPayment,
} from "./actions";

function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function debtTypeLabel(value: unknown) {
  return String(value ?? "loan") === "note" ? "Notinha" : "Empréstimo";
}

function debtStatusLabel(value: unknown) {
  const status = String(value ?? "active");
  if (status === "paid") return "Quitado";
  if (status === "paused") return "Pausado";
  if (status === "cancelled") return "Cancelado";
  if (status === "overdue") return "Atrasado";
  return "Ativo";
}

function debtStatusClass(value: unknown) {
  const status = String(value ?? "active");
  if (status === "paid") return "green";
  if (status === "overdue") return "red";
  if (status === "paused") return "orange";
  return "gray";
}

export default async function BankDebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string; salvo?: string; pagar?: string; adiar?: string }>;
}) {
  const params = await searchParams;
  const [debts, accounts] = await Promise.all([getBankDebts(), getBankAccounts()]);
  const creating = params.acao === "nova";
  const selectedPaymentDebt = params.pagar
    ? debts.find((debt) => String(debt.id) === params.pagar)
    : null;
  const selectedPostponeDebt = params.adiar
    ? debts.find((debt) => String(debt.id) === params.adiar)
    : null;
  const today = todayInBrazil();

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Empréstimos e Notinhas</h1>
          <p>Cadastre dívidas informais, registre pagamentos e adie parcelas sem alterar o saldo devido.</p>
        </div>
        <div className="bank-header-actions">
          <span className="bank-module-badge"><Handshake size={16} />{debts.length} registros</span>
          {!creating && (
            <Link className="button gold" href="/bank/emprestimos?acao=nova">
              <Plus size={16} />Nova dívida
            </Link>
          )}
        </div>
      </div>

      {params.salvo === "criada" && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>Dívida cadastrada com sucesso.</strong>
            <span>Ela já está sendo considerada no saldo total de dívidas e na projeção dos próximos meses.</span>
          </div>
        </div>
      )}

      {params.salvo === "paga" && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>Pagamento registrado com sucesso.</strong>
            <span>O saldo restante foi reduzido e o próximo vencimento avançou um mês.</span>
          </div>
        </div>
      )}

      {params.salvo === "adiada" && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>Pagamento adiado com sucesso.</strong>
            <span>O vencimento foi movido em um mês sem juros e sem aumentar o valor da dívida.</span>
          </div>
        </div>
      )}

      {creating && (
        <article className="panel bank-debt-form-panel">
          <div className="panel-head">
            <div>
              <h2>Nova dívida</h2>
              <p>Use Empréstimo para dívidas parceladas e Notinha para valores informais que você quer acompanhar separadamente.</p>
            </div>
            <Link className="icon-link" href="/bank/emprestimos" aria-label="Fechar cadastro"><X size={17} /></Link>
          </div>

          <form action={createBankDebt}>
            <div className="bank-debt-form-grid">
              <label className="field bank-debt-form-wide">
                <span>Nome da dívida</span>
                <input className="input" name="name" placeholder="Ex.: Empréstimo Ian" required />
              </label>

              <label className="field">
                <span>Tipo</span>
                <select className="select" name="debt_type" defaultValue="loan">
                  <option value="loan">Empréstimo</option>
                  <option value="note">Notinha</option>
                </select>
              </label>

              <label className="field">
                <span>Credor / para quem devo</span>
                <input className="input" name="creditor_name" placeholder="Ex.: Ian" />
              </label>

              <label className="field">
                <span>Valor total</span>
                <div className="bank-money-input">
                  <b>R$</b>
                  <input className="input" type="text" inputMode="decimal" name="original_amount" placeholder="0,00" required />
                </div>
              </label>

              <label className="field">
                <span>Parcela planejada</span>
                <div className="bank-money-input">
                  <b>R$</b>
                  <input className="input" type="text" inputMode="decimal" name="monthly_amount" placeholder="Ex.: 200,00" />
                </div>
              </label>

              <label className="field">
                <span>Data inicial</span>
                <input className="input" type="date" name="start_date" defaultValue={today} />
              </label>

              <label className="field">
                <span>Próximo vencimento</span>
                <input className="input" type="date" name="next_due_date" />
              </label>

              <label className="field bank-debt-form-wide">
                <span>Origem</span>
                <input className="input" name="origin" placeholder="Ex.: Pessoal, Candinho Company" />
              </label>

              <label className="field bank-debt-form-wide">
                <span>Observações</span>
                <textarea className="input bank-textarea" name="notes" placeholder="Detalhes do acordo, contexto da dívida, combinações..." />
              </label>
            </div>

            <div className="bank-balance-update-actions">
              <Link className="button ghost" href="/bank/emprestimos">Cancelar</Link>
              <button className="button gold" type="submit"><Save size={16} />Salvar dívida</button>
            </div>
          </form>
        </article>
      )}

      {selectedPaymentDebt && (
        <article className="panel bank-debt-action-panel">
          <div className="panel-head">
            <div>
              <h2>Registrar pagamento</h2>
              <p>O valor pago será abatido do saldo restante. Se deixar o valor em branco, será usada a parcela planejada.</p>
            </div>
            <Link className="icon-link" href="/bank/emprestimos" aria-label="Fechar pagamento"><X size={17} /></Link>
          </div>

          <div className="bank-debt-action-summary">
            <div><span>Dívida</span><strong>{String(selectedPaymentDebt.name ?? "Dívida")}</strong></div>
            <div><span>Saldo restante</span><strong>{formatCurrency(Number(selectedPaymentDebt.remaining_amount ?? 0))}</strong></div>
            <div><span>Parcela planejada</span><strong>{formatCurrency(Number(selectedPaymentDebt.monthly_amount ?? 0))}</strong></div>
            <div><span>Próximo vencimento</span><strong>{formatDateOnly(String(selectedPaymentDebt.next_due_date ?? ""))}</strong></div>
          </div>

          <form action={payBankDebtInstallment}>
            <input type="hidden" name="debt_id" value={String(selectedPaymentDebt.id)} />
            <div className="bank-debt-action-fields">
              <label className="field">
                <span>Valor pago</span>
                <div className="bank-money-input">
                  <b>R$</b>
                  <input
                    className="input"
                    type="text"
                    inputMode="decimal"
                    name="amount"
                    placeholder={Number(selectedPaymentDebt.monthly_amount ?? 0) > 0 ? String(Number(selectedPaymentDebt.monthly_amount).toFixed(2)).replace(".", ",") : "Deixe vazio para quitar o restante"}
                  />
                </div>
              </label>

              <label className="field">
                <span>Data do pagamento</span>
                <input className="input" type="date" name="paid_on" defaultValue={today} required />
              </label>

              <label className="field bank-debt-form-wide">
                <span>Conta usada no pagamento</span>
                <select className="select" name="payment_account_id" defaultValue="">
                  <option value="">Não informar</option>
                  {accounts.map((account) => (
                    <option key={String(account.id)} value={String(account.id)}>
                      {String(account.name ?? "Conta")} — {formatCurrency(Number(account.balance ?? 0))}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field bank-debt-form-wide">
                <span>Observação do pagamento</span>
                <textarea className="input bank-textarea" name="notes" placeholder="Opcional" />
              </label>
            </div>

            <div className="bank-balance-update-actions">
              <Link className="button ghost" href="/bank/emprestimos">Cancelar</Link>
              <button className="button gold" type="submit"><WalletCards size={16} />Confirmar pagamento</button>
            </div>
          </form>
        </article>
      )}

      {selectedPostponeDebt && (
        <article className="panel bank-debt-action-panel">
          <div className="panel-head">
            <div>
              <h2>Adiar pagamento</h2>
              <p>Essa ação só move o próximo vencimento em um mês. O saldo da dívida continua exatamente igual.</p>
            </div>
            <Link className="icon-link" href="/bank/emprestimos" aria-label="Fechar adiamento"><X size={17} /></Link>
          </div>

          <div className="bank-debt-postpone-warning">
            <Clock3 size={19} />
            <div>
              <strong>{String(selectedPostponeDebt.name ?? "Dívida")}</strong>
              <span>Vencimento atual: {formatDateOnly(String(selectedPostponeDebt.next_due_date ?? ""))}. Ao confirmar, será adiado em 1 mês sem juros.</span>
            </div>
          </div>

          <form action={postponeBankDebtPayment}>
            <input type="hidden" name="debt_id" value={String(selectedPostponeDebt.id)} />
            <div className="bank-debt-action-fields bank-debt-postpone-fields">
              <label className="field bank-debt-form-wide">
                <span>Motivo / observação</span>
                <textarea className="input bank-textarea" name="notes" placeholder="Ex.: Este mês não consegui realizar o pagamento." />
              </label>
            </div>
            <div className="bank-balance-update-actions">
              <Link className="button ghost" href="/bank/emprestimos">Cancelar</Link>
              <button className="button gold" type="submit"><CalendarClock size={16} />Adiar 1 mês</button>
            </div>
          </form>
        </article>
      )}

      <div className="bank-card-grid">
        {debts.map((debt) => {
          const status = String(debt.effective_status ?? debt.status ?? "active");
          const canAct = !["paid", "cancelled"].includes(status);
          const hasDueDate = Boolean(debt.next_due_date);
          return (
            <article className="panel bank-detail-card bank-debt-card" key={String(debt.id)}>
              <div className="panel-body">
                <div className="bank-detail-card-head">
                  <div>
                    <span>{debtTypeLabel(debt.debt_type)}</span>
                    <h2>{String(debt.name ?? "Dívida")}</h2>
                    {debt.creditor_name && <small>Credor: {String(debt.creditor_name)}</small>}
                  </div>
                  <span className={`badge ${debtStatusClass(status)}`}>{debtStatusLabel(status)}</span>
                </div>

                <div className="bank-detail-values">
                  <div><span>Saldo restante</span><strong>{formatCurrency(Number(debt.remaining_amount ?? 0))}</strong></div>
                  <div><span>Parcela planejada</span><strong>{formatCurrency(Number(debt.monthly_amount ?? 0))}</strong></div>
                  <div><span>Próximo pagamento</span><strong>{hasDueDate ? formatDateOnly(String(debt.next_due_date)) : "—"}</strong></div>
                </div>

                <div className="bank-debt-progress">
                  <div>
                    <span>Pago</span>
                    <strong>{formatCurrency(Number(debt.total_paid ?? 0))} de {formatCurrency(Number(debt.original_amount ?? 0))}</strong>
                  </div>
                  <div className="bank-debt-progress-track">
                    <i style={{ width: `${Math.min(100, Math.max(0, Number(debt.original_amount ?? 0) > 0 ? (Number(debt.total_paid ?? 0) / Number(debt.original_amount ?? 1)) * 100 : 0))}%` }} />
                  </div>
                </div>

                {canAct && (
                  <div className="bank-debt-card-actions">
                    <Link className="button gold" href={`/bank/emprestimos?pagar=${encodeURIComponent(String(debt.id))}`}>
                      <HandCoins size={15} />Paguei
                    </Link>
                    {hasDueDate && (
                      <Link className="button ghost" href={`/bank/emprestimos?adiar=${encodeURIComponent(String(debt.id))}`}>
                        <CalendarClock size={15} />Adiar pagamento
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}

        {debts.length === 0 && (
          <article className="panel">
            <div className="empty">
              <strong>Nenhum empréstimo ou notinha cadastrado</strong>
              Use Nova dívida para cadastrar o primeiro registro e acompanhar o saldo restante.
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
