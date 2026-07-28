"use client";

import {
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function InventoryZeroBaselineButton({
  locationId,
  locationName,
}: {
  locationId: string;
  locationName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  async function confirmZero() {
    const confirmed = window.confirm(
      `Confirme somente se você conferiu fisicamente o ponto "${locationName}" e realmente não existe nenhum produto lá. O saldo continuará zero e o sistema passará a considerar esse zero como validado.`,
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();

      const { error } =
        await supabase.rpc(
          "confirm_inventory_zero_baseline",
          {
            p_location_id:
              locationId,
            p_notes:
              "Saldo zero conferido fisicamente pela tela de reconciliação.",
          },
        );

      if (error) throw error;

      setMessage(
        "Ponto zerado validado. O alerta de contagem inicial foi encerrado.",
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível validar o ponto.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inventory-zero-baseline-box">
      <strong>
        O ponto está realmente zerado?
      </strong>

      <p>
        Se você conferiu fisicamente e não existe nenhum produto neste ponto,
        não precisa escolher um produto só para gerar movimentação. Confirme o
        zero abaixo e o sistema passa a confiar nesse saldo como ponto inicial.
      </p>

      <div className="inventory-zero-baseline-actions">
        <button
          className="button ghost"
          type="button"
          onClick={confirmZero}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle
              className="spin"
              size={15}
            />
          ) : (
            <CheckCircle2
              size={15}
            />
          )}
          {loading
            ? "Validando..."
            : "Confirmar ponto zerado"}
        </button>
      </div>

      {message && (
        <small>{message}</small>
      )}
    </div>
  );
}
