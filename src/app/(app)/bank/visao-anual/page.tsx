import { CalendarDays, CircleDollarSign, Landmark, TrendingUp } from "lucide-react";
import { getBankDashboardData } from "@/lib/bank-data";
import { formatCurrency, formatMonthYear } from "@/lib/format";

export default async function BankAnnualPage() {
  const data = await getBankDashboardData();
  const projection = data.annualProjection;
  const totalIncome = projection.reduce((sum, month) => sum + month.totalExpectedIncome, 0);
  const totalCommitments = projection.reduce((sum, month) => sum + month.totalCommitments, 0);
  const projectedFinalBalance = data.summary.totalBalance + projection.reduce((sum, month) => sum + month.projectedResult, 0);

  let runningBalance = data.summary.totalBalance;
  const months = projection.map((month) => {
    runningBalance += month.projectedResult;
    return { ...month, runningBalance };
  });

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Visão Anual</h1>
          <p>Os próximos 12 meses consolidados em entradas previstas, compromissos, resultado mensal e evolução projetada do saldo.</p>
        </div>
        <span className="bank-module-badge"><CalendarDays size={16} />12 meses</span>
      </div>

      <div className="grid stats-grid bank-stats-grid bank-annual-summary-grid">
        <article className="stat-card">
          <div className="stat-head"><span>Saldo atual</span><span className="stat-icon"><Landmark size={17} /></span></div>
          <div className="stat-value">{formatCurrency(data.summary.totalBalance)}</div>
          <div className="stat-note">Ponto de partida para a projeção acumulada.</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>Entradas previstas · 12 meses</span><span className="stat-icon"><TrendingUp size={17} /></span></div>
          <div className="stat-value">{formatCurrency(totalIncome)}</div>
          <div className="stat-note">Contas a receber e fontes recorrentes previstas.</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>Compromissos · 12 meses</span><span className="stat-icon"><CircleDollarSign size={17} /></span></div>
          <div className="stat-value">{formatCurrency(totalCommitments)}</div>
          <div className="stat-note">Faturas, cobranças, empréstimos e mensalidades.</div>
        </article>
        <article className={`stat-card bank-difference-card ${projectedFinalBalance < 0 ? "negative" : "positive"}`}>
          <div className="stat-head"><span>Saldo projetado ao final</span><span className="stat-icon"><CalendarDays size={17} /></span></div>
          <div className="stat-value">{formatCurrency(projectedFinalBalance)}</div>
          <div className="stat-note">Saldo atual somado ao resultado estimado dos 12 meses.</div>
        </article>
      </div>

      <div className="bank-annual-grid">
        {months.map((month) => (
          <article className="panel bank-annual-card" key={month.referenceMonth}>
            <div className="panel-body">
              <div className="bank-annual-card-head">
                <h2>{formatMonthYear(month.referenceMonth)}</h2>
                <span className={`badge ${month.projectedResult < 0 ? "red" : "green"}`}>{formatCurrency(month.projectedResult)}</span>
              </div>
              <div className="bank-annual-lines">
                <div><span>Entradas previstas</span><strong>{formatCurrency(month.totalExpectedIncome)}</strong></div>
                <div><span>Faturas informadas</span><strong>{formatCurrency(month.cardInvoices)}</strong></div>
                <div><span>Mensalidades em cartão estimadas</span><strong>{formatCurrency(month.cardSubscriptionEstimate)}</strong></div>
                <div><span>Cobranças</span><strong>{formatCurrency(month.directCharges)}</strong></div>
                <div><span>Empréstimos</span><strong>{formatCurrency(month.debtPayments)}</strong></div>
                <div><span>Mensalidades diretas</span><strong>{formatCurrency(month.directSubscriptions)}</strong></div>
                <div className="total"><span>Total comprometido</span><strong>{formatCurrency(month.totalCommitments)}</strong></div>
                <div className={`bank-annual-running ${month.runningBalance < 0 ? "negative" : "positive"}`}><span>Saldo projetado acumulado</span><strong>{formatCurrency(month.runningBalance)}</strong></div>
              </div>
            </div>
          </article>
        ))}
        {months.length === 0 && <article className="panel"><div className="empty"><strong>Sem projeção disponível</strong>Preencha suas contas, faturas e entradas para visualizar os próximos 12 meses.</div></article>}
      </div>

      <article className="panel bank-annual-disclaimer">
        <div className="panel-body bank-income-note">
          <CalendarDays size={20} />
          <div><strong>Esta é uma projeção, não um extrato bancário.</strong><span>O saldo acumulado parte do saldo real informado hoje e soma as entradas e compromissos previstos. Conforme o mês avança, atualize saldos e faturas para manter a visão mais próxima da realidade.</span></div>
        </div>
      </article>
    </section>
  );
}
