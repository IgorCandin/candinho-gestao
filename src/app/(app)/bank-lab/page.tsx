import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  FileUp,
  FlaskConical,
  Landmark,
  LockKeyhole,
  Pencil,
  Plus,
  Save,
  UserRound,
} from "lucide-react";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { addLabTransaction, editLabTransaction, importBankStatement, saveLabBalance } from "./actions";
import styles from "./page.module.css";

type Holder = { id: string; name: string; person_type: "pf" | "pj"; display_order: number };
type Account = {
  id: string;
  holder_id: string;
  institution: string;
  name: string;
  account_type: string;
  current_balance: number;
  balance_date: string | null;
  balance_source: "manual" | "import";
  is_active: boolean;
  display_order: number;
};
type Transaction = {
  id: string;
  account_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  category: string | null;
  source: "manual" | "import";
  manually_edited_at: string | null;
};

function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function inputMoney(value: number) {
  return Number(value).toFixed(2).replace(".", ",");
}

export default async function BankLabPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const [holdersResult, accountsResult, transactionsResult, countResult, importsResult] = await Promise.all([
    supabase.from("bank_lab_holders").select("id,name,person_type,display_order").order("display_order"),
    supabase.from("bank_lab_accounts").select("id,holder_id,institution,name,account_type,current_balance,balance_date,balance_source,is_active,display_order").order("display_order"),
    supabase.from("bank_lab_transactions").select("id,account_id,transaction_date,description,amount,category,source,manually_edited_at").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).limit(30),
    supabase.from("bank_lab_transactions").select("id", { count: "exact", head: true }),
    supabase.from("bank_lab_imports").select("id", { count: "exact", head: true }),
  ]);

  const setupError = holdersResult.error || accountsResult.error || transactionsResult.error;
  const holders = (holdersResult.data ?? []) as Holder[];
  const accounts = (accountsResult.data ?? []) as Account[];
  const activeAccounts = accounts.filter((account) => account.is_active);
  const transactions = (transactionsResult.data ?? []) as Transaction[];
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const totalBalance = activeAccounts.reduce((total, account) => total + Number(account.current_balance), 0);
  const today = todayInBrazil();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href="/bank"><ArrowLeft size={16} /> Voltar ao Bank atual</Link>
          <div className={styles.eyebrow}><FlaskConical size={16} /> Ambiente de testes</div>
          <h1>Bank 2.0</h1>
          <p>Importe extratos e continue ajustando tudo manualmente, sem alterar o Bank atual.</p>
        </div>
        <span className={styles.safe}><LockKeyhole size={16} /> Bank atual protegido</span>
      </header>

      <picture className={styles.hero}>
        <source media="(max-width: 700px)" srcSet="/operation-banners/bank-lab-mobile.jpg" />
        <Image src="/operation-banners/bank-lab-desktop.jpg" alt="Bank 2.0 — laboratório de importação financeira" width={1280} height={720} priority />
      </picture>

      {params.ok && <section className={styles.notice}><CheckCircle2 size={20} /><strong>{params.ok}</strong></section>}
      {params.erro && <section className={styles.errorNotice}><strong>{params.erro}</strong></section>}
      {setupError && (
        <section className={styles.errorNotice}>
          <strong>O banco de testes ainda não foi preparado.</strong>
          <span>A tela está pronta, mas falta aplicar a estrutura isolada no Supabase.</span>
        </section>
      )}

      <section className={styles.summary}>
        <article><span>Saldo do laboratório</span><strong>{formatCurrency(totalBalance)}</strong><small>{activeAccounts.length} contas ativas</small></article>
        <article><span>Movimentações</span><strong>{countResult.count ?? 0}</strong><small>manuais e importadas</small></article>
        <article><span>Extratos enviados</span><strong>{importsResult.count ?? 0}</strong><small>arquivos processados</small></article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelTitle}><div><h2>1. Subir extrato</h2><p>OFX é o formato preferido; CSV também funciona.</p></div><FileUp size={22} /></div>
          <form action={importBankStatement} className={styles.form}>
            <label><span>Conta que receberá o extrato</span><select name="account_id" required>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{holders.find((holder) => holder.id === account.holder_id)?.name} — {account.name}</option>)}</select></label>
            <label><span>Arquivo do banco</span><input name="statement_file" type="file" accept=".ofx,.csv,.txt" required /></label>
            <label><span>Saldo final, se o arquivo não informar (opcional)</span><input name="statement_balance" inputMode="decimal" placeholder="Ex.: 1.250,40" /></label>
            <button className={styles.primary} type="submit"><FileUp size={17} /> Importar e atualizar</button>
            <small>Repetições são ignoradas. Lançamentos manuais nunca são apagados.</small>
          </form>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelTitle}><div><h2>2. Alterar saldo manualmente</h2><p>Você pode corrigir qualquer conta quando quiser.</p></div><Pencil size={21} /></div>
          <form action={saveLabBalance} className={styles.form}>
            <label><span>Conta</span><select name="account_id" required>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{holders.find((holder) => holder.id === account.holder_id)?.name} — {account.name} ({formatCurrency(account.current_balance)})</option>)}</select></label>
            <div className={styles.formColumns}>
              <label><span>Novo saldo</span><input name="balance" inputMode="decimal" placeholder="0,00" required /></label>
              <label><span>Data</span><input name="balance_date" type="date" defaultValue={today} required /></label>
            </div>
            <button className={styles.secondary} type="submit"><Save size={17} /> Salvar saldo manual</button>
            <small>O próximo extrato com saldo informado poderá atualizá-lo novamente.</small>
          </form>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelTitle}><div><h2>Contas por titular</h2><p>As contas ficam separadas, mesmo quando o banco é o mesmo.</p></div><UserRound size={21} /></div>
        <div className={styles.holderGrid}>
          {holders.map((holder) => (
            <article className={styles.holderCard} key={holder.id}>
              <div className={styles.holderHeading}><span className={styles.avatar}>{holder.name.slice(0, 1)}</span><div><strong>{holder.name}</strong><small>{holder.person_type === "pj" ? "Pessoa jurídica" : "Pessoa física"}</small></div></div>
              <div className={styles.accountList}>
                {accounts.filter((account) => account.holder_id === holder.id).map((account) => (
                  <div className={!account.is_active ? styles.inactiveAccount : undefined} key={account.id}>
                    <Landmark size={17} /><span><strong>{account.name}</strong><small>{account.balance_source === "import" ? "Atualizado por extrato" : "Ajuste manual"}{account.balance_date ? ` • ${formatDateOnly(account.balance_date)}` : ""}</small></span><b>{formatCurrency(account.current_balance)}</b>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelTitle}><div><h2>Adicionar movimentação manual</h2><p>Para dinheiro, ajustes ou algo que não veio no extrato.</p></div><Plus size={21} /></div>
          <form action={addLabTransaction} className={styles.form}>
            <label><span>Conta</span><select name="account_id" required>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{holders.find((holder) => holder.id === account.holder_id)?.name} — {account.name}</option>)}</select></label>
            <div className={styles.formColumns}><label><span>Data</span><input name="transaction_date" type="date" defaultValue={today} required /></label><label><span>Valor</span><input name="amount" inputMode="decimal" placeholder="Use - para saída" required /></label></div>
            <label><span>Descrição</span><input name="description" placeholder="Ex.: compra de fornecedor" required /></label>
            <label><span>Categoria (opcional)</span><input name="category" placeholder="Ex.: Fornecedores" /></label>
            <button className={styles.secondary} type="submit"><Plus size={17} /> Adicionar manualmente</button>
          </form>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelTitle}><div><h2>Como o teste se comporta</h2><p>O automático ajuda, mas você continua no controle.</p></div><LockKeyhole size={21} /></div>
          <div className={styles.rules}>
            <div><CheckCircle2 size={18} /><span><strong>Extrato novo:</strong> adiciona somente o que ainda não existe.</span></div>
            <div><CheckCircle2 size={18} /><span><strong>Arquivo repetido:</strong> não duplica as movimentações.</span></div>
            <div><CheckCircle2 size={18} /><span><strong>Correção manual:</strong> fica salva e não é apagada.</span></div>
            <div><CheckCircle2 size={18} /><span><strong>Bank atual:</strong> não recebe nenhuma alteração deste laboratório.</span></div>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelTitle}><div><h2>Movimentações recentes</h2><p>Clique em “Editar” para corrigir inclusive uma linha importada.</p></div></div>
        <div className={styles.movements}>
          {transactions.map((transaction) => {
            const account = accountMap.get(transaction.account_id);
            return (
              <details key={transaction.id}>
                <summary>
                  <span className={transaction.amount >= 0 ? styles.incomeIcon : styles.outcomeIcon}>{transaction.amount >= 0 ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}</span>
                  <time>{formatDateOnly(transaction.transaction_date)}</time>
                  <span><strong>{transaction.description}</strong><small>{account?.name ?? "Conta"} • {transaction.source === "import" ? "Importado" : "Manual"}{transaction.manually_edited_at ? " • Corrigido" : ""}</small></span>
                  <b>{formatCurrency(transaction.amount)}</b><em><Pencil size={14} /> Editar</em>
                </summary>
                <form action={editLabTransaction} className={styles.editForm}>
                  <input type="hidden" name="transaction_id" value={transaction.id} />
                  <label><span>Data</span><input type="date" name="transaction_date" defaultValue={transaction.transaction_date} required /></label>
                  <label><span>Descrição</span><input name="description" defaultValue={transaction.description} required /></label>
                  <label><span>Valor</span><input name="amount" inputMode="decimal" defaultValue={inputMoney(transaction.amount)} required /></label>
                  <label><span>Categoria</span><input name="category" defaultValue={transaction.category ?? ""} /></label>
                  <button className={styles.secondary} type="submit"><Save size={15} /> Salvar correção</button>
                </form>
              </details>
            );
          })}
          {transactions.length === 0 && <div className={styles.empty}>Nenhuma movimentação ainda. Suba o primeiro OFX ou adicione uma manual.</div>}
        </div>
      </section>
    </main>
  );
}
