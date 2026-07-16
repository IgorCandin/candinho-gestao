import { CreditCard } from "lucide-react";
import { getBankCardsAndInvoices } from "@/lib/bank-data";
import { formatCurrency, formatDateOnly, formatMonthYear } from "@/lib/format";

export default async function BankInvoicesPage() {
  const { cards, invoices } = await getBankCardsAndInvoices();

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Faturas</h1>
          <p>Acompanhe os cartões e os valores informados para cada mês.</p>
        </div>
        <span className="bank-module-badge"><CreditCard size={16} />{cards.length} cartões</span>
      </div>

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cartão</th><th>Mês</th><th>Vencimento</th><th>Status</th><th>Valor</th></tr></thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={String(invoice.id)}>
                  <td><div className="cell-main">{String(invoice.card_name ?? "Cartão")}</div><div className="cell-sub">{String(invoice.holder_name ?? invoice.institution ?? "—")}</div></td>
                  <td>{formatMonthYear(String(invoice.reference_month ?? ""))}</td>
                  <td>{formatDateOnly(String(invoice.due_date ?? ""))}</td>
                  <td><span className="badge gray">{String(invoice.status ?? "planned")}</span></td>
                  <td className="amount">{invoice.amount === null ? "Não informado" : formatCurrency(Number(invoice.amount ?? 0))}</td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={5}><div className="empty"><strong>Nenhuma fatura informada</strong>Os próximos 12 meses de cada cartão vão aparecer aqui.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
