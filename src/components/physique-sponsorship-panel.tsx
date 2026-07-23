"use client";

import { BadgeDollarSign, CheckCircle2, Gift, LoaderCircle, Medal, PackagePlus, Plus, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type Sponsorship = {
  id: string;
  athlete_id: string;
  event_name: string;
  event_type: string | null;
  event_date: string | null;
  event_location: string | null;
  starts_on: string | null;
  ends_on: string | null;
  sponsorship_type: "money" | "products" | "mixed";
  cash_amount: number;
  objective: string | null;
  consideration: string | null;
  notes: string | null;
  status: string;
  products_delivered_at: string | null;
  cash_paid_at: string | null;
  finalized_at: string | null;
  created_at: string;
};

type SponsorshipItem = {
  id: string;
  sponsorship_id: string;
  product_id: string;
  product_name: string;
  flavor_id: string | null;
  flavor_name: string | null;
  location_id: string;
  location_code: string;
  location_name: string;
  quantity: number;
  unit_cost_snapshot: number;
};

type ProductOption = { id: string; name: string; flavor_tracking_enabled: boolean };
type FlavorOption = { id: string; product_id: string; name: string };
type LocationOption = { id: string; code: string; name: string };
type Snapshot = { sponsorships: Sponsorship[]; items: SponsorshipItem[]; products: ProductOption[]; flavors: FlavorOption[]; locations: LocationOption[] };
type DraftItem = { product_id: string; flavor_id: string; location_id: string; quantity: number };

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const emptySnapshot: Snapshot = { sponsorships: [], items: [], products: [], flavors: [], locations: [] };

function statusLabel(status: string) {
  if (status === "planned") return "Planejado";
  if (status === "approved") return "Aprovado";
  if (status === "fulfilled") return "Entregue / Pago";
  if (status === "finalized") return "Finalizado";
  if (status === "cancelled") return "Cancelado";
  return status;
}

export function PhysiqueSponsorshipPanel({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("Evento esportivo");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [startsOn, setStartsOn] = useState(today());
  const [endsOn, setEndsOn] = useState("");
  const [sponsorshipType, setSponsorshipType] = useState<"money" | "products" | "mixed">("products");
  const [cashAmount, setCashAmount] = useState("");
  const [objective, setObjective] = useState("");
  const [consideration, setConsideration] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  async function load() {
    const { data, error } = await createClient().rpc("physique_sponsorship_snapshot", { p_athlete_id: athleteId });
    if (error) {
      setMessage(error.message);
      return;
    }
    const raw = (data ?? {}) as Record<string, unknown>;
    setSnapshot({
      sponsorships: Array.isArray(raw.sponsorships) ? raw.sponsorships as Sponsorship[] : [],
      items: Array.isArray(raw.items) ? raw.items as SponsorshipItem[] : [],
      products: Array.isArray(raw.products) ? raw.products as ProductOption[] : [],
      flavors: Array.isArray(raw.flavors) ? raw.flavors as FlavorOption[] : [],
      locations: Array.isArray(raw.locations) ? raw.locations as LocationOption[] : [],
    });
  }

  useEffect(() => { void load(); }, [athleteId]);

  const totals = useMemo(() => {
    const cash = snapshot.sponsorships.filter((s) => s.status !== "cancelled").reduce((sum, s) => sum + Number(s.cash_amount || 0), 0);
    const productCost = snapshot.items.reduce((sum, item) => {
      const sponsorship = snapshot.sponsorships.find((s) => s.id === item.sponsorship_id);
      return sponsorship?.status === "cancelled" ? sum : sum + Number(item.unit_cost_snapshot || 0) * Number(item.quantity || 0);
    }, 0);
    return { cash, productCost, total: cash + productCost };
  }, [snapshot]);

  function addItem() {
    const product = snapshot.products[0];
    const location = snapshot.locations[0];
    if (!product || !location) {
      setMessage("Cadastre produtos e um local de estoque antes de incluir suplementos no patrocínio.");
      return;
    }
    setItems((current) => [...current, { product_id: product.id, flavor_id: "", location_id: location.id, quantity: 1 }]);
  }

  async function createSponsorship(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await createClient().rpc("create_physique_sponsorship", {
        p_athlete_id: athleteId,
        p_event_name: eventName,
        p_event_type: eventType || null,
        p_event_date: eventDate || null,
        p_event_location: eventLocation || null,
        p_starts_on: startsOn || null,
        p_ends_on: endsOn || null,
        p_sponsorship_type: sponsorshipType,
        p_cash_amount: cashAmount ? Number(cashAmount) : 0,
        p_objective: objective || null,
        p_consideration: consideration || null,
        p_notes: notes || null,
        p_items: items.map((item) => ({ ...item, flavor_id: item.flavor_id || null })),
      });
      if (error) throw error;
      setOpen(false);
      setEventName("");
      setEventDate("");
      setEventLocation("");
      setCashAmount("");
      setObjective("");
      setConsideration("");
      setNotes("");
      setItems([]);
      setMessage("Patrocínio registrado.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar o patrocínio.");
    } finally {
      setLoading(false);
    }
  }

  async function action(id: string, actionName: string) {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await createClient().rpc("physique_sponsorship_action", { p_sponsorship_id: id, p_action: actionName });
      if (error) throw error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o patrocínio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="physique-panel-title">
        <div><span>Apoio ao atleta</span><h2>Patrocínios</h2></div>
        <button className="physique-action-button secondary" type="button" onClick={() => setOpen(!open)}><Plus size={15} /> Enviar patrocínio</button>
      </div>

      <div className="physique-measure-grid">
        <span>Patrocínios <b>{snapshot.sponsorships.filter((s) => s.status !== "cancelled").length}</b></span>
        <span>Dinheiro previsto <b>{formatCurrency(totals.cash)}</b></span>
        <span>Custo de produtos <b>{formatCurrency(totals.productCost)}</b></span>
        <span>Investimento total <b>{formatCurrency(totals.total)}</b></span>
      </div>

      {open && (
        <form className="crm-action-form" onSubmit={createSponsorship}>
          <div className="sale-action-form-head">
            <div><strong>Novo patrocínio</strong><span>Registre o evento, o apoio e a contrapartida combinada.</span></div>
            <button className="icon-button" type="button" onClick={() => setOpen(false)}><X size={17} /></button>
          </div>
          <div className="form-grid-two">
            <label className="field field-span-two"><span>Evento</span><input className="input" required value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Ex.: Caparaó Run" /></label>
            <label className="field"><span>Tipo do evento</span><input className="input" value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="Corrida, campeonato..." /></label>
            <label className="field"><span>Data do evento</span><input className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></label>
            <label className="field field-span-two"><span>Local</span><input className="input" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Cidade, academia ou local do evento" /></label>
            <label className="field"><span>Início do apoio</span><input className="input" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></label>
            <label className="field"><span>Fim do apoio (opcional)</span><input className="input" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} /></label>
            <label className="field"><span>Tipo de patrocínio</span><select className="select" value={sponsorshipType} onChange={(e) => setSponsorshipType(e.target.value as typeof sponsorshipType)}><option value="products">Suplementos</option><option value="money">Dinheiro</option><option value="mixed">Dinheiro + suplementos</option></select></label>
            {(sponsorshipType === "money" || sponsorshipType === "mixed") && <label className="field"><span>Valor em dinheiro</span><input className="input" type="number" min="0" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} /></label>}
            <label className="field field-span-two"><span>Objetivo do apoio</span><textarea className="textarea" rows={3} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex.: Apoio para participação na prova e divulgação regional da Candinho." /></label>
            <label className="field field-span-two"><span>Contrapartida (opcional)</span><textarea className="textarea" rows={3} value={consideration} onChange={(e) => setConsideration(e.target.value)} placeholder="Stories, publicação, camisa, marcações..." /></label>
            <label className="field field-span-two"><span>Observações</span><textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          </div>

          {(sponsorshipType === "products" || sponsorshipType === "mixed") && (
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <div className="sale-action-form-head"><div><strong>Suplementos do patrocínio</strong><span>A baixa no estoque só acontece quando você confirmar a entrega.</span></div><button className="button ghost compact-button" type="button" onClick={addItem}><PackagePlus size={14} /> Adicionar produto</button></div>
              {items.map((item, index) => {
                const product = snapshot.products.find((value) => value.id === item.product_id);
                const flavors = snapshot.flavors.filter((value) => value.product_id === item.product_id);
                return (
                  <div className="form-grid-two" key={`${item.product_id}-${index}`} style={{ padding: 10, border: "1px solid var(--line)", borderRadius: 10 }}>
                    <label className="field"><span>Produto</span><select className="select" value={item.product_id} onChange={(e) => setItems((current) => current.map((value, i) => i === index ? { ...value, product_id: e.target.value, flavor_id: "" } : value))}>{snapshot.products.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
                    {product?.flavor_tracking_enabled && <label className="field"><span>Sabor</span><select className="select" required value={item.flavor_id} onChange={(e) => setItems((current) => current.map((value, i) => i === index ? { ...value, flavor_id: e.target.value } : value))}><option value="">Selecione</option>{flavors.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>}
                    <label className="field"><span>Origem do estoque</span><select className="select" value={item.location_id} onChange={(e) => setItems((current) => current.map((value, i) => i === index ? { ...value, location_id: e.target.value } : value))}>{snapshot.locations.map((value) => <option key={value.id} value={value.id}>{value.code} · {value.name}</option>)}</select></label>
                    <label className="field"><span>Quantidade</span><input className="input" type="number" min="1" step="1" value={item.quantity} onChange={(e) => setItems((current) => current.map((value, i) => i === index ? { ...value, quantity: Math.max(1, Number(e.target.value || 1)) } : value))} /></label>
                    <button className="button ghost compact-button" type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}><X size={13} /> Remover</button>
                  </div>
                );
              })}
              {items.length === 0 && <p className="form-help">Adicione pelo menos um produto para patrocínio em suplementos.</p>}
            </div>
          )}

          <button className="button gold" style={{ marginTop: 12 }} disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={16} /> : <Medal size={16} />}
            {loading ? "Salvando" : "Registrar patrocínio"}
          </button>
        </form>
      )}

      {message && <p className="sale-action-message">{message}</p>}

      {snapshot.sponsorships.length === 0 ? (
        <div className="physique-empty compact"><Trophy size={24} /><strong>Nenhum patrocínio registrado</strong>Use esta área para acompanhar apoio em dinheiro, suplementos ou ambos.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {snapshot.sponsorships.map((sponsorship) => {
            const sponsorshipItems = snapshot.items.filter((item) => item.sponsorship_id === sponsorship.id);
            const productCost = sponsorshipItems.reduce((sum, item) => sum + Number(item.unit_cost_snapshot || 0) * Number(item.quantity || 0), 0);
            const needsProducts = sponsorship.sponsorship_type === "products" || sponsorship.sponsorship_type === "mixed";
            const needsCash = sponsorship.sponsorship_type === "money" || sponsorship.sponsorship_type === "mixed";
            return (
              <article className="physique-assessment-card" key={sponsorship.id}>
                <header>
                  <div><small>{sponsorship.event_date ? formatDateOnly(sponsorship.event_date) : "Data não informada"} · {sponsorship.event_type ?? "Evento"}</small><strong>{sponsorship.event_name}</strong></div>
                  <span className={`badge ${sponsorship.status === "cancelled" ? "red" : sponsorship.status === "finalized" || sponsorship.status === "fulfilled" ? "green" : "orange"}`}>{statusLabel(sponsorship.status)}</span>
                </header>
                <div className="physique-measure-grid">
                  <span>Dinheiro <b>{formatCurrency(sponsorship.cash_amount)}</b></span>
                  <span>Produtos <b>{sponsorshipItems.reduce((sum, item) => sum + item.quantity, 0)} un.</b></span>
                  <span>Custo produtos <b>{formatCurrency(productCost)}</b></span>
                  <span>Total investido <b>{formatCurrency(Number(sponsorship.cash_amount || 0) + productCost)}</b></span>
                </div>
                {sponsorship.event_location && <p><strong>Local:</strong> {sponsorship.event_location}</p>}
                {sponsorship.objective && <p><strong>Objetivo:</strong> {sponsorship.objective}</p>}
                {sponsorship.consideration && <p><strong>Contrapartida:</strong> {sponsorship.consideration}</p>}
                {sponsorshipItems.length > 0 && <div style={{ display: "grid", gap: 5 }}>{sponsorshipItems.map((item) => <small key={item.id}>{item.quantity}× {item.product_name}{item.flavor_name ? ` · ${item.flavor_name}` : ""} · saída de {item.location_code}</small>)}</div>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {sponsorship.status === "planned" && <button className="button gold compact-button" disabled={loading} type="button" onClick={() => void action(sponsorship.id, "approve")}><CheckCircle2 size={13} /> Aprovar</button>}
                  {sponsorship.status === "planned" && <button className="button ghost compact-button" disabled={loading} type="button" onClick={() => void action(sponsorship.id, "cancel")}><X size={13} /> Cancelar</button>}
                  {sponsorship.status === "approved" && needsProducts && !sponsorship.products_delivered_at && <button className="button gold compact-button" disabled={loading} type="button" onClick={() => void action(sponsorship.id, "deliver_products")}><Gift size={13} /> Confirmar entrega dos produtos</button>}
                  {sponsorship.status === "approved" && needsCash && !sponsorship.cash_paid_at && <button className="button gold compact-button" disabled={loading} type="button" onClick={() => void action(sponsorship.id, "mark_cash_paid")}><BadgeDollarSign size={13} /> Confirmar pagamento</button>}
                  {sponsorship.status === "fulfilled" && <button className="button gold compact-button" disabled={loading} type="button" onClick={() => void action(sponsorship.id, "finalize")}><Trophy size={13} /> Finalizar patrocínio</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
