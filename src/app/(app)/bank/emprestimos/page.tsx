import { Handshake } from "lucide-react";
import { getBankDebts } from "@/lib/bank-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export default async function BankDebtsPage() {
  const debts = await getBankDebts();

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Empréstimos e Notinhas</h1>
          <p>Controle o saldo restante, a parcela planejada e o próximo pagamento.</p>
        </div>
        <span className="bank-module-badge"><Handshake size={16} />{debts.length} registros</span>
      </div>

      <div className="bank-card-grid">
        {debts.map((debt) => (
          <article className="panel bank-detail-card" key={String(debt.id)}>
            <div className="panel-body">
              <div className="bank-detail-card-head"><div><span>{String(debt.debt_type ?? "loan") === "note" ? "Notinha" : "Empréstimo"}</span><h2>{String(debt.name ?? "Dívida")}</h2></div><span className="badge gray">{String(debt.effective_status ?? debt.status ?? "active")}</span></div>
              <div className="bank-detail-values">
                <div><span>Saldo restante</span><strong>{formatCurrency(Number(debt.remaining_amount ?? 0))}</strong></div>
                <div><span>Parcela planejada</span><strong>{formatCurrency(Number(debt.monthly_amount ?? 0))}</strong></div>
                <div><span>Próximo pagamento</span><strong>{formatDateOnly(String(debt.next_due_date ?? ""))}</strong></div>
              </div>
            </div>
          </article>
        ))}
        {debts.length === 0 && <article className="panel"><div className="empty"><strong>Nenhum empréstimo ou notinha cadastrado</strong>Quando cadastrar, o saldo restante será calculado automaticamente.</div></article>}
      </div>
    </section>
  );
}
