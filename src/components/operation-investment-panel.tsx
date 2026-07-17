"use client";

import { useState } from "react";
import { Boxes, PackageCheck, ShoppingCart } from "lucide-react";
import type { OperationInvestmentSnapshot } from "@/lib/bank-data";
import { formatCurrency } from "@/lib/format";

type Props = {
  data: OperationInvestmentSnapshot;
  only?: "supplements" | "fitness";
  compact?: boolean;
};

export function OperationInvestmentPanel({ data, only, compact = false }: Props) {
  const [mode, setMode] = useState<"monthly" | "total">("monthly");
  const operations = only
    ? [{ key: only, label: only === "supplements" ? "Candinho Suplementos" : "Candinho Fitness", metrics: data[only] }]
    : [
        { key: "supplements", label: "Candinho Suplementos", metrics: data.supplements },
        { key: "fitness", label: "Candinho Fitness", metrics: data.fitness },
      ];

  const companyValue = mode === "monthly" ? data.company.monthlyInvested : data.company.capitalAllocated;

  return (
    <article className={`panel operation-investment-panel ${compact ? "compact" : ""}`}>
      <div className="panel-head operation-investment-head">
        <div>
          <h2>{only ? "Valor investido na operação" : "Investimento por empresa"}</h2>
          <p>{mode === "monthly" ? "Entradas recebidas no mês + pedidos do mês que ainda estão pendentes." : "Custo do estoque atual + pedidos ainda a caminho."}</p>
        </div>
        <div className="operation-investment-toggle" role="group" aria-label="Visualização do investimento">
          <button className={mode === "monthly" ? "active" : ""} type="button" onClick={() => setMode("monthly")}>Mensal</button>
          <button className={mode === "total" ? "active" : ""} type="button" onClick={() => setMode("total")}>Montante</button>
        </div>
      </div>

      <div className="panel-body operation-investment-body">
        {!only && (
          <div className="operation-investment-total">
            <span>{mode === "monthly" ? "Investido nas operações neste mês" : "Capital total alocado nas operações"}</span>
            <strong>{formatCurrency(companyValue)}</strong>
            <small>{mode === "monthly" ? "Sem duplicar pedidos já recebidos." : `${formatCurrency(data.company.stockCost)} em estoque + ${formatCurrency(data.company.openOrdersCost)} em pedidos.`}</small>
          </div>
        )}

        <div className={`operation-investment-grid ${only ? "single" : ""}`}>
          {operations.map(({ key, label, metrics }) => {
            const value = mode === "monthly" ? metrics.monthlyInvested : metrics.capitalAllocated;
            return (
              <div className={`operation-investment-card ${key}`} key={key}>
                <div className="operation-investment-card-title"><Boxes size={18}/><span>{label}</span></div>
                <strong>{formatCurrency(value)}</strong>
                {mode === "monthly" ? (
                  <div className="operation-investment-breakdown">
                    <span><PackageCheck size={14}/>Recebido <b>{formatCurrency(metrics.monthlyReceivedCost)}</b><small>{metrics.monthlyReceivedUnits} un.</small></span>
                    <span><ShoppingCart size={14}/>Pedidos pendentes <b>{formatCurrency(metrics.monthlyPendingOrderCost)}</b></span>
                  </div>
                ) : (
                  <div className="operation-investment-breakdown">
                    <span><PackageCheck size={14}/>Estoque a custo <b>{formatCurrency(metrics.stockCost)}</b></span>
                    <span><ShoppingCart size={14}/>A caminho <b>{formatCurrency(metrics.openOrdersCost)}</b><small>{metrics.openOrdersUnits} un.</small></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}
