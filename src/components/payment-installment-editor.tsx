"use client";

import { CalendarDays, Plus, RotateCcw, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export const INSTALLMENT_PAYMENT_METHODS = [
  "Pix",
  "Dinheiro",
  "Cartão",
  "Link de Pagamento",
] as const;

export type PaymentInstallmentDraft = {
  key: string;
  amount: string;
  dueOn: string;
  plannedPaymentMethod: string;
  notes: string;
};

function draftKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function cents(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100);
}

function moneyFromCents(value: number) {
  return (value / 100).toFixed(2);
}

function addDays(date: string, amount: number) {
  const base = date ? new Date(`${date}T12:00:00`) : new Date();
  base.setDate(base.getDate() + amount);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
}

export function createEqualInstallments(
  total: number,
  count = 2,
  firstDueOn: string,
): PaymentInstallmentDraft[] {
  const safeCount = Math.max(2, Math.floor(count));
  const totalCents = Math.max(0, cents(total));
  const base = Math.floor(totalCents / safeCount);
  const remainder = totalCents - base * safeCount;

  return Array.from({ length: safeCount }, (_, index) => ({
    key: draftKey(),
    amount: moneyFromCents(base + (index < remainder ? 1 : 0)),
    dueOn: addDays(firstDueOn, index * 9),
    plannedPaymentMethod: "",
    notes: "",
  }));
}

export function PaymentInstallmentEditor({
  total,
  installments,
  onChange,
  firstDueOn,
}: {
  total: number;
  installments: PaymentInstallmentDraft[];
  onChange: (rows: PaymentInstallmentDraft[]) => void;
  firstDueOn: string;
}) {
  const totalCents = cents(total);
  const allocatedCents = installments.reduce(
    (sum, row) => sum + cents(Number(row.amount) || 0),
    0,
  );
  const differenceCents = totalCents - allocatedCents;

  function update(key: string, changes: Partial<PaymentInstallmentDraft>) {
    onChange(
      installments.map((row) =>
        row.key === key ? { ...row, ...changes } : row,
      ),
    );
  }

  function addInstallment() {
    const lastDate =
      installments[installments.length - 1]?.dueOn || firstDueOn;
    onChange([
      ...installments,
      {
        key: draftKey(),
        amount: "0.00",
        dueOn: addDays(lastDate, 9),
        plannedPaymentMethod: "",
        notes: "",
      },
    ]);
  }

  function removeInstallment(key: string) {
    if (installments.length <= 2) return;
    onChange(installments.filter((row) => row.key !== key));
  }

  function redistribute() {
    onChange(
      createEqualInstallments(
        total,
        Math.max(installments.length, 2),
        installments[0]?.dueOn || firstDueOn,
      ).map((row, index) => ({
        ...row,
        plannedPaymentMethod:
          installments[index]?.plannedPaymentMethod ?? "",
        notes: installments[index]?.notes ?? "",
        dueOn: installments[index]?.dueOn || row.dueOn,
      })),
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        <div className="stat-card" style={{ minHeight: 0, padding: 12 }}>
          <div className="stat-note">Total da venda</div>
          <div className="stat-value" style={{ fontSize: 18, marginTop: 6 }}>
            {formatCurrency(total)}
          </div>
        </div>
        <div className="stat-card" style={{ minHeight: 0, padding: 12 }}>
          <div className="stat-note">Distribuído</div>
          <div className="stat-value" style={{ fontSize: 18, marginTop: 6 }}>
            {formatCurrency(allocatedCents / 100)}
          </div>
        </div>
        <div className="stat-card" style={{ minHeight: 0, padding: 12 }}>
          <div className="stat-note">Diferença</div>
          <div
            className="stat-value"
            style={{
              fontSize: 18,
              marginTop: 6,
              color:
                differenceCents === 0
                  ? "var(--green)"
                  : "var(--orange)",
            }}
          >
            {formatCurrency(differenceCents / 100)}
          </div>
        </div>
      </div>

      <div className="panel-actions" style={{ justifyContent: "space-between" }}>
        <small className="form-help">
          A soma das parcelas precisa ser exatamente igual ao total final.
        </small>
        <button
          type="button"
          className="button ghost compact-button"
          onClick={redistribute}
        >
          <RotateCcw size={15} />
          Dividir igualmente
        </button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {installments.map((row, index) => (
          <div
            key={row.key}
            className="sale-action-form"
            style={{ margin: 0 }}
          >
            <div className="sale-action-form-head">
              <div>
                <strong>Parcela {index + 1}</strong>
                <span>
                  Previsão financeira. O dinheiro só entra quando o recebimento
                  for registrado.
                </span>
              </div>
              {installments.length > 2 && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remover parcela ${index + 1}`}
                  onClick={() => removeInstallment(row.key)}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="form-grid-two">
              <label className="field">
                <span>Valor</span>
                <input
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={row.amount}
                  onChange={(event) =>
                    update(row.key, { amount: event.target.value })
                  }
                />
              </label>

              <label className="field">
                <span>Vencimento</span>
                <input
                  className="input"
                  type="date"
                  required
                  value={row.dueOn}
                  onChange={(event) =>
                    update(row.key, { dueOn: event.target.value })
                  }
                />
              </label>

              <label className="field field-span-two">
                <span>Forma prevista <small>(opcional)</small></span>
                <select
                  className="select"
                  value={row.plannedPaymentMethod}
                  onChange={(event) =>
                    update(row.key, {
                      plannedPaymentMethod: event.target.value,
                    })
                  }
                >
                  <option value="">Ainda não definida</option>
                  {INSTALLMENT_PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="button ghost"
        onClick={addInstallment}
      >
        <Plus size={16} />
        Adicionar parcela
      </button>

      {differenceCents !== 0 && (
        <p className="form-message" style={{ margin: 0 }}>
          {differenceCents > 0
            ? `Ainda faltam ${formatCurrency(differenceCents / 100)} para distribuir.`
            : `As parcelas ultrapassam o total em ${formatCurrency(
                Math.abs(differenceCents) / 100,
              )}.`}
        </p>
      )}

      <div className="form-help">
        <CalendarDays
          size={13}
          style={{ verticalAlign: "middle", marginRight: 5 }}
        />
        Cada vencimento aparecerá separadamente na Agenda e na Candinho Bank.
      </div>
    </div>
  );
}
