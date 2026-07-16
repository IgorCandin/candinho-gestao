import Link from "next/link";
import { Building2, CheckCircle2, RefreshCcw, Save, X } from "lucide-react";
import { getBankAccounts } from "@/lib/bank-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { saveBankBalances } from "./actions";

function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function inputMoney(value: unknown) {
  return Number(value ?? 0).toFixed(2).replace(".", ",");
}

export default async function BankAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string; salvo?: string; data?: string }>;
}) {
  const params = await searchParams;
  const accounts = await getBankAccounts();
  const updating = params.acao === "atualizar-saldo";
  const balanceDate = params.data && /^\d{4}-\d{2}-\d{2}$/.test(params.data) ? params.data : todayInBrazil();

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Contas e Carteiras</h1>
          <p>Onde seu dinheiro está e qual foi o último saldo informado em cada lugar.</p>
        </div>
        <div className="bank-header-actions">
          <span className="bank-module-badge"><Building2 size={16} />{accounts.length} contas</span>
          {!updating && accounts.length > 0 && (
            <Link className="button gold" href="/bank/contas?acao=atualizar-saldo">
              <RefreshCcw size={16} />Atualizar saldo
            </Link>
          )}
        </div>
      </div>

      {params.salvo === "1" && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>Saldo atualizado com sucesso.</strong>
            <span>O histórico diário de {formatDateOnly(balanceDate)} foi salvo para todas as contas.</span>
          </div>
        </div>
      )}

      {updating && accounts.length > 0 && (
        <article className="panel bank-balance-update-panel">
          <div className="panel-head">
            <div>
              <h2>Atualizar saldo do dia</h2>
              <p>Informe quanto existe agora em cada conta. Salvar novamente na mesma data substitui apenas o registro daquele dia.</p>
            </div>
            <Link className="icon-link" href="/bank/contas" aria-label="Fechar atualização"><X size={17} /></Link>
          </div>
          <form action={saveBankBalances}>
            <div className="bank-balance-update-date field">
              <span>Data do saldo</span>
              <input className="input" type="date" name="balance_date" defaultValue={balanceDate} required />
              <small>Essa data cria o ponto do histórico usado para acompanhar a evolução do seu saldo.</small>
            </div>

            <div className="bank-balance-update-list">
              {accounts.map((account) => {
                const id = String(account.id);
                return (
                  <div className="bank-balance-update-row" key={id}>
                    <input type="hidden" name="account_id" value={id} />
                    <div className="bank-balance-update-account">
                      <strong>{String(account.name ?? "Conta")}</strong>
                      <span>{String(account.origin ?? account.account_type ?? "Conta")}</span>
                    </div>
                    <label className="field">
                      <span>Saldo atual</span>
                      <div className="bank-money-input">
                        <b>R$</b>
                        <input
                          className="input"
                          type="text"
                          inputMode="decimal"
                          name={`balance:${id}`}
                          defaultValue={inputMoney(account.balance)}
                          placeholder="0,00"
                          required
                        />
                      </div>
                    </label>
                    <div className="bank-balance-update-last">
                      <span>Último registro</span>
                      <strong>{account.balance_date ? formatDateOnly(String(account.balance_date)) : "Nunca atualizado"}</strong>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bank-balance-update-actions">
              <Link className="button ghost" href="/bank/contas">Cancelar</Link>
              <button className="button gold" type="submit"><Save size={16} />Salvar todos os saldos</button>
            </div>
          </form>
        </article>
      )}

      <div className="bank-card-grid">
        {accounts.map((account) => (
          <article className="panel bank-account-card" key={String(account.id)}>
            <div className="panel-body">
              <div className="bank-account-card-head">
                <div><span>{String(account.account_type ?? "bank")}</span><h2>{String(account.name ?? "Conta")}</h2></div>
                <strong>{formatCurrency(Number(account.balance ?? 0))}</strong>
              </div>
              <div className="bank-account-card-foot">
                <span>{String(account.origin ?? "Sem origem")}</span>
                <span>{account.balance_date ? `Atualizado em ${formatDateOnly(String(account.balance_date))}` : "Saldo ainda não informado"}</span>
              </div>
            </div>
          </article>
        ))}
        {accounts.length === 0 && (
          <article className="panel">
            <div className="empty">
              <strong>Nenhuma conta cadastrada</strong>
              Cadastre bancos, dinheiro físico e carteiras guardadas para formar seu saldo total.
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
