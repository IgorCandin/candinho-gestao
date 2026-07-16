import { CalendarDays } from "lucide-react";
import { getBankSubscriptions } from "@/lib/bank-data";
import { formatCurrency } from "@/lib/format";

export default async function BankSubscriptionsPage() {
  const subscriptions = await getBankSubscriptions();

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Planos e Mensalidades</h1>
          <p>Assinaturas recorrentes e a forma como cada uma participa da sua projeção.</p>
        </div>
        <span className="bank-module-badge"><CalendarDays size={16} />{subscriptions.length} planos</span>
      </div>

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Plano</th><th>Cobrança</th><th>Pagamento</th><th>Projeção</th><th>Valor</th></tr></thead>
            <tbody>
              {subscriptions.map((item) => (
                <tr key={String(item.id)}>
                  <td><div className="cell-main">{String(item.name ?? "Plano")}</div><div className="cell-sub">{String(item.provider ?? item.category ?? "—")}</div></td>
                  <td>Dia {String(item.billing_day ?? "—")} · {String(item.billing_cycle ?? "monthly")}</td>
                  <td>{String(item.payment_source_name ?? item.payment_method_type ?? "—")}</td>
                  <td><span className="badge gray">{String(item.projection_mode ?? "inside_card")}</span></td>
                  <td className="amount">{formatCurrency(Number(item.amount ?? 0))}</td>
                </tr>
              ))}
              {subscriptions.length === 0 && <tr><td colSpan={5}><div className="empty"><strong>Nenhum plano cadastrado</strong>Netflix, ChatGPT, Canva e outras recorrências aparecerão aqui.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
