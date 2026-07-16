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
import { getBankAccounts, getBankCharges } from "@/lib/bank-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { createBankCharge, markBankChargePaid } from "./actions";

function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function statusLabel(status: unknown) {
  const value = String(status ?? "pending");
  if (value === "overdue") return "Vencida";
  if (value === "paid") return "Paga";
  if (value === "partial") return "Parcial";
  if (value === "cancelled") return "Cancelada";
  return "Pendente";
}

function statusClass(status: unknown) {
  const value = String(status ?? "pending");
  if (value === "overdue") return "red";
  if (value === "paid") return "green";
  if (value === "partial") return "orange";
  return "gray";
}

export default async function BankChargesPage({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string; salvo?: string; pagar?: string }>;
}) {
  const params = await searchParams;
  const [charges, accounts] = await Promise.all([getBankCharges(), getBankAccounts()]);
  const creating = params.acao === "nova";
  const selectedCharge = params.pagar
    ? charges.find((charge) => String(charge.id) === params.pagar)
    : null;
  const selectedStatus = String(selectedCharge?.effective_status ?? "");
  const canPaySelected = Boolean(selectedCharge) && !["paid", "cancelled"].includes(selectedStatus);
  const today = todayInBrazil();

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Cobranças</h1>
          <p>Central de contas a pagar, com vencimento, origem e situação atual.</p>
        </div>
        <div className="bank-header-actions">
          <span className="bank-module-badge"><CircleDollarSign size={16} />{charges.length} registros</span>
          {!creating && (
            <Link className="button gold" href="/bank/cobrancas?acao=nova">
              <Plus size={16} />Nova cobrança
            </Link>
          )}
        </div>
      </div>

      {params.salvo === "criada" && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>Cobrança cadastrada com sucesso.</strong>
            <span>O Dashboard e a Visão Anual já consideram esse novo compromisso.</span>
          </div>
        </div>
      )}

      {params.salvo === "paga" && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>Pagamento registrado com sucesso.</strong>
            <span>A cobrança saiu dos valores pendentes e ficou preservada no histórico.</span>
          </div>
        </div>
      )}

      {creating && (
        <article className="panel bank-charge-form-panel">
          <div className="panel-head">
            <div>
              <h2>Nova cobrança</h2>
              <p>Registre uma conta que realmente precisa ser paga. Ela entra no Dashboard e na projeção automaticamente.</p>
            </div>
            <Link className="icon-link" href="/bank/cobrancas" aria-label="Fechar cadastro"><X size={17} /></Link>
          </div>

          <form action={createBankCharge}>
            <div className="bank-charge-form-grid">
              <label className="field bank-charge-form-wide">
                <span>Nome da cobrança</span>
                <input className="input" name="title" placeholder="Ex.: DAS CNPJ" required />
              </label>

              <label className="field">
                <span>Valor</span>
                <div className="bank-money-input">
                  <b>R$</b>
                  <input className="input" type="text" inputMode="decimal" name="amount" placeholder="0,00" required />
                </div>
              </label>

              <label className="field">
                <span>Vencimento</span>
                <input className="input" type="date" name="due_date" defaultValue={today} required />
              </label>

              <label className="field">
                <span>Origem</span>
                <select className="input" name="origin" defaultValue="Pessoal">
                  <option value="Pessoal">Pessoal</option>
                  <option value="Candinho Company">Candinho Company</option>
                  <option value="Candinho Suplementos">Candinho Suplementos</option>
                  <option value="Candinho Fitness">Candinho Fitness</option>
                  <option value="Outro">Outro</option>
                </select>
              </label>

              <label className="field">
                <span>Categoria</span>
                <input className="input" name="category" placeholder="Ex.: Impostos, Casa, Internet" />
              </label>

              <label className="field bank-charge-form-wide">
                <span>Descrição</span>
                <textarea className="input bank-textarea" name="description" placeholder="Detalhes opcionais sobre essa cobrança" rows={3} />
              </label>

              <label className="field bank-charge-form-wide">
                <span>Observações</span>
                <textarea className="input bank-textarea" name="notes" placeholder="Alguma observação interna?" rows={2} />
              </label>
            </div>

            <div className="bank-balance-update-actions">
              <Link className="button ghost" href="/bank/cobrancas">Cancelar</Link>
              <button className="button gold" type="submit"><Save size={16} />Salvar cobrança</button>
            </div>
          </form>
        </article>
      )}

      {selectedCharge && canPaySelected && (
        <article className="panel bank-charge-payment-panel">
          <div className="panel-head">
            <div>
              <h2>Registrar pagamento</h2>
              <p>Marque a cobrança como paga e registre de qual conta o dinheiro saiu.</p>
            </div>
            <Link className="icon-link" href="/bank/cobrancas" aria-label="Fechar pagamento"><X size={17} /></Link>
          </div>

          <div className="bank-charge-payment-summary">
            <div>
              <span>Cobrança</span>
              <strong>{String(selectedCharge.title ?? "Cobrança")}</strong>
            </div>
            <div>
              <span>Vencimento</span>
              <strong>{formatDateOnly(String(selectedCharge.due_date ?? ""))}</strong>
            </div>
            <div>
              <span>Valor a quitar</span>
              <strong>{formatCurrency(Number(selectedCharge.remaining_amount ?? 0))}</strong>
            </div>
          </div>

          <form action={markBankChargePaid}>
            <input type="hidden" name="charge_id" value={String(selectedCharge.id)} />
            <div className="bank-charge-payment-fields">
              <label className="field">
                <span>Data do pagamento</span>
                <input className="input" type="date" name="paid_on" defaultValue={today} required />
              </label>
              <label className="field">
                <span>Conta usada no pagamento</span>
                <select className="input" name="payment_account_id" defaultValue="">
                  <option value="">Não informar conta</option>
                  {accounts.map((account) => (
                    <option value={String(account.id)} key={String(account.id)}>
                      {String(account.name ?? "Conta")} — {formatCurrency(Number(account.balance ?? 0))}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="bank-balance-update-actions">
              <Link className="button ghost" href="/bank/cobrancas">Cancelar</Link>
              <button className="button gold" type="submit"><CheckCircle2 size={16} />Confirmar pagamento</button>
            </div>
          </form>
        </article>
      )}

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cobrança</th>
                <th>Origem</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Valor restante</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((charge) => {
                const status = String(charge.effective_status ?? "pending");
                const canPay = !["paid", "cancelled"].includes(status);
                return (
                  <tr key={String(charge.id)}>
                    <td>
                      <div className="cell-main">{String(charge.title ?? "Cobrança")}</div>
                      <div className="cell-sub">{String(charge.category ?? "Sem categoria")}</div>
                    </td>
                    <td>{String(charge.origin ?? "—")}</td>
                    <td>{formatDateOnly(String(charge.due_date ?? ""))}</td>
                    <td><span className={`badge ${statusClass(status)}`}>{statusLabel(status)}</span></td>
                    <td className="amount">{formatCurrency(Number(charge.remaining_amount ?? 0))}</td>
                    <td>
                      {canPay ? (
                        <Link className="button ghost bank-charge-pay-button" href={`/bank/cobrancas?pagar=${encodeURIComponent(String(charge.id))}`}>
                          <WalletCards size={14} />Marcar como pago
                        </Link>
                      ) : (
                        <span className="bank-charge-action-done"><ReceiptText size={14} />Finalizada</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {charges.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      <strong>Nenhuma cobrança cadastrada</strong>
                      Use Nova cobrança para registrar sua primeira conta a pagar.
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
