"use client";

import { CheckCircle2, LoaderCircle, Save, Store, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LocationOption, PartnerOverview } from "@/lib/types";

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function PartnerForm({ partner, locations }: { partner?: PartnerOverview | null; locations: LocationOption[] }) {
  const router = useRouter();
  const [name, setName] = useState(partner?.name ?? "");
  const [partnerType, setPartnerType] = useState(partner?.partner_type ?? "Ponto de Retirada");
  const [city, setCity] = useState(partner?.city ?? "");
  const [reference, setReference] = useState(partner?.reference ?? "");
  const [contactName, setContactName] = useState(partner?.contact_name ?? "");
  const [phone, setPhone] = useState(partner?.phone ?? "");
  const [status, setStatus] = useState(partner?.status ?? "Ativo");
  const [startDate, setStartDate] = useState(partner?.start_date ?? todayInSaoPaulo());
  const [endDate, setEndDate] = useState(partner?.end_date ?? "");
  const [partnershipModel, setPartnershipModel] = useState(partner?.partnership_model ?? "");
  const [settlementRule, setSettlementRule] = useState(partner?.settlement_rule ?? "");
  const [rewardType, setRewardType] = useState(partner?.reward_type ?? "manual");
  const [targetSales, setTargetSales] = useState(String(partner?.target_sales ?? 10));
  const [rewardValue, setRewardValue] = useState(String(partner?.reward_value ?? 0));
  const [rewardDescription, setRewardDescription] = useState(partner?.reward_description ?? "");
  const [frequency, setFrequency] = useState(partner?.settlement_frequency ?? "manual");
  const [settlementDay, setSettlementDay] = useState(String(partner?.settlement_day ?? ""));
  const [couponCode, setCouponCode] = useState(partner?.coupon_code ?? "");
  const [locationId, setLocationId] = useState(partner?.linked_location_id ?? "");
  const [deliveredOnly, setDeliveredOnly] = useState(partner?.counts_only_delivered ?? true);
  const [canHoldStock, setCanHoldStock] = useState(partner?.can_hold_stock ?? false);
  const [canPickup, setCanPickup] = useState(partner?.can_pickup ?? false);
  const [canSell, setCanSell] = useState(partner?.can_sell ?? false);
  const [canDeliver, setCanDeliver] = useState(partner?.can_deliver ?? false);
  const [notes, setNotes] = useState(partner?.notes ?? "");
  const [active, setActive] = useState(partner?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("save_partner", {
        p_partner_id: partner?.id ?? null, p_name: name, p_partner_type: partnerType, p_city: city || null,
        p_reference: reference || null, p_contact_name: contactName || null, p_phone: phone || null,
        p_status: status, p_start_date: startDate || null, p_end_date: endDate || null,
        p_partnership_model: partnershipModel || null, p_settlement_rule: settlementRule || null,
        p_reward_type: rewardType, p_target_sales: rewardType === "gift_per_sales" ? Number(targetSales) : null,
        p_reward_value: ["fixed_per_sale", "percentage"].includes(rewardType) ? Number(rewardValue) : 0,
        p_reward_description: rewardDescription || null, p_settlement_frequency: frequency,
        p_settlement_day: frequency === "monthly" && settlementDay ? Number(settlementDay) : null,
        p_coupon_code: couponCode || null, p_linked_location_id: locationId || null,
        p_counts_only_delivered: deliveredOnly, p_can_hold_stock: canHoldStock, p_can_pickup: canPickup,
        p_can_sell: canSell, p_can_deliver: canDeliver, p_notes: notes || null, p_active: active,
      });
      if (error) throw error;
      const id = String(data);
      setMessage("Parceiro salvo.");
      router.push(`/parceiros/${id}`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar o parceiro."); }
    finally { setLoading(false); }
  }

  return <form className="partner-editor-layout" onSubmit={submit}>
    <div className="partner-editor-main">
      <article className="panel"><div className="panel-head"><div><h2>Identificação</h2><p>Dados de contato e período da parceria.</p></div></div><div className="panel-body form-grid-three">
        <label className="field field-span-two"><span>Nome do parceiro</span><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Tipo</span><select className="select" value={partnerType} onChange={(e) => setPartnerType(e.target.value)}><option>Ponto de Retirada</option><option>Consignado</option><option>Divulgador</option><option>Parceiro Interno</option><option>Ponto de Apoio</option><option>Academia</option><option>Influenciador</option><option>Outro</option></select></label>
        <label className="field"><span>Responsável</span><input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} /></label>
        <label className="field"><span>Telefone</span><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <label className="field"><span>Cidade</span><input className="input" value={city} onChange={(e) => setCity(e.target.value)} /></label>
        <label className="field"><span>Referência</span><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} /></label>
        <label className="field"><span>Status</span><select className="select" value={status} onChange={(e) => setStatus(e.target.value)}><option>Ativo</option><option>Pausado</option><option>Encerrado</option></select></label>
        <label className="field"><span>Início</span><input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label className="field"><span>Fim (opcional)</span><input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
      </div></article>

      <article className="panel"><div className="panel-head"><div><h2>Regra da parceria</h2><p>Define como o progresso e o acerto serão calculados.</p></div></div><div className="panel-body partner-rule-form">
        <div className="form-grid-two">
          <label className="field"><span>Modelo da recompensa</span><select className="select" value={rewardType} onChange={(e) => setRewardType(e.target.value)}><option value="gift_per_sales">Brinde por meta de vendas</option><option value="fixed_per_sale">Valor fixo por venda</option><option value="percentage">Percentual das vendas</option><option value="manual">Acerto manual</option><option value="none">Sem acerto</option></select></label>
          <label className="field"><span>Frequência</span><select className="select" value={frequency} onChange={(e) => setFrequency(e.target.value)}><option value="on_target">Quando atingir a meta</option><option value="monthly">Mensal</option><option value="manual">Manual</option><option value="none">Sem acerto</option></select></label>
          {rewardType === "gift_per_sales" && <label className="field"><span>Meta de vendas</span><input className="input" type="number" min="1" required value={targetSales} onChange={(e) => setTargetSales(e.target.value)} /></label>}
          {rewardType === "fixed_per_sale" && <label className="field"><span>Valor por venda</span><input className="input" type="number" min="0" step="0.01" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} /></label>}
          {rewardType === "percentage" && <label className="field"><span>Percentual</span><input className="input" type="number" min="0" step="0.01" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} /></label>}
          {frequency === "monthly" && <label className="field"><span>Dia do acerto</span><input className="input" type="number" min="1" max="31" value={settlementDay} onChange={(e) => setSettlementDay(e.target.value)} /></label>}
          <label className="field field-span-two"><span>Descrição da recompensa</span><input className="input" value={rewardDescription} onChange={(e) => setRewardDescription(e.target.value)} placeholder="Ex.: 1 suplemento à escolha do parceiro" /></label>
          <label className="field field-span-two"><span>Modelo da parceria</span><input className="input" value={partnershipModel} onChange={(e) => setPartnershipModel(e.target.value)} /></label>
          <label className="field field-span-two"><span>Regra do acerto</span><textarea className="textarea" rows={3} value={settlementRule} onChange={(e) => setSettlementRule(e.target.value)} /></label>
          <label className="field"><span>Cupom (opcional)</span><input className="input" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} /></label>
          <label className="field"><span>Ponto físico relacionado</span><select className="select" value={locationId} onChange={(e) => setLocationId(e.target.value)}><option value="">Nenhum</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.code} · {location.name}</option>)}</select></label>
        </div>
        <label className="switch-row"><div><strong>Contar somente vendas entregues</strong><span>Evita pagar comissão ou liberar brinde antes da entrega real.</span></div><input type="checkbox" checked={deliveredOnly} onChange={(e) => setDeliveredOnly(e.target.checked)} /></label>
      </div></article>

      <article className="panel"><div className="panel-head"><div><h2>Operação e observações</h2><p>O que esse parceiro pode fazer dentro da operação.</p></div></div><div className="panel-body product-switch-list">
        <label className="switch-row"><div><strong>Mantém estoque</strong><span>Pode ter saldo físico próprio.</span></div><input type="checkbox" checked={canHoldStock} onChange={(e) => setCanHoldStock(e.target.checked)} /></label>
        <label className="switch-row"><div><strong>Ponto de retirada</strong><span>Cliente pode retirar produtos nesse local.</span></div><input type="checkbox" checked={canPickup} onChange={(e) => setCanPickup(e.target.checked)} /></label>
        <label className="switch-row"><div><strong>Realiza vendas</strong><span>Parceiro pode vender produtos diretamente.</span></div><input type="checkbox" checked={canSell} onChange={(e) => setCanSell(e.target.checked)} /></label>
        <label className="switch-row"><div><strong>Realiza entregas</strong><span>Parceiro pode ser responsável pela entrega.</span></div><input type="checkbox" checked={canDeliver} onChange={(e) => setCanDeliver(e.target.checked)} /></label>
        <label className="field"><span>Observações</span><textarea className="textarea" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </div></article>
    </div>

    <aside className="partner-editor-side"><article className="panel"><div className="panel-head"><div><h2>Salvar parceiro</h2><p>As vendas vinculadas usarão essa regra.</p></div><Store size={19} /></div><div className="panel-body product-switch-list">
      <label className="switch-row"><div><strong>Parceiro ativo</strong><span>Disponível para novas vendas.</span></div><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /></label>
      <div className="partner-form-preview"><span>Modelo</span><strong>{rewardType === "gift_per_sales" ? `Brinde a cada ${targetSales || 0} vendas` : rewardType === "fixed_per_sale" ? `R$ ${Number(rewardValue || 0).toFixed(2)} por venda` : rewardType === "percentage" ? `${rewardValue || 0}% das vendas` : rewardType === "none" ? "Sem acerto" : "Acerto manual"}</strong><small>{deliveredOnly ? "Somente vendas entregues" : "Todas as vendas válidas"}</small></div>
      {message && <p className="form-message standalone-message">{message}</p>}
      <button className="button gold product-save-button" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{loading ? "Salvando" : partner ? "Salvar alterações" : "Cadastrar parceiro"}</button>
      <button className="button ghost product-cancel-button" type="button" onClick={() => router.back()}><X size={16} />Cancelar</button>
      {!loading && message === "Parceiro salvo." && <span className="crm-inline-message"><CheckCircle2 size={15} />Salvo</span>}
    </div></article></aside>
  </form>;
}
