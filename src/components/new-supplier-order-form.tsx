"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Building2,
  CalendarDays,
  LoaderCircle,
  Plus,
  Save,
  ShoppingCart,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LocationOption, PurchaseProductOption, SupplierOption } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type OrderItemDraft = {
  key: string;
  productId: string;
  flavorId: string;
  quantity: string;
  unitCost: string;
  notes: string;
};

type FlavorOption = {
  id: string;
  productId: string;
  name: string;
};

type FlavorStock = {
  flavorId: string;
  locationId: string;
  incoming: number;
  available: number;
};

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function emptyItem(): OrderItemDraft {
  return { key: crypto.randomUUID(), productId: "", flavorId: "", quantity: "1", unitCost: "", notes: "" };
}

export function NewSupplierOrderForm({
  initialSuppliers,
  products,
  locations,
}: {
  initialSuppliers: SupplierOption[];
  products: PurchaseProductOption[];
  locations: LocationOption[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"unit" | "batch" | null>(null);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierId, setSupplierId] = useState("");
  const [orderedOn, setOrderedOn] = useState(todayBrazil());
  const [expectedOn, setExpectedOn] = useState("");
  const [locationId, setLocationId] = useState(locations.find((location) => location.code === "CS")?.id ?? locations[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItemDraft[]>([emptyItem()]);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [supplierNotes, setSupplierNotes] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [flavors, setFlavors] = useState<FlavorOption[]>([]);
  const [flavorStock, setFlavorStock] = useState<FlavorStock[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadFlavors() {
      const supabase = createClient();
      const [flavorResult, stockResult] = await Promise.all([
        supabase.from("product_flavors").select("id,product_id,name").eq("active", true).order("display_order").order("name"),
        supabase.from("product_flavor_inventory_overview").select("flavor_id,location_id,available_quantity,incoming_quantity"),
      ]);

      if (cancelled) return;
      const error = flavorResult.error || stockResult.error;
      if (error) {
        setMessage(error.message);
        return;
      }

      setFlavors((flavorResult.data ?? []).map((row) => ({
        id: String(row.id),
        productId: String(row.product_id),
        name: String(row.name ?? ""),
      })));

      setFlavorStock((stockResult.data ?? []).map((row) => ({
        flavorId: String(row.flavor_id),
        locationId: String(row.location_id),
        available: Number(row.available_quantity ?? 0),
        incoming: Number(row.incoming_quantity ?? 0),
      })));
    }

    void loadFlavors();
    return () => { cancelled = true; };
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0),
    [items],
  );

  function flavorsFor(productId: string) {
    return flavors.filter((flavor) => flavor.productId === productId);
  }

  function flavorStockFor(flavorId: string) {
    return flavorStock.find((row) => row.flavorId === flavorId && row.locationId === locationId) ?? null;
  }

  function chooseMode(nextMode: "unit" | "batch") {
    setMode(nextMode);
    setItems([emptyItem()]);
    setMessage("");
  }

  function updateItem(key: string, patch: Partial<OrderItemDraft>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function selectProduct(key: string, productId: string) {
    const product = products.find((row) => row.id === productId);
    updateItem(key, {
      productId,
      flavorId: "",
      unitCost: product ? String(product.cost_price.toFixed(2)) : "",
    });
  }

  function addItem() {
    setItems((current) => [...current, emptyItem()]);
  }

  function removeItem(key: string) {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.key !== key)));
  }

  async function createSupplier() {
    setMessage("");
    if (!supplierName.trim()) {
      setMessage("Informe o nome do fornecedor.");
      return;
    }

    setSavingSupplier(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_supplier", {
        p_name: supplierName.trim(),
        p_notes: supplierNotes.trim() || null,
      });
      if (error) throw error;

      const id = String(data);
      const supplier = { id, name: supplierName.trim(), notes: supplierNotes.trim() || null };
      setSuppliers((current) => [...current.filter((row) => row.id !== id), supplier].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setSupplierId(id);
      setSupplierName("");
      setSupplierNotes("");
      setShowNewSupplier(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível cadastrar o fornecedor.");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!mode) return;

    if (!supplierId || !locationId) {
      setMessage("Selecione o fornecedor e o estoque de destino.");
      return;
    }

    if (items.some((item) => !item.productId || Number(item.quantity) <= 0 || Number(item.unitCost) < 0 || item.unitCost === "")) {
      setMessage("Preencha produto, quantidade e custo de todos os itens.");
      return;
    }

    for (const item of items) {
      const productFlavors = flavorsFor(item.productId);
      if (productFlavors.length > 0 && !item.flavorId) {
        const product = products.find((row) => row.id === item.productId);
        setMessage(`Selecione o sabor de ${product?.name ?? "um dos produtos"}.`);
        return;
      }
    }

    const compositeKeys = items.map((item) => `${item.productId}:${item.flavorId || "sem-sabor"}`);
    if (new Set(compositeKeys).size !== compositeKeys.length) {
      setMessage("O mesmo produto e sabor não podem ser adicionados duas vezes no mesmo pedido.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_purchase_order", {
        p_supplier_id: supplierId,
        p_ordered_on: orderedOn,
        p_destination_location_id: locationId,
        p_items: items.map((item) => ({
          product_id: item.productId,
          flavor_id: item.flavorId || null,
          quantity: Number(item.quantity),
          unit_cost: Number(item.unitCost),
          notes: item.notes.trim() || null,
        })),
        p_notes: notes.trim() || null,
      });
      if (error) throw error;

      const orderId = String(data);
      if (expectedOn) {
        const { error: scheduleError } = await supabase.rpc("reschedule_operational_event", {
          p_source_type: "purchase_order",
          p_source_id: orderId,
          p_due_at: new Date(`${expectedOn}T12:00:00-03:00`).toISOString(),
        });
        if (scheduleError) throw scheduleError;
      }

      router.push(`/pedidos-fornecedor/${orderId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o pedido.");
    } finally {
      setLoading(false);
    }
  }

  if (!mode) {
    return (
      <section className="supplier-mode-grid">
        <button className="supplier-mode-card" type="button" onClick={() => chooseMode("unit")}>
          <ShoppingCart size={28} />
          <div><strong>Pedido unitário</strong><span>Um produto, um sabor quando necessário, uma quantidade e um custo.</span></div>
        </button>
        <button className="supplier-mode-card" type="button" onClick={() => chooseMode("batch")}>
          <Boxes size={28} />
          <div><strong>Pedido em lote</strong><span>Vários produtos e sabores comprados do mesmo fornecedor.</span></div>
        </button>
      </section>
    );
  }

  return (
    <form className="supplier-order-layout" onSubmit={submit}>
      <div className="supplier-order-main">
        <article className="panel">
          <div className="panel-head">
            <div><h2>{mode === "unit" ? "Pedido unitário" : "Pedido em lote"}</h2><p>O recebimento poderá ser feito item por item, por sabor e até parcialmente.</p></div>
            <button className="button ghost compact-button" type="button" onClick={() => setMode(null)}><X size={16} />Trocar tipo</button>
          </div>
          <div className="panel-body form-grid-two">
            <label className="field">
              <span>Fornecedor ou marketplace</span>
              <select className="select" required value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                <option value="">Selecione o fornecedor</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
              <button className="inline-action" type="button" onClick={() => setShowNewSupplier((value) => !value)}><Plus size={14} />Adicionar novo fornecedor</button>
            </label>
            <label className="field"><span>Data do pedido</span><input className="input" type="date" required value={orderedOn} onChange={(event) => setOrderedOn(event.target.value)} /></label>
            <label className="field"><span>Previsão de chegada</span><input className="input" type="date" value={expectedOn} onChange={(event) => setExpectedOn(event.target.value)} /><small>Quando preenchida, aparece automaticamente na Agenda.</small></label>
            <label className="field field-span-two"><span>Estoque de destino</span><select className="select" required value={locationId} onChange={(event) => setLocationId(event.target.value)}>{locations.map((location) => <option key={location.id} value={location.id}>{location.code} · {location.name}</option>)}</select><small>Quando cada item chegar, a entrada será feita neste estoque e no sabor selecionado.</small></label>
          </div>

          {showNewSupplier && (
            <div className="new-supplier-inline">
              <label className="field"><span>Nome do novo fornecedor</span><input className="input" value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Ex.: Dynamo Labz" /></label>
              <label className="field"><span>Observação</span><input className="input" value={supplierNotes} onChange={(event) => setSupplierNotes(event.target.value)} placeholder="Contato, condição ou canal de compra" /></label>
              <button className="button gold" type="button" disabled={savingSupplier} onClick={createSupplier}>{savingSupplier ? <LoaderCircle className="spin" size={16} /> : <Building2 size={16} />}Salvar fornecedor</button>
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div><h2>Produtos do pedido</h2><p>Produtos com controle por sabor exigem que o sabor seja informado antes de salvar.</p></div>
            {mode === "batch" && <button className="button ghost compact-button" type="button" onClick={addItem}><Plus size={16} />Adicionar produto</button>}
          </div>

          <div className="panel-body supplier-order-items">
            {items.map((item, index) => {
              const product = products.find((row) => row.id === item.productId);
              const productFlavors = flavorsFor(item.productId);
              const selectedFlavor = productFlavors.find((flavor) => flavor.id === item.flavorId) ?? null;
              const selectedFlavorStock = item.flavorId ? flavorStockFor(item.flavorId) : null;

              return (
                <div className="supplier-order-item" key={item.key}>
                  <div className="sale-form-item-head"><strong>Item {index + 1}</strong>{items.length > 1 && <button className="icon-button" type="button" aria-label="Remover item" onClick={() => removeItem(item.key)}><Trash2 size={16} /></button>}</div>
                  <div className="supplier-order-item-grid">
                    <label className="field supplier-product-field"><span>Produto</span><select className="select" required value={item.productId} onChange={(event) => selectProduct(item.key, event.target.value)}><option value="">Selecione o produto</option>{products.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>

                    {productFlavors.length > 0 && (
                      <label className="field">
                        <span>Sabor</span>
                        <select className="select" required value={item.flavorId} onChange={(event) => updateItem(item.key, { flavorId: event.target.value })}>
                          <option value="">Selecione</option>
                          {productFlavors.map((flavor) => {
                            const current = flavorStock.find((row) => row.flavorId === flavor.id && row.locationId === locationId);
                            return <option key={flavor.id} value={flavor.id}>{flavor.name} · a caminho {current?.incoming ?? 0}</option>;
                          })}
                        </select>
                      </label>
                    )}

                    <label className="field"><span>Quantidade</span><input className="input" type="number" min="1" step="1" required value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: event.target.value })} /></label>
                    <label className="field"><span>Custo unitário</span><input className="input" type="number" min="0" step="0.01" required value={item.unitCost} onChange={(event) => updateItem(item.key, { unitCost: event.target.value })} /></label>
                    <label className="field supplier-item-notes"><span>Observação do item</span><input className="input" value={item.notes} onChange={(event) => updateItem(item.key, { notes: event.target.value })} placeholder="Lote, condição, observação..." /></label>
                  </div>

                  {product && <div className="sale-stock-strip">
                    {selectedFlavor && <span>Sabor <strong>{selectedFlavor.name}</strong></span>}
                    <span>Custo atual <strong>{formatCurrency(product.cost_price)}</strong></span>
                    <span>Preço de venda <strong>{formatCurrency(product.sale_price)}</strong></span>
                    <span>Já a caminho <strong>{selectedFlavorStock?.incoming ?? product.incoming_quantity}</strong></span>
                    {selectedFlavorStock && <span>Disponível agora <strong>{selectedFlavorStock.available}</strong></span>}
                    <span>Total deste item <strong>{formatCurrency((Number(item.quantity) || 0) * (Number(item.unitCost) || 0))}</strong></span>
                  </div>}
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Observações gerais</h2><p>Frete, prazo, número do pedido ou condição negociada.</p></div></div>
          <div className="panel-body"><label className="field"><span>Observações</span><textarea className="textarea" rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} /></label></div>
        </article>
      </div>

      <aside className="supplier-order-side">
        <article className="panel supplier-order-summary-card">
          <Truck size={24} />
          <div><span>Resumo do pedido</span><strong>{formatCurrency(total)}</strong><small>{items.length} {items.length === 1 ? "item" : "itens"}</small></div>
        </article>
        <article className="panel supplier-order-guide">
          <CalendarDays size={20} />
          <div><strong>Recebimento flexível</strong><p>Cada sabor é recebido no estoque correto e pode chegar em dias ou quantidades diferentes.</p></div>
        </article>
        <div className="sale-form-actions"><Link className="button ghost" href="/pedidos-fornecedor">Cancelar</Link><button className="button gold" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{loading ? "Salvando" : "Criar pedido"}</button></div>
        {message && <p className="form-message standalone-message">{message}</p>}
      </aside>
    </form>
  );
}
