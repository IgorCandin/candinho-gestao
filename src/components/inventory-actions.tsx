"use client";

import { ArrowRightLeft, ClipboardCheck, LoaderCircle, PackagePlus, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { InventoryLocationRow, InventoryOverviewRow, LocationOption } from "@/lib/types";

type ActionMode = "count" | "adjust" | "transfer" | null;

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function InventoryActions({ products, locations, locationRows, initialProductId = "" }: {
  products: InventoryOverviewRow[];
  locations: LocationOption[];
  locationRows: InventoryLocationRow[];
  initialProductId?: string;
}) {
  const router = useRouter();
  const defaultLocation = locations.find((location) => location.code === "CS")?.id ?? locations[0]?.id ?? "";
  const [mode, setMode] = useState<ActionMode>(null);
  const [productId, setProductId] = useState(initialProductId);
  const [locationId, setLocationId] = useState(defaultLocation);
  const [destinationId, setDestinationId] = useState(locations.find((location) => location.id !== defaultLocation)?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayBrazil());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const current = useMemo(() => locationRows.find((row) => row.product_id === productId && row.location_id === locationId) ?? null, [locationRows, productId, locationId]);
  const selectedProduct = products.find((product) => product.product_id === productId);

  function open(next: Exclude<ActionMode, null>) {
    setMode(next); setMessage(""); setQuantity(""); setNotes(""); setDate(todayBrazil());
    if (initialProductId) setProductId(initialProductId);
  }
  function close() { if (!loading) setMode(null); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      if (!productId || !locationId) throw new Error("Selecione o produto e o local.");
      const supabase = createClient();
      if (mode === "count") {
        const { error } = await supabase.rpc("register_inventory_count", { p_product_id: productId, p_location_id: locationId, p_counted_quantity: Number(quantity), p_counted_on: date, p_notes: notes.trim() || null });
        if (error) throw error;
      }
      if (mode === "adjust") {
        const { error } = await supabase.rpc("register_inventory_adjustment", { p_product_id: productId, p_location_id: locationId, p_quantity_delta: Number(quantity), p_occurred_on: date, p_notes: notes.trim() || null });
        if (error) throw error;
      }
      if (mode === "transfer") {
        if (!destinationId) throw new Error("Selecione o estoque de destino.");
        const { error } = await supabase.rpc("transfer_inventory", { p_product_id: productId, p_source_location_id: locationId, p_destination_location_id: destinationId, p_quantity: Number(quantity), p_transferred_on: date, p_notes: notes.trim() || null });
        if (error) throw error;
      }
      setMode(null); router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o estoque.");
    } finally { setLoading(false); }
  }

  return <>
    <div className="inventory-action-buttons">
      <button className="button ghost" type="button" onClick={() => open("count")}><ClipboardCheck size={16}/>Contar estoque</button>
      <button className="button ghost" type="button" onClick={() => open("adjust")}><SlidersHorizontal size={16}/>Ajustar saldo</button>
      <button className="button gold" type="button" onClick={() => open("transfer")}><ArrowRightLeft size={16}/>Transferir</button>
    </div>
    {mode && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <form className="inventory-modal" onSubmit={submit}>
        <div className="inventory-modal-head"><div><span className="eyebrow">Estoque</span><h2>{mode === "count" ? "Contagem física" : mode === "adjust" ? "Ajuste manual" : "Transferência"}</h2><p>{mode === "count" ? "Informe a quantidade realmente contada no local." : mode === "adjust" ? "Use valor positivo para entrada e negativo para saída." : "Move apenas unidades disponíveis, sem mexer nas reservas."}</p></div><button className="icon-button" type="button" aria-label="Fechar" onClick={close}><X size={18}/></button></div>
        <div className="inventory-modal-body">
          <label className="field"><span>Produto</span><select className="select" required value={productId} onChange={(event) => setProductId(event.target.value)} disabled={Boolean(initialProductId)}><option value="">Selecione o produto</option>{products.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name}</option>)}</select></label>
          <label className="field"><span>{mode === "transfer" ? "Estoque de origem" : "Local"}</span><select className="select" required value={locationId} onChange={(event) => setLocationId(event.target.value)}>{locations.map((location) => <option key={location.id} value={location.id}>{location.code} · {location.name}</option>)}</select></label>
          {mode === "transfer" && <label className="field"><span>Estoque de destino</span><select className="select" required value={destinationId} onChange={(event) => setDestinationId(event.target.value)}><option value="">Selecione o destino</option>{locations.filter((location) => location.id !== locationId).map((location) => <option key={location.id} value={location.id}>{location.code} · {location.name}</option>)}</select></label>}
          <label className="field"><span>{mode === "count" ? "Quantidade contada" : mode === "adjust" ? "Variação do saldo" : "Quantidade a transferir"}</span><input className="input" type="number" required min={mode === "count" ? 0 : mode === "transfer" ? 1 : undefined} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={mode === "adjust" ? "Ex.: 3 ou -2" : "0"}/></label>
          <label className="field"><span>Data da operação</span><input className="input" type="date" required value={date} onChange={(event) => setDate(event.target.value)}/></label>
          <label className="field field-span-two"><span>Observação</span><textarea className="textarea" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Motivo, conferência, responsável..."/></label>
          {selectedProduct && current && <div className="inventory-current-strip"><span>{selectedProduct.product_name}</span><span>Físico <strong>{current.physical_quantity}</strong></span><span>Reservado <strong>{current.reserved_quantity}</strong></span><span>Disponível <strong>{current.available_quantity}</strong></span></div>}
          {message && <p className="form-message">{message}</p>}
        </div>
        <div className="inventory-modal-actions"><button className="button ghost" type="button" onClick={close}>Cancelar</button><button className="button gold" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16}/> : mode === "transfer" ? <ArrowRightLeft size={16}/> : mode === "count" ? <ClipboardCheck size={16}/> : <PackagePlus size={16}/>} {loading ? "Salvando" : "Confirmar"}</button></div>
      </form>
    </div>}
  </>;
}
