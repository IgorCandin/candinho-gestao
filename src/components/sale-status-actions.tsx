"use client";

import { useState } from "react";
import {
  CalendarCheck2,
  LoaderCircle,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import deliveryStyles from "./sale-delivery-supplies.module.css";

type ActionMode = "delivered" | "cancel" | null;
type DeliverySupply = {
  supply_id: string;
  name: string;
  unit_name: string;
  quantity_on_hand: number;
  average_unit_cost: number;
  suggested_quantity: number;
  suggestion_mode: "none" | "per_sale" | "capacity";
  capacity_product_units: number | null;
  notes: string | null;
  quantity: number;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
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
  const [deliveredDate, setDeliveredDate] = useState(todayInSaoPaulo);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [productUnits, setProductUnits] = useState(0);
  const [deliverySupplies, setDeliverySupplies] = useState<DeliverySupply[]>([]);

  const isCancelled = generalStatus === "cancelled";
  const canDeliver = !isCancelled && deliveryStatus === "to_deliver";
  const materialsCost = deliverySupplies.reduce(
    (sum, item) => sum + item.quantity * item.average_unit_cost,
    0,
  );

  async function openDelivery() {
    if (mode === "delivered") {
      setMode(null);
      return;
    }
    setMode("delivered");
    setMessage(null);
    setLoadingMaterials(true);
    try {
      const { data, error } = await createClient().rpc(
        "get_sale_delivery_supply_options",
        { p_operation_scope: "supplements", p_sale_id: saleId },
      );
      if (error) throw error;
      const raw = (data ?? {}) as Record<string, unknown>;
      setProductUnits(numberValue(raw.product_units));
      const items = Array.isArray(raw.items)
        ? (raw.items as Array<Record<string, unknown>>)
        : [];
      setDeliverySupplies(
        items.map((item) => ({
          supply_id: String(item.supply_id ?? ""),
          name: String(item.name ?? "Material"),
          unit_name: String(item.unit_name ?? "unidade"),
          quantity_on_hand: numberValue(item.quantity_on_hand),
          average_unit_cost: numberValue(item.average_unit_cost),
          suggested_quantity: numberValue(item.suggested_quantity),
          suggestion_mode:
            item.suggestion_mode === "per_sale" || item.suggestion_mode === "capacity"
              ? item.suggestion_mode
              : "none",
          capacity_product_units:
            item.capacity_product_units == null
              ? null
              : numberValue(item.capacity_product_units),
          notes: typeof item.notes === "string" ? item.notes : null,
          quantity: numberValue(item.suggested_quantity),
        })),
      );
    } catch (error) {
      setMessage(
        getErrorMessage(error, "Não foi possível carregar os materiais da entrega."),
      );
    } finally {
      setLoadingMaterials(false);
    }
  }

  function setSupplyQuantity(id: string, next: number) {
    setDeliverySupplies((current) =>
      current.map((item) =>
        item.supply_id === id ? { ...item, quantity: Math.max(0, next) } : item,
      ),
    );
  }

  async function markDelivered(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const { error } = await createClient().rpc(
        "mark_sale_delivered_with_supplies",
        {
          p_sale_id: saleId,
          p_delivered_on: deliveredDate,
          p_supplies: deliverySupplies.map((item) => ({
            supply_id: item.supply_id,
            quantity: item.quantity,
          })),
        },
      );
      if (error) throw error;
      setMessage("Entrega registrada e materiais confirmados.");
      setMode(null);
      router.refresh();
    } catch (error) {
      setMessage(
        getErrorMessage(error, "Não foi possível atualizar a entrega."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancelSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const { error } = await createClient().rpc("cancel_sale", {
        p_sale_id: saleId,
        p_reason: cancelReason.trim() || null,
      });
      if (error) throw error;
      setMessage(
        "Venda cancelada. A reserva ou a baixa de estoque foi estornada automaticamente.",
      );
      setMode(null);
      router.refresh();
    } catch (error) {
      setMessage(getErrorMessage(error, "Não foi possível cancelar a venda."));
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
          <span>Ela não entra nos indicadores comerciais nem mantém reserva de estoque.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sale-status-actions">
      {canDeliver ? (
        <div className="sale-action-buttons">
          <button className="button ghost" type="button" onClick={openDelivery}>
            <PackageCheck size={17} /> Entregue
          </button>
        </div>
      ) : (
        <div className="sale-actions-complete">
          <CalendarCheck2 size={22} />
          <div>
            <strong>Entrega registrada</strong>
            <span>O pagamento é controlado separadamente no painel financeiro da venda.</span>
          </div>
        </div>
      )}

      <div className="sale-action-buttons">
        <button
          className="button danger"
          type="button"
          onClick={() => setMode(mode === "cancel" ? null : "cancel")}
        >
          <Trash2 size={17} /> Cancelar venda
        </button>
      </div>

      {mode === "delivered" && (
        <form className="sale-action-form" onSubmit={markDelivered}>
          <div className="sale-action-form-head">
            <div>
              <strong>Registrar entrega</strong>
              <span>Confirme a data e informe apenas o que realmente foi usado neste pedido.</span>
            </div>
            <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setMode(null)}>
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
                onChange={(event) => setDeliveredDate(event.target.value)}
              />
            </label>
          </div>

          <div className={deliveryStyles.materials}>
            <div className={deliveryStyles.intro}>
              <strong>Embalagem usada nesta entrega</strong>
              <span>
                Sacolas e cartões não são automáticos. Informe zero, uma ou várias unidades conforme o pedido real.
              </span>
            </div>

            {productUnits > 0 && (
              <div className={deliveryStyles.hint}>
                Esta venda possui <strong>{productUnits} produto(s)</strong>. Se, por exemplo, você usar 1 sacola a cada 2 produtos, seriam {Math.ceil(productUnits / 2)} sacola(s). É só uma referência: escolha o que realmente usou.
              </div>
            )}

            {loadingMaterials ? (
              <div className={deliveryStyles.hint}>
                <LoaderCircle className="spin" size={14} /> Carregando materiais...
              </div>
            ) : deliverySupplies.length === 0 ? (
              <div className={deliveryStyles.hint}>
                Nenhuma sacola ou cartão está configurado para escolha na entrega. Você pode confirmar normalmente.
              </div>
            ) : (
              <div className={deliveryStyles.rows}>
                {deliverySupplies.map((item) => (
                  <div className={deliveryStyles.row} key={item.supply_id}>
                    <div className={deliveryStyles.copy}>
                      <strong>{item.name}</strong>
                      <span>
                        Estoque {item.quantity_on_hand} · {formatCurrency(item.average_unit_cost)} por {item.unit_name}
                        {item.suggested_quantity > 0 ? ` · sugestão ${item.suggested_quantity}` : ""}
                      </span>
                    </div>
                    <div className={deliveryStyles.quantity}>
                      <button type="button" onClick={() => setSupplyQuantity(item.supply_id, item.quantity - 1)}>
                        <Minus size={14} />
                      </button>
                      <input
                        aria-label={`Quantidade de ${item.name}`}
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => setSupplyQuantity(item.supply_id, numberValue(event.target.value))}
                      />
                      <button type="button" onClick={() => setSupplyQuantity(item.supply_id, item.quantity + 1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={deliveryStyles.summary}>
              <button
                className={deliveryStyles.zeroButton}
                type="button"
                onClick={() =>
                  setDeliverySupplies((current) =>
                    current.map((item) => ({ ...item, quantity: 0 })),
                  )
                }
              >
                <ShoppingBag size={13} /> Não usei sacola/cartão
              </button>
              <span>
                Custo desta embalagem: <strong>{formatCurrency(materialsCost)}</strong>
              </span>
            </div>
          </div>

          <button className="button gold" disabled={isSubmitting || loadingMaterials} type="submit">
            {isSubmitting ? <LoaderCircle className="spin" size={17} /> : <PackageCheck size={17} />}
            {isSubmitting ? "Salvando" : "Confirmar entrega"}
          </button>
        </form>
      )}

      {mode === "cancel" && (
        <form className="sale-action-form danger-form" onSubmit={cancelSale}>
          <div className="sale-action-form-head">
            <div>
              <strong>Cancelar esta venda</strong>
              <span>O estoque será liberado ou estornado automaticamente. Pagamentos já recebidos não são reembolsados automaticamente.</span>
            </div>
            <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setMode(null)}>
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
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Ex.: cliente desistiu, venda lançada em duplicidade..."
              />
            </label>
          </div>
          <button className="button danger" disabled={isSubmitting} type="submit">
            {isSubmitting ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}
            {isSubmitting ? "Cancelando" : "Confirmar cancelamento"}
          </button>
        </form>
      )}

      {message && <p className="sale-action-message" aria-live="polite">{message}</p>}
    </div>
  );
}
