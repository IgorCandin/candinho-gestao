"use client";

import {
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  History,
  LoaderCircle,
  WalletCards,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";

const PAYMENT_METHODS = [
  "Pix",
  "Dinheiro",
  "Cartão",
  "Link de Pagamento",
  "Pagamento fracionado",
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number];

type PaymentSummary = {
  sale_id: string;
  total_amount: number;
  received_amount: number;
  outstanding_amount: number;
  payment_state: "pending" | "partial" | "received" | "cancelled";
  payment_entry_count: number;
  installment_count: number;
  planned_amount: number;
  next_payment_due_at: string | null;
  last_received_at: string | null;
  legacy_received_without_entries: boolean;
};

type PaymentInstallment = {
  id: string;
  sale_id: string;
  installment_no: number;
  installment_count: number;
  amount: number;
  due_on: string;
  planned_payment_method: string | null;
  notes: string | null;
  received_amount: number;
  outstanding_amount: number;
  status: "pending" | "partial" | "received" | "cancelled";
  is_overdue: boolean;
  last_received_at: string | null;
};

type PaymentEntry = {
  id: string;
  installment_id: string | null;
  amount: number;
  payment_method: string;
  received_at: string;
  notes: string | null;
};

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function paymentStateLabel(value: PaymentSummary["payment_state"]) {
  if (value === "received") return "Recebido";
  if (value === "partial") return "Pagamento parcial";
  if (value === "cancelled") return "Cancelado";
  return "Pendente";
}

function installmentStatusLabel(value: PaymentInstallment["status"]) {
  if (value === "received") return "Recebida";
  if (value === "partial") return "Parcial";
  if (value === "cancelled") return "Cancelada";
  return "Pendente";
}

function tone(value: string) {
  if (value === "received") return "green";
  if (value === "partial") return "orange";
  if (value === "cancelled") return "red";
  return "gray";
}

export function SalePaymentPanel({
  saleId,
  totalAmount,
  generalStatus,
  paymentStatus,
}: {
  saleId: string;
  totalAmount: number;
  generalStatus: string;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [entries, setEntries] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [targetInstallmentId, setTargetInstallmentId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [receivedOn, setReceivedOn] = useState(todayInSaoPaulo);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      const [summaryResult, installmentResult, entryResult] = await Promise.all([
        supabase
          .from("sale_payment_summary")
          .select("*")
          .eq("sale_id", saleId)
          .maybeSingle(),
        supabase
          .from("sale_payment_installment_overview")
          .select("*")
          .eq("sale_id", saleId)
          .order("due_on")
          .order("installment_no"),
        supabase
          .from("sale_payment_entries")
          .select("id,installment_id,amount,payment_method,received_at,notes")
          .eq("sale_id", saleId)
          .order("received_at", { ascending: false }),
      ]);

      const error =
        summaryResult.error ||
        installmentResult.error ||
        entryResult.error;

      if (error) throw error;

      const row = summaryResult.data;

      setSummary(
        row
          ? {
              sale_id: String(row.sale_id),
              total_amount: Number(row.total_amount ?? totalAmount),
              received_amount: Number(row.received_amount ?? 0),
              outstanding_amount: Number(row.outstanding_amount ?? 0),
              payment_state: String(row.payment_state ?? "pending") as PaymentSummary["payment_state"],
              payment_entry_count: Number(row.payment_entry_count ?? 0),
              installment_count: Number(row.installment_count ?? 0),
              planned_amount: Number(row.planned_amount ?? 0),
              next_payment_due_at:
                typeof row.next_payment_due_at === "string"
                  ? row.next_payment_due_at
                  : null,
              last_received_at:
                typeof row.last_received_at === "string"
                  ? row.last_received_at
                  : null,
              legacy_received_without_entries: Boolean(
                row.legacy_received_without_entries,
              ),
            }
          : {
              sale_id: saleId,
              total_amount: totalAmount,
              received_amount: paymentStatus === "received" ? totalAmount : 0,
              outstanding_amount: paymentStatus === "received" ? 0 : totalAmount,
              payment_state:
                generalStatus === "cancelled"
                  ? "cancelled"
                  : paymentStatus === "received"
                    ? "received"
                    : "pending",
              payment_entry_count: 0,
              installment_count: 0,
              planned_amount: 0,
              next_payment_due_at: null,
              last_received_at: null,
              legacy_received_without_entries: paymentStatus === "received",
            },
      );

      setInstallments(
        (installmentResult.data ?? []).map((item) => ({
          id: String(item.id),
          sale_id: String(item.sale_id),
          installment_no: Number(item.installment_no ?? 0),
          installment_count: Number(item.installment_count ?? 0),
          amount: Number(item.amount ?? 0),
          due_on: String(item.due_on ?? ""),
          planned_payment_method:
            typeof item.planned_payment_method === "string"
              ? item.planned_payment_method
              : null,
          notes: typeof item.notes === "string" ? item.notes : null,
          received_amount: Number(item.received_amount ?? 0),
          outstanding_amount: Number(item.outstanding_amount ?? 0),
          status: String(item.status ?? "pending") as PaymentInstallment["status"],
          is_overdue: Boolean(item.is_overdue),
          last_received_at:
            typeof item.last_received_at === "string"
              ? item.last_received_at
              : null,
        })),
      );

      setEntries(
        (entryResult.data ?? []).map((item) => ({
          id: String(item.id),
          installment_id:
            typeof item.installment_id === "string"
              ? item.installment_id
              : null,
          amount: Number(item.amount ?? 0),
          payment_method: String(item.payment_method ?? "—"),
          received_at: String(item.received_at ?? ""),
          notes: typeof item.notes === "string" ? item.notes : null,
        })),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os pagamentos da venda.",
      );
    } finally {
      setLoading(false);
    }
  }, [generalStatus, paymentStatus, saleId, totalAmount]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedInstallment = useMemo(
    () =>
      targetInstallmentId
        ? installments.find((row) => row.id === targetInstallmentId) ?? null
        : null,
    [installments, targetInstallmentId],
  );

  function openReceipt(installment?: PaymentInstallment) {
    setTargetInstallmentId(installment?.id ?? null);
    setAmount(
      Number(
        installment?.outstanding_amount ??
          summary?.outstanding_amount ??
          0,
      ).toFixed(2),
    );
    setReceivedOn(todayInSaoPaulo());
    setPaymentMethod(
      (installment?.planned_payment_method as PaymentMethod | null) ?? "Pix",
    );
    setNotes("");
    setMessage(null);
    setFormOpen(true);
  }

  async function submitReceipt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!summary) return;

    const receivedAmount = Number(amount);

    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      setMessage("Informe um valor recebido maior que zero.");
      return;
    }

    const maxAmount =
      selectedInstallment?.outstanding_amount ?? summary.outstanding_amount;

    if (receivedAmount > maxAmount + 0.005) {
      setMessage(
        `O valor ultrapassa o saldo disponível de ${formatCurrency(maxAmount)}.`,
      );
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const { error } = await createClient().rpc("register_sale_payment", {
        p_sale_id: saleId,
        p_amount: receivedAmount,
        p_received_on: receivedOn,
        p_payment_method: paymentMethod,
        p_installment_id: targetInstallmentId,
        p_notes: notes.trim() || null,
      });

      if (error) throw error;

      setFormOpen(false);
      setMessage(
        receivedAmount >= summary.outstanding_amount - 0.005
          ? "Pagamento registrado. A venda foi quitada."
          : "Pagamento parcial registrado. O saldo restante continua a receber.",
      );

      await load();
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o recebimento.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !summary) {
    return (
      <article className="panel">
        <div className="panel-body" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LoaderCircle className="spin" size={18} />
          Carregando pagamentos...
        </div>
      </article>
    );
  }

  if (!summary) return null;

  const canReceive =
    generalStatus !== "cancelled" && summary.outstanding_amount > 0.005;

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <h2>
            <WalletCards size={18} /> Pagamentos da venda
          </h2>
          <p>
            Previsão e dinheiro efetivamente recebido ficam separados. A venda só
            fica totalmente recebida quando o saldo chegar a zero.
          </p>
        </div>
        <span className={`badge ${tone(summary.payment_state)}`}>
          {paymentStateLabel(summary.payment_state)}
        </span>
      </div>

      <div className="panel-body" style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <div className="stat-card" style={{ minHeight: 0, padding: 14 }}>
            <div className="stat-note">Total da venda</div>
            <div className="stat-value" style={{ marginTop: 7, fontSize: 21 }}>
              {formatCurrency(summary.total_amount)}
            </div>
          </div>

          <div className="stat-card" style={{ minHeight: 0, padding: 14 }}>
            <div className="stat-note">Recebido</div>
            <div
              className="stat-value"
              style={{ marginTop: 7, fontSize: 21, color: "var(--green)" }}
            >
              {formatCurrency(summary.received_amount)}
            </div>
          </div>

          <div className="stat-card" style={{ minHeight: 0, padding: 14 }}>
            <div className="stat-note">Falta receber</div>
            <div
              className="stat-value"
              style={{
                marginTop: 7,
                fontSize: 21,
                color:
                  summary.outstanding_amount > 0
                    ? "var(--orange)"
                    : "var(--green)",
              }}
            >
              {formatCurrency(summary.outstanding_amount)}
            </div>
          </div>
        </div>

        {summary.next_payment_due_at && summary.outstanding_amount > 0 && (
          <div className="form-help">
            <CalendarClock
              size={14}
              style={{ verticalAlign: "middle", marginRight: 6 }}
            />
            Próximo vencimento:{" "}
            <strong>{formatDateOnly(summary.next_payment_due_at)}</strong>
          </div>
        )}

        {installments.length > 0 && (
          <div style={{ display: "grid", gap: 9 }}>
            <div>
              <strong>Parcelas previstas</strong>
              <p className="form-help" style={{ margin: "4px 0 0" }}>
                Cada parcela alimenta a Agenda e a projeção da Candinho Bank pelo
                próprio vencimento.
              </p>
            </div>

            {installments.map((row) => (
              <div
                key={row.id}
                className="list-item"
                style={{ alignItems: "flex-start" }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong>
                    Parcela {row.installment_no}/{row.installment_count} ·{" "}
                    {formatDateOnly(row.due_on)}
                  </strong>
                  <span>
                    Previsto: {formatCurrency(row.amount)}
                    {row.planned_payment_method
                      ? ` · ${row.planned_payment_method}`
                      : ""}
                  </span>
                  {row.received_amount > 0 && (
                    <span>
                      Recebido: {formatCurrency(row.received_amount)} · Saldo:{" "}
                      {formatCurrency(row.outstanding_amount)}
                    </span>
                  )}
                  {row.is_overdue && row.status !== "received" && (
                    <small className="warning-text">Parcela vencida</small>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <span className={`badge ${tone(row.status)}`}>
                    {installmentStatusLabel(row.status)}
                  </span>

                  {canReceive && row.outstanding_amount > 0.005 && (
                    <button
                      className="button gold compact-button"
                      type="button"
                      onClick={() => openReceipt(row)}
                    >
                      <CircleDollarSign size={15} />
                      Receber
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canReceive && (
          <div className="panel-actions">
            <button
              className="button gold"
              type="button"
              onClick={() => openReceipt()}
            >
              <CircleDollarSign size={16} />
              Registrar recebimento
            </button>
            {installments.length > 0 && (
              <small className="form-help">
                Sem escolher uma parcela, o valor é distribuído automaticamente
                entre as parcelas mais antigas ainda abertas.
              </small>
            )}
          </div>
        )}

        {formOpen && canReceive && (
          <form className="sale-action-form" onSubmit={submitReceipt}>
            <div className="sale-action-form-head">
              <div>
                <strong>
                  {selectedInstallment
                    ? `Receber parcela ${selectedInstallment.installment_no}/${selectedInstallment.installment_count}`
                    : "Registrar recebimento"}
                </strong>
                <span>
                  {selectedInstallment
                    ? `Saldo desta parcela: ${formatCurrency(
                        selectedInstallment.outstanding_amount,
                      )}`
                    : `Saldo total da venda: ${formatCurrency(
                        summary.outstanding_amount,
                      )}`}
                </span>
              </div>

              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={() => setFormOpen(false)}
              >
                <X size={17} />
              </button>
            </div>

            <div className="form-grid-two">
              <label className="field">
                <span>Valor recebido</span>
                <input
                  className="input"
                  type="number"
                  min="0.01"
                  max={
                    selectedInstallment?.outstanding_amount ??
                    summary.outstanding_amount
                  }
                  step="0.01"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>

              <label className="field">
                <span>Data do recebimento</span>
                <input
                  className="input"
                  type="date"
                  required
                  value={receivedOn}
                  onChange={(event) => setReceivedOn(event.target.value)}
                />
              </label>

              <label className="field field-span-two">
                <span>Forma de pagamento</span>
                <select
                  className="select"
                  required
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field-span-two">
                <span>Observação <small>(opcional)</small></span>
                <textarea
                  className="textarea"
                  rows={2}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ex.: primeira parte paga por Pix."
                />
              </label>
            </div>

            <button className="button gold" type="submit" disabled={submitting}>
              {submitting ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {submitting ? "Registrando" : "Confirmar recebimento"}
            </button>
          </form>
        )}

        {entries.length > 0 && (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <History size={16} />
              <strong>Histórico de recebimentos</strong>
            </div>

            {entries.map((entry) => {
              const installment = entry.installment_id
                ? installments.find((row) => row.id === entry.installment_id)
                : null;

              return (
                <div className="sale-detail-line" key={entry.id}>
                  <span>
                    {formatDate(entry.received_at)}
                    {installment
                      ? ` · Parcela ${installment.installment_no}/${installment.installment_count}`
                      : ""}
                  </span>
                  <strong>
                    {formatCurrency(entry.amount)} · {entry.payment_method}
                  </strong>
                </div>
              );
            })}
          </div>
        )}

        {summary.legacy_received_without_entries && (
          <p className="form-help">
            Esta é uma venda histórica marcada como recebida antes do controle
            detalhado de entradas. Ela continua sendo considerada integralmente
            quitada para preservar o histórico.
          </p>
        )}

        {message && (
          <p className="sale-action-message" aria-live="polite">
            {message}
          </p>
        )}
      </div>
    </article>
  );
}
