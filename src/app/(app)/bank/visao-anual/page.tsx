import { CalendarDays } from "lucide-react";
import { getBankAnnualProjection } from "@/lib/bank-data";
import { formatCurrency, formatMonthYear } from "@/lib/format";

export default async function BankAnnualPage() {
  const projection = await getBankAnnualProjection();

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Visão Anual</h1>
          <p>Os próximos 12 meses consolidados em entradas previstas, compromissos e resultado mensal.</p>
        </div>
        <span className="bank-module-badge"><CalendarDays size={16} />12 meses</span>
      </div>

      <div className="bank-annual-grid">
        {projection.map((month) => (
          <article className="panel bank-annual-card" key={String(month.reference_month)}>
            <div className="panel-body">
              <div className="bank-annual-card-head"><h2>{formatMonthYear(String(month.reference_month ?? ""))}</h2><span className={`badge ${Number(month.projected_result ?? 0) < 0 ? "red" : "green"}`}>{formatCurrency(Number(month.projected_result ?? 0))}</span></div>
              <div className="bank-annual-lines">
                <div><span>Entradas previstas</span><strong>{formatCurrency(Number(month.total_expected_income ?? 0))}</strong></div>
                <div><span>Faturas</span><strong>{formatCurrency(Number(month.card_invoices ?? 0))}</strong></div>
                <div><span>Cobranças</span><strong>{formatCurrency(Number(month.direct_charges ?? 0))}</strong></div>
                <div><span>Empréstimos</span><strong>{formatCurrency(Number(month.debt_payments ?? 0))}</strong></div>
                <div><span>Mensalidades</span><strong>{formatCurrency(Number(month.direct_subscriptions ?? 0) + Number(month.card_subscription_estimate ?? 0))}</strong></div>
                <div className="total"><span>Total comprometido</span><strong>{formatCurrency(Number(month.total_commitments ?? 0))}</strong></div>
              </div>
            </div>
          </article>
        ))}
        {projection.length === 0 && <article className="panel"><div className="empty"><strong>Sem projeção disponível</strong>Preencha suas contas, faturas e entradas para visualizar os próximos 12 meses.</div></article>}
      </div>
    </section>
  );
}
