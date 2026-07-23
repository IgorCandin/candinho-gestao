"use client";

import { CheckCircle2, Gift, LoaderCircle, PackagePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateOnly } from "@/lib/format";
import type { PartnerOverview, PartnerSettlement } from "@/lib/types";

type ProductOption = { id: string; name: string; flavor_tracking_enabled: boolean };
type FlavorOption = { id: string; product_id: string; name: string };
type LocationOption = { id: string; code: string; name: string };

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
  const [open, setOpen] = useState(false);
  const [deliveredOn, setDeliveredOn] = useState(todayInSaoPaulo());
  const [units, setUnits] = useState("1");
  const [description, setDescription] = useState(partner.reward_description ?? "1 suplemento à escolha do parceiro");
  const [notes, setNotes] = useState("");
  const [productId, setProductId] = useState("");
  const [flavorId, setFlavorId] = useState("");
  const [locationId, setLocationId] = useState(partner.linked_location_id ?? "");
  const [productQuantity, setProductQuantity] = useState("1");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [flavors, setFlavors] = useState<FlavorOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rewardHistory = useMemo(() => settlements.filter((item) => item.reward_units > 0), [settlements]);
  const selectedProduct = products.find((item) => item.id === productId) ?? null;
  const productFlavors = flavors.filter((item) => item.product_id === productId);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      const supabase = createClient();
      const [productResult, flavorResult, locationResult] = await Promise.all([
        supabase.from("products").select("id,name,flavor_tracking_enabled").eq("active", true).order("name"),
        supabase.from("product_flavors").select("id,product_id,name").eq("active", true).order("display_order").order("name"),
        supabase.from("locations").select("id,code,name").eq("active", true).eq("tracks_inventory", true).order("code"),
      ]);
      if (cancelled) return;
      const error = productResult.error ?? flavorResult.error ?? locationResult.error;
      if (error) {
        setMessage(error.message);
        return;
      }
      setProducts((productResult.data ?? []).map((item) => ({
        id: String(item.id),
        name: String(item.name ?? ""),
        flavor_tracking_enabled: Boolean(item.flavor_tracking_enabled),
      })));
      setFlavors((flavorResult.data ?? []).map((item) => ({ id: String(item.id), product_id: String(item.product_id), name: String(item.name ?? "") })));
      setLocations((locationResult.data ?? []).map((item) => ({ id: String(item.id), code: String(item.code ?? ""), name: String(item.name ?? "") })));
    }
    void loadOptions();
    return () => { cancelled = true; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (productId && !locationId) throw new Error("Selecione de qual estoque o produto do brinde saiu.");
      if (selectedProduct?.flavor_tracking_enabled && !flavorId) throw new Error("Selecione o sabor do produto entregue.");

      const selectedFlavor = flavors.find((item) => item.id === flavorId);
      const actualReward = productId && selectedProduct
        ? `${Math.max(1, Number(productQuantity || 1))}× ${selectedProduct.name}${selectedFlavor ? ` · ${selectedFlavor.name}` : ""}`
        : description.trim();

      const { error } = await createClient().rpc("register_partner_reward_delivery", {
        p_partner_id: partner.id,
        p_delivered_on: deliveredOn,
        p_reward_units: Math.max(1, Number(units || 1)),
        p_reward_description: actualReward || null,
        p_notes: notes.trim() || null,
        p_product_id: productId || null,
        p_flavor_id: flavorId || null,
        p_location_id: productId ? locationId || null : null,
        p_product_quantity: productId ? Math.max(1, Number(productQuantity || 1)) : 1,
      });
      if (error) throw error;
      setMessage(productId
        ? "Recompensa entregue, produto baixado do estoque e novo ciclo iniciado a partir deste momento."
        : "Recompensa entregue e novo ciclo iniciado a partir deste momento.");
      setOpen(false);
      setNotes("");
      setProductId("");
      setFlavorId("");
      setProductQuantity("1");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar a recompensa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="panel partner-settlement-panel">
      <div className="panel-head">
        <div>
          <h2>Recompensas da parceria</h2>
          <p>Registre o brinde real, inclusive antecipadamente. Se escolher um produto, a saída do estoque acontece junto da confirmação.</p>
        </div>
        <button className="button gold compact-button" type="button" onClick={() => setOpen(!open)}>
          <Gift size={16} /> Entregar recompensa
        </button>
      </div>
      <div className="panel-body partner-settlement-body">
        <div className="partner-progress-large" style={{ marginBottom: 12 }}>
          <div><strong>{partner.progress_sales}</strong><span>de {partner.target_sales ?? 0} vendas no ciclo atual</span></div>
          <div><strong>{partner.reward_units_due}</strong><span>meta(s) já alcançada(s)</span></div>
        </div>

        {open && (
          <form className="crm-action-form" onSubmit={submit}>
            <div className="sale-action-form-head">
              <div>
                <strong>Registrar recompensa entregue</strong>
                <span>Você pode liberar o brinde antes da meta quando decidir.</span>
              </div>
              <button className="icon-button" type="button" onClick={() => setOpen(false)}><X size={17} /></button>
            </div>
            <div className="form-grid-two">
              <label className="field"><span>Data da entrega</span><input className="input" type="date" required value={deliveredOn} onChange={(e) => setDeliveredOn(e.target.value)} /></label>
              <label className="field"><span>Recompensas liberadas</span><input className="input" type="number" min="1" step="1" required value={units} onChange={(e) => setUnits(e.target.value)} /></label>

              <label className="field field-span-two">
                <span>Produto entregue (opcional)</span>
                <select className="select" value={productId} onChange={(e) => { setProductId(e.target.value); setFlavorId(""); }}>
                  <option value="">Somente registrar a recompensa, sem baixa de estoque</option>
                  {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>

              {productId && selectedProduct?.flavor_tracking_enabled && (
                <label className="field"><span>Sabor</span><select className="select" required value={flavorId} onChange={(e) => setFlavorId(e.target.value)}><option value="">Selecione</option>{productFlavors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              )}
              {productId && (
                <>
                  <label className="field"><span>Quantidade do produto</span><input className="input" type="number" min="1" step="1" required value={productQuantity} onChange={(e) => setProductQuantity(e.target.value)} /></label>
                  <label className="field field-span-two"><span>Origem do estoque</span><select className="select" required value={locationId} onChange={(e) => setLocationId(e.target.value)}><option value="">Selecione o estoque</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
                </>
              )}

              {!productId && <label className="field field-span-two"><span>Recompensa ou descrição</span><input className="input" required value={description} onChange={(e) => setDescription(e.target.value)} /></label>}
              <label className="field field-span-two"><span>Observações</span><textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: Brinde antecipado autorizado pelo Igor com 78 de 80 vendas." /></label>
            </div>
            {productId && (
              <p className="form-help"><PackagePlus size={13} style={{ verticalAlign: "middle" }} /> O estoque só é baixado quando você confirmar esta entrega. Se não houver saldo suficiente, nada será registrado.</p>
            )}
            <p className="form-help">
              Ao confirmar, o ciclo atual é fechado exatamente neste momento. As próximas vendas começam um novo ciclo, então a parceira não receberá outro brinde apenas por completar a meta antiga depois.
            </p>
            <button className="button gold" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
              {loading ? "Registrando" : "Confirmar entrega da recompensa"}
            </button>
          </form>
        )}

        {message && <p className="sale-action-message">{message}</p>}

        {rewardHistory.length === 0 ? (
          <div className="empty compact"><Gift size={24} /><strong>Nenhuma recompensa entregue</strong>Quando um brinde for liberado, ele ficará registrado aqui e o ciclo será reiniciado.</div>
        ) : (
          <div className="partner-settlement-list">
            {rewardHistory.map((item) => (
              <div className="partner-settlement-item" key={item.id}>
                <div>
                  <strong>{formatDateOnly(item.settled_on)}</strong>
                  <span>{item.sale_count} venda(s) contabilizada(s) no ciclo encerrado</span>
                  <small>{item.reward_description ?? "Recompensa entregue"}{item.notes ? ` · ${item.notes}` : ""}</small>
                </div>
                <div><strong>{item.reward_units} brinde(s)</strong><span>Ciclo encerrado</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
