"use client";

import { LoaderCircle, PackageMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Supplement = { id: string; name: string; flavorTracking: boolean };
type Location = { id: string; name: string; code: string };
type Flavor = { id: string; productId: string; name: string };
type Stock = { productId: string; locationId: string; quantity: number };
type FlavorStock = { flavorId: string; locationId: string; quantity: number };
type Fitness = { id: string; name: string; size: string; color: string; available: number };

export function CompanyStockExpenseWorkspace({ supplements, locations, flavors, stock, flavorStock, fitness }: { supplements: Supplement[]; locations: Location[]; flavors: Flavor[]; stock: Stock[]; flavorStock: FlavorStock[]; fitness: Fitness[] }) {
  const router = useRouter();
  const [operation, setOperation] = useState<"supplements" | "fitness">("supplements");
  const [productId, setProductId] = useState(supplements[0]?.id ?? "");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [flavorId, setFlavorId] = useState("");
  const [fitnessId, setFitnessId] = useState(fitness.find((item) => item.available > 0)?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const product = supplements.find((item) => item.id === productId);
  const productFlavors = useMemo(() => flavors.filter((item) => item.productId === productId), [flavors, productId]);
  const available = operation === "fitness" ? fitness.find((item) => item.id === fitnessId)?.available ?? 0 : product?.flavorTracking && flavorId ? flavorStock.find((item) => item.flavorId === flavorId && item.locationId === locationId)?.quantity ?? 0 : stock.find((item) => item.productId === productId && item.locationId === locationId)?.quantity ?? 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const units = Math.trunc(Number(quantity));
    if (!Number.isFinite(units) || units < 1) return setMessage("Informe uma quantidade válida.");
    if (units > available) return setMessage(`Saldo disponível: ${available}.`);
    if (operation === "supplements" && (!productId || !locationId || (product?.flavorTracking && !flavorId))) return setMessage("Selecione produto, estoque de origem e sabor quando necessário.");
    if (operation === "fitness" && !fitnessId) return setMessage("Selecione a peça.");
    setLoading(true);
    try {
      if (operation === "supplements") {
        const response = await fetch("/api/commercial-outflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason_code: "internal_use", destination_name: "Despesa / baixa Company", occurred_on: new Date().toISOString().slice(0, 10), notes: title.trim() || null, items: [{ product_id: productId, location_id: locationId, flavor_id: flavorId || null, quantity: units }] }) });
        const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || "Não foi possível baixar o produto.");
      } else {
        const { error } = await createClient().rpc("record_fitness_operational_outflow", { p_variant_id: fitnessId, p_quantity: units, p_reason: "internal_use", p_notes: title.trim() || null }); if (error) throw error;
      }
      setTitle(""); setQuantity("1"); setMessage("Baixa registrada no estoque. Nenhuma venda foi criada."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível registrar a baixa."); }
    finally { setLoading(false); }
  }
  return <main className="company-stock-expense"><header><span>COMPANY · ESTOQUE</span><h1>Despesa / baixa</h1><p>Retire produto ou peça do estoque sem criar uma venda.</p></header><div className="company-quote-operation-tabs"><button type="button" className={operation === "supplements" ? "active" : ""} onClick={() => setOperation("supplements")}>Suplementos</button><button type="button" className={operation === "fitness" ? "active" : ""} onClick={() => setOperation("fitness")}>Fitness</button></div><form className="panel" onSubmit={submit}><div className="panel-head"><div><h2>{operation === "supplements" ? "Baixa de Suplementos" : "Baixa de Fitness"}</h2><p>Escolha o item, informe a quantidade e, se quiser, um título para o histórico.</p></div><PackageMinus size={20}/></div><div className="panel-body form-grid-two">{operation === "supplements" ? <><label className="field"><span>Produto</span><select className="input" value={productId} onChange={(event) => { setProductId(event.target.value); setFlavorId(""); }}><option value="">Selecione</option>{supplements.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Estoque de origem</span><select className="input" value={locationId} onChange={(event) => setLocationId(event.target.value)}>{locations.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select></label>{product?.flavorTracking ? <label className="field"><span>Sabor</span><select className="input" value={flavorId} onChange={(event) => setFlavorId(event.target.value)}><option value="">Selecione</option>{productFlavors.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label> : null}</> : <label className="field field-span-two"><span>Peça / tamanho / cor</span><select className="input" value={fitnessId} onChange={(event) => setFitnessId(event.target.value)}><option value="">Selecione</option>{fitness.filter((item) => item.available > 0).map((item) => <option value={item.id} key={item.id}>{item.name} · {item.size} · {item.color} ({item.available} disponível)</option>)}</select></label>}<label className="field"><span>Quantidade</span><input className="input" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)}/><small>Disponível: {available}</small></label><label className="field"><span>Título opcional</span><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: avaria, consumo interno, amostra"/></label>{message ? <p className="form-error visible field-span-two">{message}</p> : null}<button className="button company-blue field-span-two" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16}/> : <PackageMinus size={16}/>}Confirmar baixa</button></div></form></main>;
}
