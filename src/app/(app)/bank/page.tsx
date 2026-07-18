import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Landmark,
  RefreshCcw,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { OperationInvestmentPanel } from "@/components/operation-investment-panel";
import { getBankDashboardData } from "@/lib/bank-data";
import { getBankMonthHomeData, type BankMonthCommitment } from "@/lib/bank-home-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

function commitmentTone(item: BankMonthCommitment, today: string) {
  if (item.dueDate < today) return "red";
  if (item.dueDate === today) return "gold";
  return "gray";
}

function commitmentLabel(item: BankMonthCommitment, today: string) {
  if (item.dueDate < today) return "Atrasado";
  if (item.dueDate === today) return "Vence hoje";
  return formatDateOnly(item.dueDate);
}

function CommitmentList({
  rows,
  today,
  emptyMessage,
}: {
  rows: BankMonthCommitment[];
  today: string;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <div className="bank-empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="bank-charge-list">
      {rows.map((item) => (
        <Link
          className="bank-charge-item"
          href={item.href}
          key={item.id}
          style={{ textDecoration: "none" }}
        >
          <div className="bank-charge-date">
            <strong>{formatDateOnly(item.dueDate).slice(0, 5)}</strong>
            <span>{item.origin ?? "Geral"}</span>
          </div>
          <div className="bank-charge-main">
            <strong>{item.title}</strong>
            <span>{item.kind === "invoice" ? "Fatura" : item.kind === "subscription" ? "Mensalidade" : item.kind === "debt" ? "Parcela" : "Cobrança"}</span>
          </div>
          <div className="bank-charge-value">
            <strong>{formatCurrency(item.amount)}</strong>
            <span className={`badge ${commitmentTone(item, today)}`}>{commitmentLabel(item, today)}</span>
          </div>
          <ChevronRight size={16} />
        </Link>
      ))}
    </div>
  );
}

export default async function BankDashboardPage() {
  const [data, month] = await Promise.all([getBankDashboardData(), getBankMonthHomeData()]);
  const currentProjection = data.annualProjection[0];
  const expectedIncome = currentProjection?.totalExpectedIncome ?? data.summary.receivableThisMonth;
  const projectedEndOfMonth = data.summary.totalBalance + expectedIncome - month.remainingMonthTotal - month.overdueTotal;
  const monthName = month.monthLabel.charAt(0).toUpperCase() + month.monthLabel.slice(1);

  return (
    <section className="bank-dashboard">
      <div className="operation-home-toolbar bank-home-toolbar">
        <span>{monthName} · cada mês é uma pequena vitória</span>
        <div className="bank-header-actions">
          <Link className="button ghost" href="/bank/atualizar"><RefreshCcw size={16} />Atualização rápida</Link>
          <Link className="button gold" href="/bank/faturas?acao=atualizar"><CreditCard size={16} />Atualizar faturas</Link>
        </div>
      </div>

      <div
        className="bank-balance-hero"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div>
          <span className="bank-balance-kicker">O que precisa de atenção hoje</span>
          <strong>{month.dueToday.length > 0 ? formatCurrency(month.dueTodayTotal) : "Nada vence hoje"}</strong>
          <small>
            {month.dueToday.length > 0
              ? `${month.dueToday.length} compromisso(s) com vencimento hoje`
              : `Próximo foco: ${month.upcoming[0] ? `${formatDateOnly(month.upcoming[0].dueDate)} · ${month.upcoming[0].title}` : "nenhum vencimento restante neste mês"}`}
          </small>
        </div>
        {month.dueToday.length > 0 ? <ReceiptText size={42} /> : <CheckCircle2 size={42} />}
      </div>

      <div className="grid stats-grid bank-stats-grid">
        <article className="stat-card">
          <div className="stat-head"><span>Saldo disponível</span><span className="stat-icon"><Landmark size={17} /></span></div>
          <div className="stat-value">{formatCurrency(data.summary.totalBalance)}</div>
          <div className="stat-note">{data.summary.latestBalanceDate ? `Atualizado em ${formatDateOnly(data.summary.latestBalanceDate)}` : "Atualize suas contas para refletir o saldo real."}</div>
        </article>

        <article className="stat-card">
          <div className="stat-head"><span>A pagar até o fim do mês</span><span className="stat-icon"><ReceiptText size={17} /></span></div>
          <div className="stat-value">{formatCurrency(month.remainingMonthTotal)}</div>
          <div className="stat-note">{month.upcoming.length + month.dueToday.length} compromisso(s) de hoje até o último dia do mês.</div>
        </article>

        <article className="stat-card">
          <div className="stat-head"><span>A receber neste mês</span><span className="stat-icon"><TrendingUp size={17} /></span></div>
          <div className="stat-value">{formatCurrency(expectedIncome)}</div>
          <div className="stat-note">Entradas e recebimentos previstos para o mês atual.</div>
        </article>

        <article className={`stat-card bank-difference-card ${projectedEndOfMonth < 0 ? "negative" : "positive"}`}>
          <div className="stat-head"><span>Projeção até o fim do mês</span><span className="stat-icon"><CircleDollarSign size={17} /></span></div>
          <div className="stat-value">{formatCurrency(projectedEndOfMonth)}</div>
          <div className="stat-note">Saldo atual + entradas previstas − compromissos ainda abertos deste mês.</div>
        </article>
      </div>

      {month.overdue.length > 0 && (
        <article className="panel" style={{ marginTop: 18, borderColor: "rgba(239,100,100,.35)" }}>
          <div className="panel-head">
            <div>
              <h2>Atrasados deste mês</h2>
              <p>{formatCurrency(month.overdueTotal)} ainda precisa ser resolvido.</p>
            </div>
            <AlertTriangle size={20} />
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <CommitmentList rows={month.overdue} today={month.today} emptyMessage="Nenhum atraso neste mês." />
          </div>
        </article>
      )}

      <article className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div>
            <h2>Vencimentos de {monthName}</h2>
            <p>Do mais próximo até o último dia do mês. Sem misturar o montante da vida inteira.</p>
          </div>
          <span className="badge gold">{formatCurrency(month.monthCommitmentTotal)} no mês</span>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          <CommitmentList
            rows={[...month.dueToday, ...month.upcoming]}
            today={month.today}
            emptyMessage="Nenhum compromisso pendente até o fim deste mês."
          />
        </div>
      </article>

      <OperationInvestmentPanel data={data.investment} />

      <div className="bank-quick-actions">
        <Link href="/bank/atualizar" className="bank-quick-card">
          <RefreshCcw size={20} />
          <div><strong>Atualização rápida</strong><span>Atualize saldos e faturas sem navegar por várias telas.</span></div>
          <ChevronRight size={17} />
        </Link>
        <Link href="/bank/cobrancas?acao=nova" className="bank-quick-card">
          <ReceiptText size={20} />
          <div><strong>Nova cobrança</strong><span>Cadastre algo que precisa ser pago neste ou em outro mês.</span></div>
          <ChevronRight size={17} />
        </Link>
        <Link href="/bank/entradas?acao=nova-receber" className="bank-quick-card">
          <TrendingUp size={20} />
          <div><strong>Nova entrada</strong><span>Registre um valor previsto ou uma conta a receber.</span></div>
          <ChevronRight size={17} />
        </Link>
        <Link href="/bank/fechamento" className="bank-quick-card">
          <Wallet size={20} />
          <div><strong>Fechar o mês</strong><span>Guarde a fotografia da vitória de cada mês.</span></div>
          <ChevronRight size={17} />
        </Link>
        <Link href="/bank/visao-anual" className="bank-quick-card">
          <CalendarDays size={20} />
          <div><strong>Visão detalhada</strong><span>Abra a análise anual somente quando quiser enxergar o quadro completo.</span></div>
          <ChevronRight size={17} />
        </Link>
      </div>
    </section>
  );
}
