"use client";

import { ArrowRightLeft, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { InventoryLocationRow, InventoryOverviewRow, LocationOption } from "@/lib/types";

type Item = { productId: string; flavorId: string; quantity: string };
type Flavor = { id: string; productId: string; name: string };
const blank = (): Item => ({ productId: "", flavorId: "", quantity: "1" });

export function BatchInventoryTransfer({ products, locations, locationRows }: { products: InventoryOverviewRow[]; locations: LocationOption[]; locationRows: InventoryLocationRow[] }) {
  const router = useRouter();
  const initial = locations.find((row) => row.code === "CS")?.id ?? locations[0]?.id ?? "";
  const [source, setSource] = useState(initial);
  const [destination, setDestination] = useState(locations.find((row) => row.id !== initial)?.id ?? "");
  const [items, setItems] = useState<Item[]>([blank()]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { void createClient().from("product_flavors").select("id,product_id,name").eq("active", true).order("name").then(({ data }) => setFlavors((data ?? []).map((row) => ({ id: String(row.id), productId: String(row.product_id), name: String(row.name) })))); }, []);
  const productMap = useMemo(() => new Map(products.map((row) => [row.product_id, row])), [products]);
  const sourceAvailability = useMemo(() => new Map(locationRows.filter((row) => row.location_id === source).map((row) => [row.product_id, row.available_quantity])), [locationRows, source]);
  const availableProducts = useMemo(() => products.filter((row) => (sourceAvailability.get(row.product_id) ?? 0) > 0), [products, sourceAvailability]);
  const change = (index: number, value: Partial<Item>) => setItems((current) => current.map((row, position) => position === index ? { ...row, ...value } : row));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      if (!source || !destination || source === destination) throw new Error("Escolha estoques diferentes para origem e destino.");
      for (const item of items) {
        if (!item.productId || Number(item.quantity) <= 0) throw new Error("Preencha produto e quantidade em todas as linhas.");
        if (Number(item.quantity) > (sourceAvailability.get(item.productId) ?? 0)) throw new Error(`A origem não possui saldo suficiente de ${productMap.get(item.productId)?.product_name ?? "um produto"}.`);
        if (flavors.some((row) => row.productId === item.productId) && !item.flavorId) throw new Error(`Escolha o sabor de ${productMap.get(item.productId)?.product_name ?? "cada produto"}.`);
      }
      const { error } = await createClient().rpc("transfer_inventory_batch_v1", { p_source_location_id: source, p_destination_location_id: destination, p_items: items.map((item) => ({ product_id: item.productId, flavor_id: item.flavorId || null, quantity: Number(item.quantity) })), p_notes: notes.trim() || null });
      if (error) throw error;
      setMessage(`${items.length} produto(s) transferido(s) com sucesso.`); setItems([blank()]); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível transferir os produtos."); }
    finally { setLoading(false); }
  };
  return <form className="batch-transfer panel" onSubmit={submit}>
    <header><ArrowRightLeft/><div><span>COMPANY · PRODUTOS</span><h1>Transferência de estoque</h1><p>Transfira vários produtos de uma vez. Se uma linha falhar, nenhuma movimentação é concluída.</p></div></header>
    <div className="batch-transfer-locations"><label><span>Origem</span><select value={source} onChange={(event) => setSource(event.target.value)}>{locations.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></label><label><span>Destino</span><select value={destination} onChange={(event) => setDestination(event.target.value)}>{locations.filter((row) => row.id !== source).map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></label></div>
    <div className="batch-transfer-items">{items.map((item, index) => { const productFlavors = flavors.filter((row) => row.productId === item.productId); return <article key={index}><strong>Produto {index + 1}</strong><select required value={item.productId} onChange={(event) => change(index, { productId: event.target.value, flavorId: "" })}><option value="">Selecione o produto disponível</option>{availableProducts.map((row) => <option key={row.product_id} value={row.product_id}>{row.product_name} · {sourceAvailability.get(row.product_id)} disp.</option>)}</select>{productFlavors.length ? <select required value={item.flavorId} onChange={(event) => change(index, { flavorId: event.target.value })}><option value="">Selecione o sabor</option>{productFlavors.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select> : <span>Sem controle por sabor</span>}<input required type="number" min="1" max={item.productId ? sourceAvailability.get(item.productId) : undefined} value={item.quantity} onChange={(event) => change(index, { quantity: event.target.value })}/><button type="button" onClick={() => setItems((current) => current.filter((_, position) => position !== index))} disabled={items.length === 1} aria-label="Remover produto"><Trash2 size={17}/></button></article>; })}</div>
    <button className="button ghost" type="button" onClick={() => setItems((current) => [...current, blank()])}><Plus size={16}/>Adicionar outro produto</button>
    <label className="field"><span>Observações</span><textarea className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3}/></label>
    {message ? <p className="form-help">{message}</p> : null}<button className="button company-blue" disabled={loading}>{loading ? <LoaderCircle className="spin"/> : <ArrowRightLeft/>}Transferir produtos</button>
  </form>;
}
