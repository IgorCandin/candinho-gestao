"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  LoaderCircle,
  PackageCheck,
  ScanBarcode,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SupplierOrderItem } from "@/lib/types";

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type ReceiveItem = SupplierOrderItem & {
  flavor_name?: string | null;
  lot_tracking_enabled?: boolean;
};

export function ReceivePurchaseItemForm({
  item,
}: {
  item: ReceiveItem;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(
    String(item.quantity_pending),
  );
  const [receivedOn, setReceivedOn] = useState(
    todayBrazil(),
  );
  const [unitCost, setUnitCost] = useState(
    String(item.unit_cost.toFixed(2)),
  );
  const [lotNumber, setLotNumber] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [notes, setNotes] = useState("");
  const [trackingEnabled, setTrackingEnabled] =
    useState(Boolean(item.lot_tracking_enabled));
  const [checkingTracking, setCheckingTracking] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadTracking() {
      setCheckingTracking(true);

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("products")
          .select("lot_tracking_enabled")
          .eq("id", item.product_id)
          .single();

        if (error) throw error;

        if (!cancelled) {
          setTrackingEnabled(
            Boolean(data?.lot_tracking_enabled),
          );
        }
      } catch {
        if (!cancelled) {
          setTrackingEnabled(
            Boolean(item.lot_tracking_enabled),
          );
        }
      } finally {
        if (!cancelled) setCheckingTracking(false);
      }
    }

    void loadTracking();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    item.product_id,
    item.lot_tracking_enabled,
  ]);

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");

    if (
      trackingEnabled &&
      (!lotNumber.trim() || !expiresOn)
    ) {
      setMessage(
        "Este produto usa rastreio. Informe lote e validade.",
      );
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "receive_purchase_order_item_v2",
        {
          p_item_id: item.id,
          p_quantity: Number(quantity),
          p_received_on: receivedOn,
          p_unit_cost: Number(unitCost),
          p_lot_number:
            lotNumber.trim() || null,
          p_expires_on: expiresOn || null,
          p_notes: notes.trim() || null,
        },
      );

      if (error) throw error;

      setOpen(false);
      setLotNumber("");
      setExpiresOn("");
      setNotes("");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível receber o item.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        className="button gold"
        type="button"
        onClick={() => setOpen(true)}
      >
        <PackageCheck size={16} />
        Receber item
      </button>
    );
  }

  return (
    <form
      className="receive-item-form"
      onSubmit={submit}
    >
      <div className="sale-action-form-head">
        <div>
          <strong>
            Receber {item.product_name}
            {item.flavor_name
              ? ` · ${item.flavor_name}`
              : ""}
          </strong>

          <span>
            O estoque será atualizado no produto e sabor
            corretos. Produtos rastreados exigem lote e
            validade.
          </span>
        </div>

        <button
          className="icon-button"
          type="button"
          aria-label="Fechar"
          onClick={() => setOpen(false)}
        >
          <X size={16} />
        </button>
      </div>

      <div className="receive-item-fields">
        <label className="field">
          <span>Quantidade recebida</span>
          <input
            className="input"
            type="number"
            min="1"
            max={item.quantity_pending}
            required
            value={quantity}
            onChange={(event) =>
              setQuantity(event.target.value)
            }
          />
        </label>

        <label className="field">
          <span>Data do recebimento</span>
          <input
            className="input"
            type="date"
            required
            value={receivedOn}
            onChange={(event) =>
              setReceivedOn(event.target.value)
            }
          />
        </label>

        <label className="field">
          <span>Custo unitário final</span>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            required
            value={unitCost}
            onChange={(event) =>
              setUnitCost(event.target.value)
            }
          />
        </label>

        <label className="field">
          <span>
            <ScanBarcode size={14} />
            Lote
          </span>
          <input
            className="input"
            value={lotNumber}
            required={trackingEnabled}
            onChange={(event) =>
              setLotNumber(event.target.value)
            }
            placeholder={
              trackingEnabled
                ? "Obrigatório"
                : "Opcional"
            }
          />
        </label>

        <label className="field">
          <span>
            <CalendarClock size={14} />
            Validade
          </span>
          <input
            className="input"
            type="date"
            min={receivedOn}
            required={trackingEnabled}
            value={expiresOn}
            onChange={(event) =>
              setExpiresOn(event.target.value)
            }
          />

          <small>
            {checkingTracking
              ? "Verificando configuração do produto..."
              : trackingEnabled
                ? "Obrigatório para este produto."
                : "Opcional enquanto o rastreio não estiver ativo."}
          </small>
        </label>

        <label className="field">
          <span>Observação</span>
          <input
            className="input"
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Nota fiscal, divergência, observação..."
          />
        </label>
      </div>

      <button
        className="button gold"
        type="submit"
        disabled={loading || checkingTracking}
      >
        {loading ? (
          <LoaderCircle
            className="spin"
            size={16}
          />
        ) : (
          <PackageCheck size={16} />
        )}

        {loading
          ? "Recebendo"
          : "Confirmar recebimento"}
      </button>

      {message && (
        <p className="sale-action-message">
          {message}
        </p>
      )}
    </form>
  );
}
