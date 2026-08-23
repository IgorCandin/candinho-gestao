"use client";

import { BadgePercent, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";

export function PendingSaleDiscountForm({
  saleId,
  grossAmount,
  discountAmount,
  totalAmount,
}: {
  saleId: string;
  grossAmount: number;
  discountAmount: number;
  totalAmount: number;
}) {
  const router = useRouter();
  const [discount, setDiscount] = useState(String(discountAmount));
  const [reason, setReason] = useState(
    "Ajuste comercial antes de receber ou entregar",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const nextTotal = Math.max(
    grossAmount - (Number(discount) || 0),
    0,
  );
  const anchorId = `ajustar-desconto-${saleId}`;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await createClient().rpc(
        "adjust_pending_sale_discount_v1",
        {
          p_sale_id: saleId,
          p_discount_amount: Number(discount) || 0,
          p_reason: reason.trim() || null,
        },
      );

      if (error) throw error;

      setMessage(
        "Desconto atualizado. Venda e PDF foram recalculados.",
      );

      // Mantém a pessoa na própria tela/posição de Correção. Em mobile,
      // evitar depender apenas do scroll restoration deixa o fluxo mais estável.
      if (typeof window !== "undefined") {
        const currentUrl = `${window.location.pathname}${window.location.search}#${anchorId}`;
        window.history.replaceState(
          window.history.state,
          "",
          currentUrl,
        );
      }

      router.refresh();

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          document
            .getElementById(anchorId)
            ?.scrollIntoView({
              block: "start",
              behavior: "auto",
            });
        }, 80);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível ajustar o desconto.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      id={anchorId}
      className="panel"
      onSubmit={submit}
      style={{ scrollMarginTop: 16 }}
    >
      <div className="panel-head">
        <div>
          <h2>Ajustar desconto</h2>
          <p>
            Disponível enquanto não houver pagamento recebido ou parcelamento.
            Os itens e as reservas não são alterados.
          </p>
        </div>
        <BadgePercent size={20} />
      </div>

      <div className="panel-body form-grid-two">
        <label className="field">
          <span>Desconto total (R$)</span>
          <input
            className="input"
            type="number"
            min="0"
            max={grossAmount}
            step="0.01"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Motivo</span>
          <input
            className="input"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>

        <div className="sale-detail-line">
          <span>Total atual</span>
          <strong>{formatCurrency(totalAmount)}</strong>
        </div>

        <div className="sale-detail-line">
          <span>Novo total</span>
          <strong>{formatCurrency(nextTotal)}</strong>
        </div>

        {message && (
          <p className="form-error visible field-span-two">
            {message}
          </p>
        )}

        <button
          className="button gold field-span-two"
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Save size={16} />
          )}
          Salvar desconto
        </button>
      </div>
    </form>
  );
}
