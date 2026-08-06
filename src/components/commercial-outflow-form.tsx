"use client";

import { LoaderCircle, PackageMinus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

type Product = {
  id: string;
  name: string;
  cost_price: number | string;
  sale_price: number | string;
  flavor_tracking_enabled: boolean;
};

type Location = { id: string; code: string; name: string };
type Flavor = { id: string; product_id: string; name: string };
type Partner = { id: string; name: string; partner_type: string | null };
type StockRow = { product_id: string; location_id: string; available_quantity: number };
type FlavorStockRow = { flavor_id: string; location_id: string; quantity: number };

type DraftItem = {
  key: string;
  product_id: string;
  location_id: string;
  flavor_id: string;
  quantity: number;
};

const reasons = [
  ["partnership_activation", "Ativação de parceria"],
  ["raffle_prize", "Premiação / sorteio"],
  ["sample", "Amostra"],
  ["marketing_action", "Ação de marketing"],
  ["influencer", "Influenciador"],
  ["donation", "Doação"],
  ["internal_use", "Uso interno"],
  ["loss_damage", "Perda / avaria"],
  ["other", "Outro"],
] as const;

function localDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function key() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function CommercialOutflowForm({
  products,
  locations,
  flavors,
  partners,
  stockRows,
  flavorStockRows,
}: {
  products: Product[];
  locations: Location[];
  flavors: Flavor[];
  partners: Partner[];
  stockRows: StockRow[];
  flavorStockRows: FlavorStockRow[];
}) {
  const router = useRouter();
  const [reason, setReason] = useState("partnership_activation");
  const [destinationMode, setDestinationMode] = useState<"partner" | "free">("partner");
  const [partnerId, setPartnerId] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [occurredOn, setOccurredOn] = useState(localDate());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([
    {
      key: key(),
      product_id: products[0]?.id ?? "",
      location_id: locations[0]?.id ?? "",
      flavor_id: "",
      quantity: 1,
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  function available(item: DraftItem) {
    const product = productMap.get(item.product_id);
    if (!product || !item.location_id) return 0;

    if (product.flavor_tracking_enabled && item.flavor_id) {
      return (
        flavorStockRows.find(
          (row) =>
            row.flavor_id === item.flavor_id &&
            row.location_id === item.location_id,
        )?.quantity ?? 0
      );
    }

    return (
      stockRows.find(
        (row) =>
          row.product_id === item.product_id &&
          row.location_id === item.location_id,
      )?.available_quantity ?? 0
    );
  }

  const estimatedCost = items.reduce((total, item) => {
    const product = productMap.get(item.product_id);
    return total + Number(product?.cost_price ?? 0) * Math.max(item.quantity, 0);
  }, 0);

  function updateItem(itemKey: string, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) =>
        item.key === itemKey ? { ...item, ...patch } : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        key: key(),
        product_id: products[0]?.id ?? "",
        location_id: locations[0]?.id ?? "",
        flavor_id: "",
        quantity: 1,
      },
    ]);
  }

  async function submit() {
    if (saving) return;
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/commercial-outflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason_code: reason,
          partner_id: destinationMode === "partner" ? partnerId || null : null,
          destination_name:
            destinationMode === "free" ? destinationName.trim() : null,
          occurred_on: occurredOn,
          notes,
          items: items.map((item) => ({
            product_id: item.product_id,
            location_id: item.location_id,
            flavor_id: item.flavor_id || null,
            quantity: item.quantity,
          })),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível registrar.");

      setMessage("Saída registrada e estoque baixado.");
      setNotes("");
      setDestinationName("");
      setItems([
        {
          key: key(),
          product_id: products[0]?.id ?? "",
          location_id: locations[0]?.id ?? "",
          flavor_id: "",
          quantity: 1,
        },
      ]);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="panel commercial-outflow-form-v45">
      <div className="panel-head">
        <div>
          <h2><PackageMinus size={18} /> Nova saída não-venda</h2>
          <p>Baixa estoque e custo comercial sem criar venda, cliente, comissão ou recompra.</p>
        </div>
        <strong>{formatCurrency(estimatedCost)}</strong>
      </div>

      <div className="panel-body commercial-outflow-fields-v45">
        <label className="field">
          <span>Motivo</span>
          <select className="select" value={reason} onChange={(event) => setReason(event.target.value)}>
            {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Data</span>
          <input className="input" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} />
        </label>

        <div className="field field-span-two">
          <span>Destino</span>
          <div className="commercial-destination-toggle-v45">
            <button type="button" className={destinationMode === "partner" ? "active" : ""} onClick={() => setDestinationMode("partner")}>Parceiro cadastrado</button>
            <button type="button" className={destinationMode === "free" ? "active" : ""} onClick={() => setDestinationMode("free")}>Outro destino</button>
          </div>
          {destinationMode === "partner" ? (
            <select className="select" value={partnerId} onChange={(event) => setPartnerId(event.target.value)}>
              <option value="">Selecione a parceria</option>
              {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
            </select>
          ) : (
            <input className="input" value={destinationName} onChange={(event) => setDestinationName(event.target.value)} placeholder="Ex.: TopTraining" />
          )}
        </div>

        <label className="field field-span-two">
          <span>Observação</span>
          <textarea className="textarea" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: 3 creatinas entregues antes da parceria para sorteio entre alunos." />
        </label>
      </div>

      <div className="commercial-outflow-items-v45">
        {items.map((item, index) => {
          const product = productMap.get(item.product_id);
          const productFlavors = flavors.filter((flavor) => flavor.product_id === item.product_id);
          const stock = available(item);

          return (
            <div className="commercial-outflow-item-v45" key={item.key}>
              <span className="commercial-outflow-item-number-v45">{index + 1}</span>
              <select
                className="select"
                value={item.product_id}
                onChange={(event) =>
                  updateItem(item.key, {
                    product_id: event.target.value,
                    flavor_id: "",
                  })
                }
              >
                {products.map((option) => <option value={option.id} key={option.id}>{option.name}</option>)}
              </select>

              <select className="select" value={item.location_id} onChange={(event) => updateItem(item.key, { location_id: event.target.value })}>
                {locations.map((location) => <option value={location.id} key={location.id}>{location.code} · {location.name}</option>)}
              </select>

              {product?.flavor_tracking_enabled && (
                <select className="select" value={item.flavor_id} onChange={(event) => updateItem(item.key, { flavor_id: event.target.value })}>
                  <option value="">Selecione o sabor</option>
                  {productFlavors.map((flavor) => <option value={flavor.id} key={flavor.id}>{flavor.name}</option>)}
                </select>
              )}

              <label className="commercial-outflow-qty-v45">
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={999}
                  value={item.quantity}
                  onChange={(event) => updateItem(item.key, { quantity: Math.max(1, Number(event.target.value) || 1) })}
                />
                <small>Disponível: {stock}</small>
              </label>

              {items.length > 1 && (
                <button className="icon-button" type="button" aria-label="Remover item" onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}

        <button className="button ghost compact-button commercial-add-item-v45" type="button" onClick={addItem}>
          <Plus size={14} /> Adicionar produto
        </button>
      </div>

      <div className="commercial-outflow-submit-v45">
        <span>
          <strong>Receita: R$ 0,00</strong>
          <small>Custo estimado da ação: {formatCurrency(estimatedCost)}</small>
        </span>
        <button
          className="button gold"
          type="button"
          disabled={
            saving ||
            items.some((item) => !item.product_id || !item.location_id || item.quantity <= 0) ||
            (destinationMode === "partner" ? !partnerId : !destinationName.trim())
          }
          onClick={() => void submit()}
        >
          {saving ? <LoaderCircle className="spin" size={15} /> : <PackageMinus size={15} />}
          {saving ? "Registrando..." : "Registrar saída"}
        </button>
      </div>

      {message && <p className="form-message">{message}</p>}
    </article>
  );
}

export function CommercialOutflowCancelButton({
  id,
}: {
  id: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    if (loading) return;
    const reason = window.prompt("Motivo do cancelamento/estorno:");
    if (reason === null) return;

    setLoading(true);
    try {
      const response = await fetch("/api/commercial-outflows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reason }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível estornar.");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível estornar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="button ghost compact-button" type="button" disabled={loading} onClick={() => void cancel()}>
      {loading ? <LoaderCircle className="spin" size={13} /> : <RotateCcw size={13} />}
      Estornar
    </button>
  );
}
