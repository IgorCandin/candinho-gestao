import { Building2 } from "lucide-react";
import { getBankAccounts } from "@/lib/bank-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export default async function BankAccountsPage() {
  const accounts = await getBankAccounts();

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Contas e Carteiras</h1>
          <p>Onde seu dinheiro está e qual foi o último saldo informado em cada lugar.</p>
        </div>
        <span className="bank-module-badge"><Building2 size={16} />{accounts.length} contas</span>
      </div>

      <div className="bank-card-grid">
        {accounts.map((account) => (
          <article className="panel bank-account-card" key={String(account.id)}>
            <div className="panel-body">
              <div className="bank-account-card-head"><div><span>{String(account.account_type ?? "bank")}</span><h2>{String(account.name ?? "Conta")}</h2></div><strong>{formatCurrency(Number(account.balance ?? 0))}</strong></div>
              <div className="bank-account-card-foot"><span>{String(account.origin ?? "Sem origem")}</span><span>{account.balance_date ? `Atualizado em ${formatDateOnly(String(account.balance_date))}` : "Saldo ainda não informado"}</span></div>
            </div>
          </article>
        ))}
        {accounts.length === 0 && <article className="panel"><div className="empty"><strong>Nenhuma conta cadastrada</strong>Cadastre bancos, dinheiro físico e carteiras guardadas para formar seu saldo total.</div></article>}
      </div>
    </section>
  );
}
