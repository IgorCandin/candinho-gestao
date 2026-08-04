import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History,
  Plus,
  Save,
  WalletCards,
  X,
} from "lucide-react";
import { BankPaymentSubmitButton } from "@/components/bank-payment-submit-button";
import { getBankAccounts, getBankDebts } from "@/lib/bank-data";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import {
  adjustBankDebtHistory,
  createBankDebt,
  payBankDebtInstallment,
  postponeBankDebtPayment,
} from "./actions";
import { correctBankDebtTotalPaid } from "./correction-actions";



type BankDebtHistoryData = {
  payments: Array<{
    dueDate: string | null;
    actionType: string;
    amount: number;
    paidOn: string | null;
    previousDueDate: string | null;
    newDueDate: string | null;
    notes: string | null;
  }>;
  resolutions: Array<{
    referenceMonth: string;
    resolution: string;
    amountOverride: number | null;
    resolvedOn: string | null;
    notes: string | null;
  }>;
};

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

async function getBankDebtHistory(debtId: string): Promise<BankDebtHistoryData> {
  const supabase = await createClient();
  const [paymentsResult, resolutionsResult] = await Promise.all([
    supabase
      .from("bank_debt_payments")
      .select("due_date,action_type,amount,paid_on,previous_due_date,new_due_date,notes")
      .eq("debt_id", debtId)
      .order("due_date", { ascending: true }),
    supabase
      .from("bank_month_commitment_resolutions")
      .select("reference_month,resolution,amount_override,resolved_on,notes")
      .eq("commitment_key", `debt:${debtId}`)
      .order("reference_month", { ascending: true }),
  ]);

  if (paymentsResult.error) throw paymentsResult.error;
  if (resolutionsResult.error) throw resolutionsResult.error;

  return {
    payments: (paymentsResult.data ?? []).map((row) => ({
      dueDate: nullableText(row.due_date),
      actionType: String(row.action_type ?? ""),
      amount: Number(row.amount ?? 0),
      paidOn: nullableText(row.paid_on),
      previousDueDate: nullableText(row.previous_due_date),
      newDueDate: nullableText(row.new_due_date),
      notes: nullableText(row.notes),
    })),
    resolutions: (resolutionsResult.data ?? []).map((row) => ({
      referenceMonth: String(row.reference_month ?? ""),
      resolution: String(row.resolution ?? ""),
      amountOverride:
        row.amount_override === null || row.amount_override === undefined
          ? null
          : Number(row.amount_override),
      resolvedOn: nullableText(row.resolved_on),
      notes: nullableText(row.notes),
    })),
  };
}

function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function currentYearInBrazil() {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
    }).format(new Date()),
  );
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

const monthNames = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

type DebtCalendarMonth = {
  key: string;
  label: string;
  status: "paid" | "pending" | "future" | "postponed" | "inactive";
  amount: number | null;
  paidOn: string | null;
};

function buildDebtCalendar(
  debt: Record<string, unknown>,
  history: BankDebtHistoryData,
  year: number,
): DebtCalendarMonth[] {
  const todayMonth = todayInBrazil().slice(0, 7);
  const startMonth = referenceMonth(debt.start_date || debt.next_due_date);
  const debtStatus = effectiveStatus(debt);
  const plannedAmount = Number(debt.monthly_amount ?? 0);

  const paidByMonth = new Map<string, { amount: number; paidOn: string | null }>();
  const postponedMonths = new Set<string>();

  for (const payment of history.payments) {
    const month = referenceMonth(payment.dueDate ?? payment.paidOn);
    if (!month) continue;

    if (payment.actionType === "paid") {
      const current = paidByMonth.get(month) ?? { amount: 0, paidOn: null };
      paidByMonth.set(month, {
        amount: current.amount + Number(payment.amount ?? 0),
        paidOn: payment.paidOn ?? current.paidOn,
      });
    } else if (payment.actionType.includes("postpon") || payment.actionType.includes("adi")) {
      postponedMonths.add(month);
    }
  }

  for (const resolution of history.resolutions) {
    if (resolution.resolution !== "paid") continue;
    const month = referenceMonth(resolution.referenceMonth);
    if (!month || paidByMonth.has(month)) continue;
    paidByMonth.set(month, {
      amount: Number(resolution.amountOverride ?? plannedAmount ?? 0),
      paidOn: resolution.resolvedOn,
    });
  }

  const paidKeys = [...paidByMonth.keys()].sort();
  const lastPaidMonth = paidKeys.length > 0 ? paidKeys[paidKeys.length - 1] : null;

  return monthNames.map((label, index) => {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`;
    const paid = paidByMonth.get(key);

    if (paid) {
      return {
        key,
        label,
        status: "paid",
        amount: paid.amount > 0 ? paid.amount : plannedAmount || null,
        paidOn: paid.paidOn,
      };
    }

    if (postponedMonths.has(key)) {
      return {
        key,
        label,
        status: "postponed",
        amount: null,
        paidOn: null,
      };
    }

    if (startMonth && key < startMonth) {
      return {
        key,
        label,
        status: "inactive",
        amount: null,
        paidOn: null,
      };
    }

    if (debtStatus === "paid" && lastPaidMonth && key > lastPaidMonth) {
      return {
        key,
        label,
        status: "inactive",
        amount: null,
        paidOn: null,
      };
    }

    if (key <= todayMonth && !["paid", "cancelled"].includes(debtStatus)) {
      return {
        key,
        label,
        status: "pending",
        amount: plannedAmount || null,
        paidOn: null,
      };
    }

    if (key > todayMonth && !["paid", "cancelled"].includes(debtStatus)) {
      return {
        key,
        label,
        status: "future",
        amount: plannedAmount || null,
        paidOn: null,
      };
    }

    return {
      key,
      label,
      status: "inactive",
      amount: null,
      paidOn: null,
    };
  });
}

function calendarStatusLabel(status: DebtCalendarMonth["status"]) {
  if (status === "paid") return "Pago";
  if (status === "pending") return "Pendente";
  if (status === "postponed") return "Adiado";
  if (status === "future") return "Previsto";
  return "—";
}

function calendarStatusClass(status: DebtCalendarMonth["status"]) {
  if (status === "paid") return "green";
  if (status === "pending") return "red";
  if (status === "postponed") return "blue";
  return "gray";
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
                      {debtTypeLabel(debt.debt_type)} · {String(debt.creditor_name ?? debt.origin ?? "Sem credor")}
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
                    <Link
                      className="button ghost compact-button"
                      href={`/bank/emprestimos?detalhes=${encodeURIComponent(String(debt.id))}`}
                    >
                      Detalhes
                    </Link>

                    {open && (
                      <Link
                        className="button gold compact-button"
                        href={`/bank/emprestimos?pagar=${encodeURIComponent(String(debt.id))}`}
                      >
                        Pagar
                      </Link>
                    )}
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
    detalhes?: string;
    ano?: string;
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

  const selectedDetailDebt = params.detalhes
    ? debts.find((debt) => String(debt.id) === params.detalhes) ?? null
    : null;
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

  const calendarYear = /^\d{4}$/.test(String(params.ano ?? ""))
    ? Number(params.ano)
    : currentYearInBrazil();
  const detailHistory = selectedDetailDebt
    ? await getBankDebtHistory(String(selectedDetailDebt.id))
    : { payments: [], resolutions: [] };
  const detailCalendar = selectedDetailDebt
    ? buildDebtCalendar(selectedDetailDebt, detailHistory, calendarYear)
    : [];

  const today = todayInBrazil();
  const totalOriginal = debts.reduce((sum, debt) => sum + Number(debt.original_amount ?? 0), 0);
  const totalPaid = debts.reduce((sum, debt) => sum + Number(debt.total_paid ?? 0), 0);
  const totalRemaining = debts.reduce((sum, debt) => sum + Number(debt.remaining_amount ?? 0), 0);

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Empréstimos e Notinhas</h1>
          <p>
            Veja o saldo restante e abra os detalhes para acompanhar mês a mês o que já foi pago.
          </p>
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

      {selectedDetailDebt && (
        <article className="panel" style={{ marginTop: 18 }}>
          <div className="panel-head">
            <div>
              <h2>{String(selectedDetailDebt.name ?? "Dívida")}</h2>
              <p>Calendário mensal do que foi pago, está pendente ou ainda está previsto.</p>
            </div>
            <Link className="icon-link" href="/bank/emprestimos" aria-label="Fechar detalhes">
              <X size={17} />
            </Link>
          </div>

          <div className="bank-charge-payment-summary">
            <div>
              <span>Total</span>
              <strong>{formatCurrency(Number(selectedDetailDebt.original_amount ?? 0))}</strong>
            </div>
            <div>
              <span>Pago</span>
              <strong>{formatCurrency(Number(selectedDetailDebt.total_paid ?? 0))}</strong>
            </div>
            <div>
              <span>Restante</span>
              <strong>{formatCurrency(Number(selectedDetailDebt.remaining_amount ?? 0))}</strong>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginTop: 18,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <strong>Pagamentos de {calendarYear}</strong>
            <div className="bank-header-actions">
              <Link
                className="button ghost compact-button"
                href={`/bank/emprestimos?detalhes=${encodeURIComponent(String(selectedDetailDebt.id))}&ano=${calendarYear - 1}`}
                aria-label="Ano anterior"
              >
                <ChevronLeft size={15} />
                {calendarYear - 1}
              </Link>
              <Link
                className="button ghost compact-button"
                href={`/bank/emprestimos?detalhes=${encodeURIComponent(String(selectedDetailDebt.id))}&ano=${calendarYear + 1}`}
                aria-label="Próximo ano"
              >
                {calendarYear + 1}
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))",
              gap: 10,
            }}
          >
            {detailCalendar.map((month) => (
              <div
                key={month.key}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 12,
                  minHeight: 104,
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{month.label}</strong>
                  <span className={`badge ${calendarStatusClass(month.status)}`}>
                    {calendarStatusLabel(month.status)}
                  </span>
                </div>

                {month.amount ? (
                  <strong>{formatCurrency(month.amount)}</strong>
                ) : (
                  <span style={{ opacity: 0.6 }}>Sem valor no mês</span>
                )}

                <small style={{ opacity: 0.7 }}>
                  {month.paidOn
                    ? `Pago em ${month.paidOn.split("-").reverse().join("/")}`
                    : month.status === "pending"
                      ? "Ainda não confirmado"
                      : month.status === "future"
                        ? "Pagamento futuro"
                        : month.status === "postponed"
                          ? "Parcela adiada"
                          : ""}
                </small>
              </div>
            ))}
          </div>

          <div className="bank-balance-update-actions" style={{ marginTop: 18 }}>
            {!["paid", "cancelled"].includes(effectiveStatus(selectedDetailDebt)) && (
              <>
                <Link
                  className="button gold"
                  href={`/bank/emprestimos?pagar=${encodeURIComponent(String(selectedDetailDebt.id))}`}
                >
                  Pagar parcela
                </Link>
                <Link
                  className="button ghost"
                  href={`/bank/emprestimos?adiar=${encodeURIComponent(String(selectedDetailDebt.id))}`}
                >
                  Adiar
                </Link>
              </>
            )}
            <Link
              className="button ghost"
              href={`/bank/emprestimos?ajustar=${encodeURIComponent(String(selectedDetailDebt.id))}`}
            >
              Ajustar histórico
            </Link>
            <Link
              className="button ghost"
              href={`/bank/emprestimos?corrigir=${encodeURIComponent(String(selectedDetailDebt.id))}`}
            >
              Correção auditada
            </Link>
          </div>
        </article>
      )}

      {selectedPaymentDebt && (
        <article className="panel bank-debt-action-panel">
          <div className="panel-head">
            <div>
              <h2>Registrar pagamento</h2>
              <p>Se a dívida for quitada, ela desce automaticamente para Quitados.</p>
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
        description="Abra Detalhes para ver o calendário mensal; use Pagar só quando for registrar uma parcela."
        debts={openDebts}
        allowPayment
      />

      <DebtList
        title="Quitados"
        description="Histórico das notinhas e empréstimos já pagos. O calendário continua disponível."
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
