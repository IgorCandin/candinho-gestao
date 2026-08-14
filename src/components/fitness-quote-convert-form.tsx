"use client";

import {
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  MessageSquareText,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

type PaymentMode =
  | "receivable"
  | "paid"
  | "combined";

const PAYMENT_OPTIONS: Array<{
  value: PaymentMode;
  title: string;
  description: string;
}> = [
  {
    value: "receivable",
    title: "A receber",
    description:
      "A venda é confirmada, mas o recebimento fica pendente.",
  },
  {
    value: "paid",
    title: "Pago",
    description:
      "Registra o recebimento e a forma de pagamento agora.",
  },
  {
    value: "combined",
    title: "Pagamento combinado",
    description:
      "A cliente combinou uma data para pagar depois.",
  },
];

export function FitnessQuoteConvertForm({
  id,
}: {
  id: string;
}) {
  const router = useRouter();
  const [mode, setMode] =
    useState<PaymentMode>("receivable");
  const [paidOn, setPaidOn] =
    useState(today());
  const [method, setMethod] =
    useState("Pix");
  const [dueOn, setDueOn] =
    useState(today());
  const [delivered, setDelivered] =
    useState(false);
  const [deliveredOn, setDeliveredOn] =
    useState(today());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  async function convert() {
    if (loading) return;

    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await createClient().rpc(
        "convert_fitness_quote_to_sale",
        {
          p_quote_id: id,
          p_payment_mode: mode,
          p_paid_on:
            mode === "paid" ? paidOn : null,
          p_payment_method:
            mode === "paid" ? method : null,
          p_payment_due_on:
            mode === "combined" ? dueOn : null,
          p_delivered: delivered,
          p_delivered_on:
            delivered ? deliveredOn : null,
          p_notes: notes.trim() || null,
        },
      );

      if (error) throw error;

      router.push(
        `/fitness/vendas/${String(data)}`,
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível converter o orçamento.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function close(
    status: "lost" | "cancelled",
  ) {
    if (loading) return;

    setLoading(true);
    setMessage(null);

    const { error } = await createClient().rpc(
      "update_fitness_quote_status",
      {
        p_quote_id: id,
        p_status: status,
        p_notes:
          status === "lost"
            ? "Cliente não fechou o orçamento"
            : "Orçamento cancelado",
      },
    );

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/fitness/orcamentos");
    router.refresh();
  }

  return (
    <article className="panel fitness-finalize-panel">
      <div className="panel-head">
        <div>
          <h2>Finalizar orçamento</h2>
          <p>
            A proposta só vira venda depois desta confirmação. O estoque real é validado aqui, e o relacionamento continua no mesmo fluxo da Fitness.
          </p>
        </div>
        <ShoppingBag size={19} />
      </div>

      <div className="panel-body fitness-finalize-flow">
        <section
          className="fitness-finalize-stage"
          data-emphasis="true"
        >
          <div className="fitness-finalize-stage-head">
            <CheckCircle2 size={18} />
            <div>
              <strong>1. Pagamento</strong>
              <small>
                Escolha como a venda fica financeiramente no momento da confirmação.
              </small>
            </div>
          </div>

          <div className="fitness-finalize-choice-grid">
            {PAYMENT_OPTIONS.map((option) => (
              <button
                className={`fitness-finalize-choice ${
                  mode === option.value
                    ? "active"
                    : ""
                }`}
                type="button"
                key={option.value}
                onClick={() =>
                  setMode(option.value)
                }
              >
                <strong>{option.title}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </div>

          {mode === "paid" && (
            <div className="fitness-finalize-fields">
              <label className="field">
                <span>Data do recebimento</span>
                <input
                  className="input"
                  type="date"
                  value={paidOn}
                  onChange={(event) =>
                    setPaidOn(event.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Forma de pagamento</span>
                <select
                  className="select"
                  value={method}
                  onChange={(event) =>
                    setMethod(event.target.value)
                  }
                >
                  {[
                    "Pix",
                    "Dinheiro",
                    "Cartão",
                    "Link de Pagamento",
                    "Pagamento fracionado",
                  ].map((item) => (
                    <option key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {mode === "combined" && (
            <div className="fitness-finalize-fields">
              <label className="field">
                <span>Data combinada</span>
                <input
                  className="input"
                  type="date"
                  value={dueOn}
                  onChange={(event) =>
                    setDueOn(event.target.value)
                  }
                />
              </label>
            </div>
          )}
        </section>

        <section className="fitness-finalize-stage">
          <div className="fitness-finalize-stage-head">
            <CalendarDays size={18} />
            <div>
              <strong>2. Entrega</strong>
              <small>
                Informe se a cliente já saiu com as peças. A baixa efetiva respeita a situação da entrega.
              </small>
            </div>
          </div>

          <label className="switch-row">
            <div>
              <strong>Já foi entregue</strong>
              <span>
                Confirmar a entrega junto com a conversão.
              </span>
            </div>
            <input
              type="checkbox"
              checked={delivered}
              onChange={(event) =>
                setDelivered(event.target.checked)
              }
            />
          </label>

          {delivered && (
            <div className="fitness-finalize-fields">
              <label className="field">
                <span>Data da entrega</span>
                <input
                  className="input"
                  type="date"
                  value={deliveredOn}
                  onChange={(event) =>
                    setDeliveredOn(
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>
          )}
        </section>

        <section className="fitness-finalize-stage">
          <div className="fitness-finalize-stage-head">
            <MessageSquareText size={18} />
            <div>
              <strong>3. O que o ERP faz depois</strong>
              <small>
                A confirmação não termina em uma tela isolada; ela alimenta as próximas etapas da operação.
              </small>
            </div>
          </div>

          <div className="fitness-finalize-next">
            <div>
              <strong>Estoque</strong>
              <span>
                A disponibilidade da variação é validada antes de criar a venda.
              </span>
            </div>
            <div>
              <strong>Comercial</strong>
              <span>
                A venda passa para a lista com pagamento e entrega no status escolhido.
              </span>
            </div>
            <div>
              <strong>Relacionamento</strong>
              <span>
                A cliente segue no histórico Fitness e entra no ciclo de pós-venda conforme a compra mais recente.
              </span>
            </div>
          </div>
        </section>

        <section className="fitness-finalize-stage">
          <div className="fitness-finalize-stage-head">
            <MessageSquareText size={18} />
            <div>
              <strong>4. Observações</strong>
              <small>
                Registre combinação, preferência ou detalhe que precisa acompanhar a venda.
              </small>
            </div>
          </div>

          <textarea
            className="textarea"
            rows={3}
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
          />
        </section>

        {message && (
          <p className="form-error visible">
            {message}
          </p>
        )}

        <div className="panel-actions">
          <button
            type="button"
            className="button gold"
            disabled={loading}
            onClick={convert}
          >
            {loading ? (
              <LoaderCircle
                className="spin"
                size={16}
              />
            ) : (
              <ShoppingBag size={16} />
            )}
            {loading
              ? "Confirmando"
              : "Confirmar venda"}
          </button>

          <button
            type="button"
            className="button ghost"
            disabled={loading}
            onClick={() => void close("lost")}
          >
            <XCircle size={16} />
            Cliente não fechou
          </button>

          <button
            type="button"
            className="button ghost"
            disabled={loading}
            onClick={() => void close("cancelled")}
          >
            Cancelar orçamento
          </button>
        </div>
      </div>
    </article>
  );
}
