import { Boxes, PackageCheck, ShoppingCart } from "lucide-react";
import type { OperationInvestmentSnapshot } from "@/lib/bank-data";
import { formatCurrency } from "@/lib/format";

type Props = {
  data: OperationInvestmentSnapshot;
  only?: "supplements" | "fitness";
  compact?: boolean;
};

export function OperationInvestmentPanel({ data, only, compact = false }: Props) {
  const operations = only
    ? [{ key: only, label: only === "supplements" ? "Candinho Suplementos" : "Candinho Fitness", metrics: data[only] }]
    : [
        { key: "supplements" as const, label: "Candinho Suplementos", metrics: data.supplements },
        { key: "fitness" as const, label: "Candinho Fitness", metrics: data.fitness },
      ];

  const companyMonthlyOrdered = data.supplements.monthlyOrderedCost + data.fitness.monthlyOrderedCost;

  return (
    <article className={`panel operation-investment-panel ${compact ? "compact" : ""}`}>
      <div className="panel-head operation-investment-head">
        <div>
          <h2>{only ? "Valor investido na operação neste mês" : "Investimento nas operações neste mês"}</h2>
          <p>Considera o custo dos pedidos de fornecedor feitos no mês, independentemente de já terem sido recebidos.</p>
        </div>
      </div>

      <div className="panel-body operation-investment-body">
        {!only && (
          <div className="operation-investment-total">
            <span>Investido nas operações neste mês</span>
            <strong>{formatCurrency(companyMonthlyOrdered)}</strong>
            <small>Visão mensal. Estoque acumulado e patrimônio continuam disponíveis nas áreas gerenciais.</small>
          </div>
        )}

        <div className={`operation-investment-grid ${only ? "single" : ""}`}>
          {operations.map(({ key, label, metrics }) => (
            <div className={`operation-investment-card ${key}`} key={key}>
              <div className="operation-investment-card-title"><Boxes size={18}/><span>{label}</span></div>
              <strong>{formatCurrency(metrics.monthlyOrderedCost)}</strong>
              <div className="operation-investment-breakdown">
                <span><ShoppingCart size={14}/>Pedidos feitos no mês <b>{formatCurrency(metrics.monthlyOrderedCost)}</b></span>
                <span><PackageCheck size={14}/>Já recebido no mês <b>{formatCurrency(metrics.monthlyReceivedCost)}</b><small>{metrics.monthlyReceivedUnits} un.</small></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
