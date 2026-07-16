import { CircleDollarSign } from "lucide-react";
import { getBankCharges } from "@/lib/bank-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

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

export default async function BankChargesPage() {
  const charges = await getBankCharges();

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Cobranças</h1>
          <p>Central de contas a pagar, com vencimento, origem e situação atual.</p>
        </div>
        <span className="bank-module-badge"><CircleDollarSign size={16} />{charges.length} registros</span>
      </div>

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cobrança</th><th>Origem</th><th>Vencimento</th><th>Status</th><th>Valor restante</th></tr></thead>
            <tbody>
              {charges.map((charge) => (
                <tr key={String(charge.id)}>
                  <td><div className="cell-main">{String(charge.title ?? "Cobrança")}</div><div className="cell-sub">{String(charge.category ?? "Sem categoria")}</div></td>
                  <td>{String(charge.origin ?? "—")}</td>
                  <td>{formatDateOnly(String(charge.due_date ?? ""))}</td>
                  <td><span className={`badge ${statusClass(charge.effective_status)}`}>{statusLabel(charge.effective_status)}</span></td>
                  <td className="amount">{formatCurrency(Number(charge.remaining_amount ?? 0))}</td>
                </tr>
              ))}
              {charges.length === 0 && <tr><td colSpan={5}><div className="empty"><strong>Nenhuma cobrança cadastrada</strong>As novas contas vão aparecer aqui.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
