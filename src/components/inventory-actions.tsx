"use client";

import {
  ArrowRightLeft,
  ClipboardCheck,
  LoaderCircle,
  PackagePlus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  InventoryLocationRow,
  InventoryOverviewRow,
  LocationOption,
} from "@/lib/types";

type ActionMode = "count" | "adjust" | "transfer" | null;

type FlavorOption = {
  id: string;
  productId: string;
  name: string;
};

type FlavorInventory = {
  flavorId: string;
  locationId: string;
  physical: number;
  reserved: number;
  available: number;
  incoming: number;
};

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function InventoryActions({
  products,
  locations,
  locationRows,
  initialProductId = "",
  initialLocationId = "",
  initialMode = null,
  successHref = "",
}: {
  products: InventoryOverviewRow[];
  locations: LocationOption[];
  locationRows: InventoryLocationRow[];
  initialProductId?: string;
  initialLocationId?: string;
  initialMode?: Exclude<ActionMode, null> | null;
  successHref?: string;
}) {
  const router = useRouter();

  const fallbackLocation =
    locations.find((location) => location.code === "CS")?.id ??
    locations[0]?.id ??
    "";

  const validInitialLocation = locations.some(
    (location) => location.id === initialLocationId,
  )
    ? initialLocationId
    : fallbackLocation;

  const [mode, setMode] = useState<ActionMode>(initialMode);
  const [productId, setProductId] = useState(initialProductId);
  const [flavorId, setFlavorId] = useState("");
  const [locationId, setLocationId] = useState(validInitialLocation);
  const [destinationId, setDestinationId] = useState(
    locations.find((location) => location.id !== validInitialLocation)?.id ?? "",
  );
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayBrazil());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [flavors, setFlavors] = useState<FlavorOption[]>([]);
  const [flavorInventory, setFlavorInventory] = useState<FlavorInventory[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const [flavorResult, inventoryResult] = await Promise.all([
        supabase
          .from("product_flavors")
          .select("id,product_id,name")
          .eq("active", true)
          .order("display_order")
          .order("name"),
        supabase
          .from("product_flavor_inventory_overview")
          .select(
            "flavor_id,location_id,physical_quantity,reserved_quantity,available_quantity,incoming_quantity",
          ),
      ]);

      if (cancelled) return;

      const error = flavorResult.error || inventoryResult.error;
      if (error) {
        setMessage(error.message);
        return;
      }

      setFlavors(
        (flavorResult.data ?? []).map((row) => ({
          id: String(row.id),
          productId: String(row.product_id),
          name: String(row.name ?? ""),
        })),
      );

      setFlavorInventory(
        (inventoryResult.data ?? []).map((row) => ({
          flavorId: String(row.flavor_id),
          locationId: String(row.location_id),
          physical: Number(row.physical_quantity ?? 0),
          reserved: Number(row.reserved_quantity ?? 0),
          available: Number(row.available_quantity ?? 0),
          incoming: Number(row.incoming_quantity ?? 0),
        })),
      );
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const current = useMemo(
    () =>
      locationRows.find(
        (row) =>
          row.product_id === productId && row.location_id === locationId,
      ) ?? null,
    [locationRows, productId, locationId],
  );

  const selectedProduct = products.find(
    (product) => product.product_id === productId,
  );

  const productFlavors = flavors.filter(
    (flavor) => flavor.productId === productId,
  );

  const selectedFlavor =
    productFlavors.find((flavor) => flavor.id === flavorId) ?? null;

  const selectedFlavorInventory =
    flavorInventory.find(
      (row) => row.flavorId === flavorId && row.locationId === locationId,
    ) ?? null;

  function open(next: Exclude<ActionMode, null>) {
    setMode(next);
    setMessage("");
    setQuantity("");
    setNotes("");
    setDate(todayBrazil());
    setFlavorId("");

    if (initialProductId) setProductId(initialProductId);
    if (initialLocationId) setLocationId(initialLocationId);
  }

  function close() {
    if (!loading) setMode(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!productId || !locationId) {
        throw new Error("Selecione o produto e o local.");
      }

      if (productFlavors.length > 0 && !flavorId) {
        throw new Error("Selecione o sabor.");
      }

      const supabase = createClient();

      if (mode === "count") {
        const { error } = await supabase.rpc("register_inventory_count_v2", {
          p_product_id: productId,
          p_location_id: locationId,
          p_flavor_id: flavorId || null,
          p_counted_quantity: Number(quantity),
          p_counted_on: date,
          p_notes: notes.trim() || null,
        });
        if (error) throw error;
      }

      if (mode === "adjust") {
        const { error } = await supabase.rpc("register_inventory_adjustment_v2", {
          p_product_id: productId,
          p_location_id: locationId,
          p_flavor_id: flavorId || null,
          p_quantity_delta: Number(quantity),
          p_occurred_on: date,
          p_notes: notes.trim() || null,
        });
        if (error) throw error;
      }

      if (mode === "transfer") {
        if (!destinationId) {
          throw new Error("Selecione o estoque de destino.");
        }

        const { error } = await supabase.rpc("transfer_inventory_v2", {
          p_product_id: productId,
          p_source_location_id: locationId,
          p_destination_location_id: destinationId,
          p_flavor_id: flavorId || null,
          p_quantity: Number(quantity),
          p_transferred_on: date,
          p_notes: notes.trim() || null,
        });
        if (error) throw error;
      }

      setMode(null);

      if (successHref) {
        router.push(successHref);
      }

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o estoque.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="inventory-action-buttons">
        <button
          className="button ghost"
          type="button"
          onClick={() => open("count")}
          title="Faça uma conferência física completa do saldo de um produto"
        >
          <ClipboardCheck size={16} />
          Contagem física
        </button>

        <button
          className="button ghost"
          type="button"
          onClick={() => open("adjust")}
          title="Corrija uma diferença conhecida sem iniciar uma contagem completa"
        >
          <SlidersHorizontal size={16} />
          Correção rápida
        </button>

        <button
          className="button gold"
          type="button"
          onClick={() => open("transfer")}
        >
          <ArrowRightLeft size={16} />
          Transferir
        </button>
      </div>

      {mode && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <form className="inventory-modal" onSubmit={submit}>
            <div className="inventory-modal-head">
              <div>
                <span className="eyebrow">Estoque</span>
                <h2>
                  {mode === "count"
                    ? "Contagem física de estoque"
                    : mode === "adjust"
                      ? "Correção rápida de saldo"
                      : "Transferência"}
                </h2>
                <p>
                  {mode === "count"
                    ? "Use quando você contou fisicamente o que existe no local. O sistema registra a diferença entre o saldo anterior e a contagem real."
                    : mode === "adjust"
                      ? "Use para uma diferença já conhecida, como avaria, perda ou unidade encontrada. Informe + para entrada e - para saída."
                      : "Move apenas unidades disponíveis do sabor selecionado, sem mexer nas reservas."}
                </p>
              </div>

              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={close}
              >
                <X size={18} />
              </button>
            </div>

            <div className="inventory-modal-body">
              <label className="field">
                <span>Produto</span>
                <select
                  className="select"
                  required
                  value={productId}
                  onChange={(event) => {
                    setProductId(event.target.value);
                    setFlavorId("");
                  }}
                  disabled={Boolean(initialProductId)}
                >
                  <option value="">Selecione o produto</option>
                  {products.map((product) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.product_name}
                    </option>
                  ))}
                </select>
              </label>

              {productFlavors.length > 0 && (
                <label className="field">
                  <span>Sabor</span>
                  <select
                    className="select"
                    required
                    value={flavorId}
                    onChange={(event) => setFlavorId(event.target.value)}
                  >
                    <option value="">Selecione o sabor</option>
                    {productFlavors.map((flavor) => {
                      const row = flavorInventory.find(
                        (item) =>
                          item.flavorId === flavor.id &&
                          item.locationId === locationId,
                      );

                      return (
                        <option key={flavor.id} value={flavor.id}>
                          {flavor.name} · disp. {row?.available ?? 0}
                        </option>
                      );
                    })}
                  </select>
                </label>
              )}

              <label className="field">
                <span>{mode === "transfer" ? "Estoque de origem" : "Local"}</span>
                <select
                  className="select"
                  required
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                  disabled={Boolean(initialLocationId) && mode === "count"}
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.code} · {location.name}
                    </option>
                  ))}
                </select>
              </label>

              {mode === "transfer" && (
                <label className="field">
                  <span>Estoque de destino</span>
                  <select
                    className="select"
                    required
                    value={destinationId}
                    onChange={(event) => setDestinationId(event.target.value)}
                  >
                    <option value="">Selecione o destino</option>
                    {locations
                      .filter((location) => location.id !== locationId)
                      .map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.code} · {location.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}

              <label className="field">
                <span>
                  {mode === "count"
                    ? "Quantidade realmente contada"
                    : mode === "adjust"
                      ? "Variação conhecida do saldo"
                      : "Quantidade a transferir"}
                </span>
                <input
                  className="input"
                  type="number"
                  required
                  min={mode === "count" ? 0 : mode === "transfer" ? 1 : undefined}
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder={mode === "adjust" ? "Ex.: 3 ou -2" : "0"}
                />
              </label>

              <label className="field">
                <span>Data da operação</span>
                <input
                  className="input"
                  type="date"
                  required
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>

              <label className="field field-span-two">
                <span>Observação</span>
                <textarea
                  className="textarea"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Motivo, conferência, responsável..."
                />
              </label>

              {selectedProduct && (
                <div className="inventory-current-strip">
                  <span>
                    {selectedProduct.product_name}
                    {selectedFlavor ? ` · ${selectedFlavor.name}` : ""}
                  </span>
                  <span>
                    Físico{" "}
                    <strong>
                      {selectedFlavorInventory?.physical ??
                        current?.physical_quantity ??
                        0}
                    </strong>
                  </span>
                  <span>
                    Reservado{" "}
                    <strong>
                      {selectedFlavorInventory?.reserved ??
                        current?.reserved_quantity ??
                        0}
                    </strong>
                  </span>
                  <span>
                    Disponível{" "}
                    <strong>
                      {selectedFlavorInventory?.available ??
                        current?.available_quantity ??
                        0}
                    </strong>
                  </span>
                  {selectedFlavorInventory && (
                    <span>
                      A caminho <strong>{selectedFlavorInventory.incoming}</strong>
                    </span>
                  )}
                </div>
              )}

              {message && <p className="form-message">{message}</p>}
            </div>

            <div className="inventory-modal-actions">
              <button className="button ghost" type="button" onClick={close}>
                Cancelar
              </button>

              <button className="button gold" type="submit" disabled={loading}>
                {loading ? (
                  <LoaderCircle className="spin" size={16} />
                ) : mode === "transfer" ? (
                  <ArrowRightLeft size={16} />
                ) : mode === "count" ? (
                  <ClipboardCheck size={16} />
                ) : (
                  <PackagePlus size={16} />
                )}
                {loading ? "Salvando" : "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
