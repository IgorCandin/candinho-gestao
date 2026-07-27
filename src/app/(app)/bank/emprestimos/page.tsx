import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  History,
  Plus,
  Save,
  WalletCards,
  X,
} from "lucide-react";
import { BankPaymentSubmitButton } from "@/components/bank-payment-submit-button";
import { getBankAccounts, getBankDebts } from "@/lib/bank-data";
import { formatCurrency } from "@/lib/format";
import {
  adjustBankDebtHistory,
  createBankDebt,
  payBankDebtInstallment,
  postponeBankDebtPayment,
} from "./actions";
import { correctBankDebtTotalPaid } from "./correction-actions";

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

function effectiveStatus(debt: Record<string, unknown>) {
  return String(debt.effective_status ?? debt.status ?? "active");
}

function statusLabel(value: unknown) {
  const status = String(value ?? "active");
  if (status === "paid") return "Quitado";
  if (status === "paused") return "Pausado";
  if (status === "cancelled") return "Cancelado";
  if (status === "overdue") return "Atrasado";
  return "Ativo";
}

function statusClass(value: unknown) {
  const status = String(value ?? "active");
  if (status === "paid") return "green";
  if (status === "overdue") return "red";
  if (status === "paused") return "orange";
  return "gray";
}

function referenceMonth(value: unknown) {
  const date = typeof value === "string" ? value : "";
  return date.length >= 7 ? date.slice(0, 7) : "";
}

function DebtList({
  title,
  description,
  debts,
  allowPayment,
}: {
  title: string;
  description: string;
  debts: Record<string, unknown>[];
  allowPayment: boolean;
}) {
  return (
    <article className="panel" style={{ marginTop: 18 }}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="bank-module-badge">
          <WalletCards size={15} />
          {debts.length}
        </span>
      </div>

      <div className="panel-body">
        {debts.length === 0 ? (
          <div className="bank-empty-state">Nenhum item nesta área.</div>
        ) : (
          <div className="bank-income-list">
            {debts.map((debt) => {
              const effective = effectiveStatus(debt);
              const open = allowPayment && !["paid", "cancelled"].includes(effective);

              return (
                <div className="bank-income-list-item" key={String(debt.id)}>
                  <div>
                    <strong>{String(debt.name ?? "Dívida")}</strong>
                    <span>
                      {debtTypeLabel(debt.debt_type)} ·{" "}
                      {String(debt.creditor_name ?? debt.origin ?? "Sem credor")}
                    </span>
                  </div>

                  <div>
                    <strong>{formatCurrency(Number(debt.remaining_amount ?? 0))}</strong>
                    <span>Pago: {formatCurrency(Number(debt.total_paid ?? 0))}</span>
                  </div>

                  <span className={`badge ${statusClass(effective)}`}>
                    {statusLabel(effective)}
                  </span>

                  <div className="bank-header-actions">
                    {open && (
                      <>
                        <Link
                          className="button ghost compact-button"
                          href={`/bank/emprestimos?pagar=${encodeURIComponent(String(debt.id))}`}
                        >
                          Pagar
                        </Link>
                        <Link
                          className="button ghost compact-button"
                          href={`/bank/emprestimos?adiar=${encodeURIComponent(String(debt.id))}`}
                        >
                          Adiar
                        </Link>
                      </>
                    )}

                    <Link
                      className="button ghost compact-button"
                      href={`/bank/emprestimos?ajustar=${encodeURIComponent(String(debt.id))}`}
                    >
                      Ajustar
                    </Link>
                    <Link
                      className="button ghost compact-button"
                      href={`/bank/emprestimos?corrigir=${encodeURIComponent(String(debt.id))}`}
                    >
                      Corrigir
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
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
    corrigir?: string;
  }>;
}) {
  const params = await searchParams;
  const [debts, accounts] = await Promise.all([getBankDebts(), getBankAccounts()]);
  const creating = params.acao === "nova";

  const openDebts = debts.filter((debt) => !["paid", "cancelled"].includes(effectiveStatus(debt)));
  const paidDebts = debts.filter((debt) => effectiveStatus(debt) === "paid");
  const cancelledDebts = debts.filter((debt) => effectiveStatus(debt) === "cancelled");

  const selectedPaymentDebt = params.pagar
    ? openDebts.find((debt) => String(debt.id) === params.pagar) ?? null
    : null;
  const selectedPostponeDebt = params.adiar
    ? openDebts.find((debt) => String(debt.id) === params.adiar) ?? null
    : null;
  const selectedAdjustmentDebt = params.ajustar
    ? debts.find((debt) => String(debt.id) === params.ajustar) ?? null
    : null;
  const selectedCorrectionDebt = params.corrigir
    ? debts.find((debt) => String(debt.id) === params.corrigir) ?? null
    : null;

  const today = todayInBrazil();
  const totalOriginal = debts.reduce(
    (sum, debt) => sum + Number(debt.original_amount ?? 0),
    0,
  );
  const totalPaid = debts.reduce((sum, debt) => sum + Number(debt.total_paid ?? 0), 0);
  const totalRemaining = debts.reduce(
    (sum, debt) => sum + Number(debt.remaining_amount ?? 0),
    0,
  );

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Empréstimos e Notinhas</h1>
          <p>Acompanhe saldo restante, pagamentos, próximos vencimentos e correções auditadas.</p>
        </div>

        {!creating && (
          <Link className="button gold" href="/bank/emprestimos?acao=nova">
            <Plus size={16} />
            Nova dívida
          </Link>
        )}
      </div>

      {params.salvo && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>
              {params.salvo === "corrigida"
                ? "Histórico corrigido com auditoria."
                : params.salvo === "ajustada"
                  ? "Histórico conciliado com sucesso."
                  : params.salvo === "paga"
                    ? "Pagamento registrado com sucesso."
                    : params.salvo === "adiada"
                      ? "Pagamento adiado com sucesso."
                      : "Dívida cadastrada com sucesso."}
            </strong>
            <span>Dashboard e projeções já usam o estado atual.</span>
          </div>
        </div>
      )}

      <div className="grid stats-grid bank-stats-grid">
        <article className="stat-card">
          <div className="stat-head"><span>Total contratado</span></div>
          <div className="stat-value">{formatCurrency(totalOriginal)}</div>
          <div className="stat-note">Soma das dívidas cadastradas.</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>Total pago</span></div>
          <div className="stat-value">{formatCurrency(totalPaid)}</div>
          <div className="stat-note">Pagamentos confirmados e conciliações.</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>Saldo restante</span></div>
          <div className="stat-value">{formatCurrency(totalRemaining)}</div>
          <div className="stat-note">Valor ainda devido.</div>
        </article>
      </div>

      {creating && (
        <article className="panel bank-debt-form-panel">
          <div className="panel-head">
            <div>
              <h2>Nova dívida</h2>
              <p>Use Empréstimo para dívidas parceladas e Notinha para valores informais.</p>
            </div>
            <Link className="icon-link" href="/bank/emprestimos" aria-label="Fechar">
              <X size={17} />
            </Link>
          </div>

          <form action={createBankDebt}>
            <div className="bank-debt-form-grid">
              <label className="field bank-debt-form-wide">
                <span>Nome da dívida</span>
                <input className="input" name="name" required />
              </label>
              <label className="field">
                <span>Tipo</span>
                <select className="select" name="debt_type" defaultValue="loan">
                  <option value="loan">Empréstimo</option>
                  <option value="note">Notinha</option>
                </select>
              </label>
              <label className="field">
                <span>Credor</span>
                <input className="input" name="creditor_name" />
              </label>
              <label className="field">
                <span>Valor total</span>
                <div className="bank-money-input"><b>R$</b><input className="input" name="original_amount" inputMode="decimal" required /></div>
              </label>
              <label className="field">
                <span>Parcela planejada</span>
                <div className="bank-money-input"><b>R$</b><input className="input" name="monthly_amount" inputMode="decimal" /></div>
              </label>
              <label className="field">
                <span>Data inicial</span>
                <input className="input" name="start_date" type="date" defaultValue={today} />
              </label>
              <label className="field">
                <span>Próximo vencimento</span>
                <input className="input" name="next_due_date" type="date" />
              </label>
              <label className="field bank-debt-form-wide">
                <span>Origem</span>
                <input className="input" name="origin" />
              </label>
              <label className="field bank-debt-form-wide">
                <span>Observações</span>
                <textarea className="input bank-textarea" name="notes" />
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
              <p>Ao confirmar, o botão fica bloqueado até o servidor responder. Se a dívida for quitada, ela desce automaticamente para Quitados.</p>
            </div>
            <Link className="icon-link" href="/bank/emprestimos"><X size={17} /></Link>
          </div>

          <div className="bank-charge-payment-summary">
            <div><span>Dívida</span><strong>{String(selectedPaymentDebt.name)}</strong></div>
            <div><span>Saldo restante</span><strong>{formatCurrency(Number(selectedPaymentDebt.remaining_amount ?? 0))}</strong></div>
            <div><span>Parcela planejada</span><strong>{formatCurrency(Number(selectedPaymentDebt.monthly_amount ?? 0))}</strong></div>
          </div>

          <form action={payBankDebtInstallment}>
            <input type="hidden" name="debt_id" value={String(selectedPaymentDebt.id)} />
            <div className="bank-debt-form-grid">
              <label className="field">
                <span>Valor pago</span>
                <div className="bank-money-input"><b>R$</b><input className="input" name="amount" inputMode="decimal" placeholder="Vazio = parcela planejada" /></div>
              </label>
              <label className="field">
                <span>Data do pagamento</span>
                <input className="input" name="paid_on" type="date" defaultValue={today} required />
              </label>
              <label className="field bank-debt-form-wide">
                <span>Conta usada no pagamento</span>
                <select className="select" name="payment_account_id" defaultValue="">
                  <option value="">Não informar</option>
                  {accounts.map((account) => (
                    <option key={String(account.id)} value={String(account.id)}>
                      {String(account.name ?? "Conta")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field bank-debt-form-wide">
                <span>Observações</span>
                <textarea className="input bank-textarea" name="notes" />
              </label>
            </div>
            <div className="bank-balance-update-actions">
              <Link className="button ghost" href="/bank/emprestimos">Cancelar</Link>
              <BankPaymentSubmitButton />
            </div>
          </form>
        </article>
      )}

      {selectedPostponeDebt && (
        <article className="panel bank-debt-action-panel">
          <div className="panel-head">
            <div><h2>Adiar pagamento</h2><p>Move a próxima parcela para o mês seguinte.</p></div>
            <Link className="icon-link" href="/bank/emprestimos"><X size={17} /></Link>
          </div>
          <form action={postponeBankDebtPayment}>
            <input type="hidden" name="debt_id" value={String(selectedPostponeDebt.id)} />
            <label className="field">
              <span>Observação</span>
              <textarea className="input bank-textarea" name="notes" placeholder="Motivo do adiamento..." />
            </label>
            <div className="bank-balance-update-actions">
              <Link className="button ghost" href="/bank/emprestimos">Cancelar</Link>
              <button className="button gold" type="submit"><CalendarClock size={16} />Confirmar adiamento</button>
            </div>
          </form>
        </article>
      )}

      {selectedAdjustmentDebt && (
        <article className="panel bank-debt-action-panel">
          <div className="panel-head">
            <div><h2>Ajustar histórico</h2><p>Conciliação normal: pode aumentar o total pago, mas nunca apaga pagamentos já confirmados.</p></div>
            <Link className="icon-link" href="/bank/emprestimos"><X size={17} /></Link>
          </div>
          <form action={adjustBankDebtHistory}>
            <input type="hidden" name="debt_id" value={String(selectedAdjustmentDebt.id)} />
            <div className="bank-debt-form-grid">
              <label className="field">
                <span>Total já pago</span>
                <div className="bank-money-input"><b>R$</b><input className="input" name="total_paid" inputMode="decimal" defaultValue={Number(selectedAdjustmentDebt.total_paid ?? 0).toFixed(2).replace(".", ",")} required /></div>
              </label>
              <label className="field">
                <span>Modo de vencimento</span>
                <select className="select" name="due_mode" defaultValue={String(selectedAdjustmentDebt.due_mode ?? "fixed_day") === "month_only" ? "month_only" : "fixed_day"}>
                  <option value="fixed_day">Data fixa</option>
                  <option value="month_only">Somente mês</option>
                </select>
              </label>
              <label className="field">
                <span>Próximo mês</span>
                <input className="input" type="month" name="next_reference_month" defaultValue={referenceMonth(selectedAdjustmentDebt.next_due_date)} />
              </label>
              <label className="field">
                <span>Próxima data</span>
                <input className="input" type="date" name="next_due_date" defaultValue={String(selectedAdjustmentDebt.next_due_date ?? "")} />
              </label>
              <label className="field bank-debt-form-wide">
                <span>Observações</span>
                <textarea className="input bank-textarea" name="notes" />
              </label>
            </div>
            <div className="bank-balance-update-actions">
              <Link className="button ghost" href="/bank/emprestimos">Cancelar</Link>
              <Link className="button ghost" href={`/bank/emprestimos?corrigir=${encodeURIComponent(String(selectedAdjustmentDebt.id))}`}>Correção auditada</Link>
              <button className="button gold" type="submit"><History size={16} />Salvar conciliação</button>
            </div>
          </form>
        </article>
      )}

      {selectedCorrectionDebt && (
        <article className="panel bank-debt-action-panel" style={{ borderColor: "rgba(239,100,100,.35)" }}>
          <div className="panel-head">
            <div><h2>Correção auditada do total pago</h2><p>Use somente para corrigir um erro histórico. É possível reduzir ou zerar o valor pago, sempre com justificativa.</p></div>
            <Link className="icon-link" href="/bank/emprestimos"><X size={17} /></Link>
          </div>
          <div className="bank-charge-payment-summary">
            <div><span>Dívida</span><strong>{String(selectedCorrectionDebt.name)}</strong></div>
            <div><span>Total atual pago</span><strong>{formatCurrency(Number(selectedCorrectionDebt.total_paid ?? 0))}</strong></div>
            <div><span>Saldo atual</span><strong>{formatCurrency(Number(selectedCorrectionDebt.remaining_amount ?? 0))}</strong></div>
          </div>
          <form action={correctBankDebtTotalPaid}>
            <input type="hidden" name="debt_id" value={String(selectedCorrectionDebt.id)} />
            <div className="bank-debt-form-grid">
              <label className="field">
                <span>Total pago correto</span>
                <div className="bank-money-input"><b>R$</b><input className="input" name="total_paid" inputMode="decimal" defaultValue={Number(selectedCorrectionDebt.total_paid ?? 0).toFixed(2).replace(".", ",")} required /></div>
              </label>
              <label className="field bank-debt-form-wide">
                <span>Motivo da correção</span>
                <textarea className="input bank-textarea" name="reason" placeholder="Ex.: O pagamento de R$ 100 foi lançado por engano." required />
              </label>
              <label className="bank-check-option bank-debt-form-wide">
                <input type="checkbox" name="confirm_correction" value="yes" required />
                <span><strong>Confirmo que é uma correção de histórico</strong><small>A alteração será registrada na auditoria da dívida.</small></span>
              </label>
            </div>
            <div className="bank-balance-update-actions">
              <Link className="button ghost" href="/bank/emprestimos">Cancelar</Link>
              <button className="button gold" type="submit"><History size={16} />Corrigir histórico</button>
            </div>
          </form>
        </article>
      )}

      <DebtList
        title="Em aberto"
        description="Notinhas e empréstimos que ainda têm saldo. Pagamentos quitados saem daqui automaticamente."
        debts={openDebts}
        allowPayment
      />

      <DebtList
        title="Quitados"
        description="Histórico das notinhas e empréstimos já pagos. Não há botão Pagar nesta área."
        debts={paidDebts}
        allowPayment={false}
      />

      {cancelledDebts.length > 0 && (
        <DebtList
          title="Cancelados"
          description="Itens cancelados preservados apenas para histórico e auditoria."
          debts={cancelledDebts}
          allowPayment={false}
        />
      )}
    </section>
  );
}
