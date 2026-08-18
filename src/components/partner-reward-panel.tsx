"use client";

import {
  CheckCircle2,
  Gift,
  LoaderCircle,
  PackagePlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateOnly } from "@/lib/format";
import type { PartnerOverview, PartnerSettlement } from "@/lib/types";

type ProductOption = {
  id: string;
  name: string;
  flavor_tracking_enabled: boolean;
};

type FlavorOption = {
  id: string;
  product_id: string;
  name: string;
};

type LocationOption = {
  id: string;
  code: string;
  name: string;
};

type StockOption = {
  product_id: string;
  location_id: string;
  available_quantity: number;
};

type FlavorStockOption = StockOption & {
  flavor_id: string;
};

type RewardProgressPartner = PartnerOverview & {
  all_time_sales_count?: number;
  reward_sales_covered?: number;
  next_reward_at_sales?: number | null;
  sales_to_next_reward?: number | null;
};

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function PartnerRewardPanel({
  partner,
  settlements,
}: {
  partner: PartnerOverview;
  settlements: PartnerSettlement[];
}) {
  const router = useRouter();
  const metrics = partner as RewardProgressPartner;

  const [open, setOpen] = useState(false);
  const [deliveredOn, setDeliveredOn] = useState(todayInSaoPaulo());
  const [units, setUnits] = useState("1");
  const [description, setDescription] = useState(
    partner.reward_description ?? "1 suplemento à escolha do parceiro",
  );
  const [notes, setNotes] = useState("");
  const [productId, setProductId] = useState("");
  const [flavorId, setFlavorId] = useState("");
  const [locationId, setLocationId] = useState(
    partner.linked_location_id ?? "",
  );
  const [productQuantity, setProductQuantity] = useState("1");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [flavors, setFlavors] = useState<FlavorOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [stock, setStock] = useState<StockOption[]>([]);
  const [flavorStock, setFlavorStock] = useState<FlavorStockOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const rewardHistory = useMemo(
    () => settlements.filter((item) => item.reward_units > 0),
    [settlements],
  );

  const selectedProduct =
    products.find((item) => item.id === productId) ?? null;
  const productFlavors = flavors.filter(
    (item) => item.product_id === productId,
  );
  const availableProducts = products.filter((product) =>
    product.flavor_tracking_enabled
      ? flavorStock.some(
          (row) =>
            row.product_id === product.id && row.available_quantity > 0,
        )
      : stock.some(
          (row) =>
            row.product_id === product.id && row.available_quantity > 0,
        ),
  );
  const availableLocations = locations.filter((location) => {
    if (!productId) return true;

    return selectedProduct?.flavor_tracking_enabled
      ? flavorStock.some(
          (row) =>
            row.product_id === productId &&
            row.location_id === location.id &&
            row.available_quantity > 0,
        )
      : stock.some(
          (row) =>
            row.product_id === productId &&
            row.location_id === location.id &&
            row.available_quantity > 0,
        );
  });
  const availableFlavors = productFlavors.filter((flavor) =>
    flavorStock.some(
      (row) =>
        row.flavor_id === flavor.id &&
        row.location_id === locationId &&
        row.available_quantity > 0,
    ),
  );
  const selectedAvailableQuantity = selectedProduct?.flavor_tracking_enabled
    ? Number(
        flavorStock.find(
          (row) =>
            row.flavor_id === flavorId && row.location_id === locationId,
        )?.available_quantity ?? 0,
      )
    : Number(
        stock.find(
          (row) =>
            row.product_id === productId && row.location_id === locationId,
        )?.available_quantity ?? 0,
      );

  const totalSales = Number(metrics.all_time_sales_count ?? 0);
  const nextRewardAt = Number(
    metrics.next_reward_at_sales ??
      (Number(metrics.reward_sales_covered ?? 0) +
        Number(partner.target_sales ?? 0)),
  );
  const salesToNext = Math.max(
    0,
    Number(metrics.sales_to_next_reward ?? nextRewardAt - totalSales),
  );

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      const supabase = createClient();
      const [
        productResult,
        flavorResult,
        locationResult,
        stockResult,
        flavorStockResult,
      ] = await Promise.all([
        supabase
          .from("products")
          .select("id,name,flavor_tracking_enabled")
          .eq("active", true)
          .order("name"),
        supabase
          .from("product_flavors")
          .select("id,product_id,name")
          .eq("active", true)
          .order("display_order")
          .order("name"),
        supabase
          .from("locations")
          .select("id,code,name")
          .eq("active", true)
          .eq("tracks_inventory", true)
          .order("code"),
        supabase
          .from("sale_stock_availability")
          .select("product_id,location_id,available_quantity"),
        supabase
          .from("product_flavor_inventory_overview")
          .select("product_id,flavor_id,location_id,available_quantity")
          .eq("active", true),
      ]);

      if (cancelled) return;

      const error =
        productResult.error ??
        flavorResult.error ??
        locationResult.error ??
        stockResult.error ??
        flavorStockResult.error;

      if (error) {
        setMessage(error.message);
        return;
      }

      setProducts(
        (productResult.data ?? []).map((item) => ({
          id: String(item.id),
          name: String(item.name ?? ""),
          flavor_tracking_enabled: Boolean(item.flavor_tracking_enabled),
        })),
      );

      setFlavors(
        (flavorResult.data ?? []).map((item) => ({
          id: String(item.id),
          product_id: String(item.product_id),
          name: String(item.name ?? ""),
        })),
      );

      setLocations(
        (locationResult.data ?? []).map((item) => ({
          id: String(item.id),
          code: String(item.code ?? ""),
          name: String(item.name ?? ""),
        })),
      );

      setStock(
        (stockResult.data ?? []).map((item) => ({
          product_id: String(item.product_id),
          location_id: String(item.location_id),
          available_quantity: Number(item.available_quantity ?? 0),
        })),
      );

      setFlavorStock(
        (flavorStockResult.data ?? []).map((item) => ({
          product_id: String(item.product_id),
          flavor_id: String(item.flavor_id),
          location_id: String(item.location_id),
          available_quantity: Number(item.available_quantity ?? 0),
        })),
      );
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (productId && !locationId) {
        throw new Error(
          "Selecione de qual estoque o produto do brinde saiu.",
        );
      }

      if (selectedProduct?.flavor_tracking_enabled && !flavorId) {
        throw new Error("Selecione o sabor do produto entregue.");
      }

      const requestedQuantity = Math.max(
        1,
        Number(productQuantity || 1),
      );

      if (productId && selectedAvailableQuantity < requestedQuantity) {
        throw new Error(
          `Estoque insuficiente para esta recompensa. Disponível: ${selectedAvailableQuantity}.`,
        );
      }

      const selectedFlavor = flavors.find((item) => item.id === flavorId);

      const actualReward =
        productId && selectedProduct
          ? `${requestedQuantity}× ${selectedProduct.name}${
              selectedFlavor ? ` · ${selectedFlavor.name}` : ""
            }`
          : description.trim();

      const { error } = await createClient().rpc(
        "register_partner_reward_delivery",
        {
          p_partner_id: partner.id,
          p_delivered_on: deliveredOn,
          p_reward_units: Math.max(1, Number(units || 1)),
          p_reward_description: actualReward || null,
          p_notes: notes.trim() || null,
          p_product_id: productId || null,
          p_flavor_id: flavorId || null,
          p_location_id: productId ? locationId || null : null,
          p_product_quantity: productId ? requestedQuantity : 1,
        },
      );

      if (error) throw error;

      setMessage(
        productId
          ? "Recompensa entregue e produto baixado do estoque. A meta foi marcada como quitada sem apagar as vendas já contabilizadas."
          : "Recompensa entregue. A meta foi marcada como quitada sem apagar as vendas já contabilizadas.",
      );

      setOpen(false);
      setNotes("");
      setProductId("");
      setFlavorId("");
      setProductQuantity("1");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a recompensa.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="panel partner-settlement-panel">
      <div className="panel-head">
        <div>
          <h2>Recompensas da parceria</h2>
          <p>
            Registre o brinde real, inclusive antecipadamente. As vendas
            acumuladas são preservadas e a próxima meta avança normalmente.
          </p>
        </div>

        <button
          className="button gold compact-button"
          type="button"
          onClick={() => setOpen(!open)}
        >
          <Gift size={16} />
          Entregar recompensa
        </button>
      </div>

      <div className="panel-body partner-settlement-body">
        <div
          className="partner-progress-large"
          style={{ marginBottom: 12 }}
        >
          <div>
            <strong>{totalSales}</strong>
            <span>vendas contabilizadas na parceria</span>
          </div>

          <div>
            <strong>
              {salesToNext === 0 ? "Meta alcançada" : salesToNext}
            </strong>
            <span>
              {salesToNext === 0
                ? "recompensa disponível"
                : `venda(s) para a próxima recompensa · meta ${nextRewardAt}`}
            </span>
          </div>
        </div>

        {open && (
          <form className="crm-action-form" onSubmit={submit}>
            <div className="sale-action-form-head">
              <div>
                <strong>Registrar recompensa entregue</strong>
                <span>
                  Você pode liberar o brinde antes da meta quando decidir.
                </span>
              </div>

              <button
                className="icon-button"
                type="button"
                onClick={() => setOpen(false)}
              >
                <X size={17} />
              </button>
            </div>

            <div className="form-grid-two">
              <label className="field">
                <span>Data da entrega</span>
                <input
                  className="input"
                  type="date"
                  required
                  value={deliveredOn}
                  onChange={(event) => setDeliveredOn(event.target.value)}
                />
              </label>

              <label className="field">
                <span>Recompensas liberadas</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={units}
                  onChange={(event) => setUnits(event.target.value)}
                />
              </label>

              <label className="field field-span-two">
                <span>Produto entregue (opcional)</span>
                <select
                  className="select"
                  value={productId}
                  onChange={(event) => {
                    const nextProductId = event.target.value;
                    const nextProduct = products.find(
                      (item) => item.id === nextProductId,
                    );
                    const locationHasStock = (candidateId: string) =>
                      nextProduct?.flavor_tracking_enabled
                        ? flavorStock.some(
                            (row) =>
                              row.product_id === nextProductId &&
                              row.location_id === candidateId &&
                              row.available_quantity > 0,
                          )
                        : stock.some(
                            (row) =>
                              row.product_id === nextProductId &&
                              row.location_id === candidateId &&
                              row.available_quantity > 0,
                          );
                    const fallbackLocationId = nextProductId
                      ? locations.find((item) =>
                          locationHasStock(item.id),
                        )?.id ?? ""
                      : partner.linked_location_id ?? "";

                    setProductId(nextProductId);
                    setLocationId(
                      partner.linked_location_id &&
                        locationHasStock(partner.linked_location_id)
                        ? partner.linked_location_id
                        : fallbackLocationId,
                    );
                    setFlavorId("");
                  }}
                >
                  <option value="">
                    Somente registrar a recompensa, sem baixa de estoque
                  </option>
                  {availableProducts.map((item) => {
                    const totalAvailable = item.flavor_tracking_enabled
                      ? flavorStock
                          .filter((row) => row.product_id === item.id)
                          .reduce(
                            (total, row) => total + row.available_quantity,
                            0,
                          )
                      : stock
                          .filter((row) => row.product_id === item.id)
                          .reduce(
                            (total, row) => total + row.available_quantity,
                            0,
                          );

                    return (
                      <option key={item.id} value={item.id}>
                        {item.name} · {totalAvailable} disponível(is)
                      </option>
                    );
                  })}
                </select>
              </label>

              {productId &&
                selectedProduct?.flavor_tracking_enabled && (
                  <label className="field">
                    <span>Sabor</span>
                    <select
                      className="select"
                      required
                      value={flavorId}
                      onChange={(event) => setFlavorId(event.target.value)}
                    >
                      <option value="">Selecione</option>
                      {availableFlavors.map((item) => {
                        const available =
                          flavorStock.find(
                            (row) =>
                              row.flavor_id === item.id &&
                              row.location_id === locationId,
                          )?.available_quantity ?? 0;

                        return (
                          <option key={item.id} value={item.id}>
                            {item.name} · {available} disponível(is)
                          </option>
                        );
                      })}
                    </select>
                  </label>
                )}

              {productId && (
                <>
                  <label className="field">
                    <span>Quantidade do produto</span>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      max={selectedAvailableQuantity || undefined}
                      step="1"
                      required
                      value={productQuantity}
                      onChange={(event) =>
                        setProductQuantity(event.target.value)
                      }
                    />
                  </label>

                  <label className="field field-span-two">
                    <span>Origem do estoque</span>
                    <select
                      className="select"
                      required
                      value={locationId}
                      onChange={(event) => {
                        setLocationId(event.target.value);
                        setFlavorId("");
                      }}
                    >
                      <option value="">Selecione o estoque</option>
                      {availableLocations.map((item) => {
                        const available = selectedProduct?.flavor_tracking_enabled
                          ? flavorStock
                              .filter(
                                (row) =>
                                  row.product_id === productId &&
                                  row.location_id === item.id,
                              )
                              .reduce(
                                (total, row) =>
                                  total + row.available_quantity,
                                0,
                              )
                          : stock.find(
                              (row) =>
                                row.product_id === productId &&
                                row.location_id === item.id,
                            )?.available_quantity ?? 0;

                        return (
                          <option key={item.id} value={item.id}>
                            {item.code} · {item.name} · {available}{" "}
                            disponível(is)
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </>
              )}

              {!productId && (
                <label className="field field-span-two">
                  <span>Recompensa ou descrição</span>
                  <input
                    className="input"
                    required
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
              )}

              <label className="field field-span-two">
                <span>Observações</span>
                <textarea
                  className="textarea"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ex.: Brinde antecipado autorizado pelo Igor com 78 de 80 vendas."
                />
              </label>
            </div>

            {productId && (
              <p className="form-help">
                <PackagePlus
                  size={13}
                  style={{ verticalAlign: "middle" }}
                />{" "}
                O estoque só é baixado quando você confirmar esta entrega.
                Disponível para esta escolha: {selectedAvailableQuantity}. Se
                o saldo mudar antes da confirmação, nada será registrado.
              </p>
            )}

            <p className="form-help">
              A entrega antecipada não zera o progresso. Exemplo: se a
              recompensa da meta 80 for entregue com 78 vendas, a meta 80
              fica quitada e a próxima passa a ser 90 — faltando 12 vendas
              naquele momento.
            </p>

            <button
              className="button gold"
              disabled={
                loading ||
                Boolean(
                  productId &&
                    selectedAvailableQuantity <
                      Math.max(1, Number(productQuantity || 1)),
                )
              }
            >
              {loading ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {loading
                ? "Registrando"
                : "Confirmar entrega da recompensa"}
            </button>
          </form>
        )}

        {message && <p className="sale-action-message">{message}</p>}

        {rewardHistory.length === 0 ? (
          <div className="empty compact">
            <Gift size={24} />
            <strong>Nenhuma recompensa entregue</strong>
            Quando um brinde for liberado, ele ficará registrado aqui sem
            apagar as vendas já contabilizadas.
          </div>
        ) : (
          <div className="partner-settlement-list">
            {rewardHistory.map((item) => (
              <div className="partner-settlement-item" key={item.id}>
                <div>
                  <strong>{formatDateOnly(item.settled_on)}</strong>
                  <span>
                    {item.sale_count} venda(s) contabilizada(s) quando a
                    recompensa foi entregue
                  </span>
                  <small>
                    {item.reward_description ?? "Recompensa entregue"}
                    {item.notes ? ` · ${item.notes}` : ""}
                  </small>
                </div>

                <div>
                  <strong>{item.reward_units} brinde(s)</strong>
                  <span>Meta(s) quitada(s)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
