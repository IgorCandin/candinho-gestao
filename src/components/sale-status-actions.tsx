"use client";

import { useState } from "react";
import {
  CalendarCheck2,
  LoaderCircle,
  PackageCheck,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ActionMode = "delivered" | "cancel" | null;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year =
    parts.find((part) => part.type === "year")?.value ?? "";
  const month =
    parts.find((part) => part.type === "month")?.value ?? "";
  const day =
    parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

export function SaleStatusActions({
  saleId,
  generalStatus,
  paymentStatus: _paymentStatus,
  deliveryStatus,
}: {
  saleId: string;
  generalStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ActionMode>(null);
  const [deliveredDate, setDeliveredDate] =
    useState(todayInSaoPaulo);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isCancelled = generalStatus === "cancelled";
  const canDeliver =
    !isCancelled && deliveryStatus === "to_deliver";

  async function markDelivered(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const { error } = await createClient().rpc(
        "mark_sale_delivered",
        {
          p_sale_id: saleId,
          p_delivered_on: deliveredDate,
        },
      );

      if (error) throw error;

      setMessage("Pedido marcado como entregue.");
      setMode(null);
      router.refresh();
    } catch (error) {
      setMessage(
        getErrorMessage(
          error,
          "Não foi possível atualizar a entrega.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancelSale(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const { error } = await createClient().rpc(
        "cancel_sale",
        {
          p_sale_id: saleId,
          p_reason: cancelReason.trim() || null,
        },
      );

      if (error) throw error;

      setMessage(
        "Venda cancelada. A reserva ou a baixa de estoque foi estornada automaticamente.",
      );
      setMode(null);
      router.refresh();
    } catch (error) {
      setMessage(
        getErrorMessage(
          error,
          "Não foi possível cancelar a venda.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCancelled) {
    return (
      <div className="sale-actions-complete">
        <Trash2 size={22} />
        <div>
          <strong>Venda cancelada</strong>
          <span>
            Ela não entra nos indicadores comerciais nem mantém
            reserva de estoque.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="sale-status-actions">
      {canDeliver ? (
        <div className="sale-action-buttons">
          <button
            className="button ghost"
            type="button"
            onClick={() =>
              setMode(
                mode === "delivered" ? null : "delivered",
              )
            }
          >
            <PackageCheck size={17} />
            Entregue
          </button>
        </div>
      ) : (
        <div className="sale-actions-complete">
          <CalendarCheck2 size={22} />
          <div>
            <strong>Entrega registrada</strong>
            <span>
              O pagamento é controlado separadamente no painel
              financeiro da venda.
            </span>
          </div>
        </div>
      )}

      <div className="sale-action-buttons">
        <button
          className="button danger"
          type="button"
          onClick={() =>
            setMode(mode === "cancel" ? null : "cancel")
          }
        >
          <Trash2 size={17} />
          Cancelar venda
        </button>
      </div>

      {mode === "delivered" && (
        <form
          className="sale-action-form"
          onSubmit={markDelivered}
        >
          <div className="sale-action-form-head">
            <div>
              <strong>Registrar entrega</strong>
              <span>
                A data de hoje já vem selecionada, mas pode ser
                alterada.
              </span>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Fechar"
              onClick={() => setMode(null)}
            >
              <X size={17} />
            </button>
          </div>

          <div className="sale-action-fields one-field">
            <label className="field">
              <span>Data da entrega</span>
              <input
                className="input"
                type="date"
                required
                value={deliveredDate}
                onChange={(event) =>
                  setDeliveredDate(event.target.value)
                }
              />
            </label>
          </div>

          <button
            className="button gold"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <PackageCheck size={17} />
            )}
            {isSubmitting
              ? "Salvando"
              : "Confirmar entrega"}
          </button>
        </form>
      )}

      {mode === "cancel" && (
        <form
          className="sale-action-form danger-form"
          onSubmit={cancelSale}
        >
          <div className="sale-action-form-head">
            <div>
              <strong>Cancelar esta venda</strong>
              <span>
                O estoque será liberado ou estornado
                automaticamente. Pagamentos já recebidos não são
                reembolsados automaticamente.
              </span>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Fechar"
              onClick={() => setMode(null)}
            >
              <X size={17} />
            </button>
          </div>

          <div className="sale-action-fields one-field">
            <label className="field">
              <span>Motivo do cancelamento</span>
              <textarea
                className="textarea"
                rows={3}
                value={cancelReason}
                onChange={(event) =>
                  setCancelReason(event.target.value)
                }
                placeholder="Ex.: cliente desistiu, venda lançada em duplicidade..."
              />
            </label>
          </div>

          <button
            className="button danger"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Trash2 size={17} />
            )}
            {isSubmitting
              ? "Cancelando"
              : "Confirmar cancelamento"}
          </button>
        </form>
      )}

      {message && (
        <p className="sale-action-message" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
