"use client";

import { Check, LoaderCircle, Pencil, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CustomerDetails } from "@/lib/types";

const CRM_EXCLUSION_REASONS = [
  { value: "internal", label: "Interno" },
  { value: "test", label: "Teste" },
  { value: "do_not_contact", label: "Não contatar" },
  { value: "other", label: "Outro" },
] as const;

export function CustomerProfileEditor({ customer }: { customer: CustomerDetails }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [crmLoading, setCrmLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone ?? "",
    city: customer.city ?? "",
    reference: customer.reference ?? "",
    email: customer.email ?? "",
    notes: customer.notes ?? "",
    sensitiveToCaffeine: customer.sensitive_to_caffeine,
    anxietyOrInsomnia: customer.anxiety_or_insomnia,
    prohibitedProducts: customer.prohibited_products ?? "",
    approachPreferences: customer.approach_preferences ?? "",
    tags: customer.tags ?? "",
    active: customer.active,
    crmAutomationEnabled: true,
    crmExclusionReason: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCrmSettings() {
      setCrmLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("get_customer_crm_automation", {
          p_customer_id: customer.id,
        });
        if (error) throw error;
        if (cancelled) return;

        const row = Array.isArray(data) ? data[0] : data;
        setForm((current) => ({
          ...current,
          crmAutomationEnabled:
            row?.crm_automation_enabled === undefined
              ? true
              : Boolean(row.crm_automation_enabled),
          crmExclusionReason:
            typeof row?.crm_exclusion_reason === "string"
              ? row.crm_exclusion_reason
              : "",
        }));
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a configuração do CRM.",
          );
        }
      } finally {
        if (!cancelled) setCrmLoading(false);
      }
    }

    void loadCrmSettings();

    return () => {
      cancelled = true;
    };
  }, [customer.id]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.crmAutomationEnabled && !form.crmExclusionReason) {
      setMessage("Escolha o motivo para retirar este cliente do CRM automático.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_customer_profile_v2", {
        p_customer_id: customer.id,
        p_name: form.name.trim(),
        p_phone: form.phone.trim() || null,
        p_city: form.city.trim() || null,
        p_reference: form.reference.trim() || null,
        p_email: form.email.trim() || null,
        p_notes: form.notes.trim() || null,
        p_sensitive_to_caffeine: form.sensitiveToCaffeine,
        p_anxiety_or_insomnia: form.anxietyOrInsomnia,
        p_prohibited_products: form.prohibitedProducts.trim() || null,
        p_approach_preferences: form.approachPreferences.trim() || null,
        p_tags: form.tags.trim() || null,
        p_active: form.active,
        p_crm_automation_enabled: form.crmAutomationEnabled,
        p_crm_exclusion_reason: form.crmAutomationEnabled
          ? null
          : form.crmExclusionReason || "other",
      });

      if (error) throw error;

      setMessage(
        form.crmAutomationEnabled
          ? "Dados atualizados. Cliente participando do CRM automático."
          : "Dados atualizados. Cliente removido das sugestões automáticas do CRM.",
      );
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o cliente.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="customer-profile-editor-trigger">
        <button className="button ghost" type="button" onClick={() => setOpen(true)}>
          <Pencil size={16} />
          Editar dados
        </button>
        {message && (
          <span className="crm-inline-message">
            <Check size={14} />
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <form className="customer-profile-editor" onSubmit={submit}>
      <div className="customer-editor-head">
        <div>
          <strong>Editar ficha do cliente</strong>
          <span>Dados, restrições, preferências e participação no CRM automático.</span>
        </div>
        <button className="icon-button" type="button" aria-label="Fechar edição" onClick={() => setOpen(false)}>
          <X size={17} />
        </button>
      </div>

      <div className="form-grid-two">
        <label className="field field-span-two"><span>Nome</span><input className="input" required value={form.name} onChange={(event) => setField("name", event.target.value)} /></label>
        <label className="field"><span>Telefone</span><input className="input" value={form.phone} onChange={(event) => setField("phone", event.target.value)} /></label>
        <label className="field"><span>Cidade</span><input className="input" value={form.city} onChange={(event) => setField("city", event.target.value)} /></label>
        <label className="field"><span>E-mail</span><input className="input" type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} /></label>
        <label className="field"><span>Referência</span><input className="input" value={form.reference} onChange={(event) => setField("reference", event.target.value)} /></label>
        <label className="field field-span-two"><span>Etiquetas</span><input className="input" placeholder="Ex.: ciclista, panha, recompra, sensível" value={form.tags} onChange={(event) => setField("tags", event.target.value)} /></label>
        <label className="field field-span-two"><span>Observações gerais</span><textarea className="textarea" rows={3} value={form.notes} onChange={(event) => setField("notes", event.target.value)} /></label>

        <label className="switch-row"><div><strong>Sensível à cafeína</strong><span>Evitar estimulantes sem avaliar.</span></div><input type="checkbox" checked={form.sensitiveToCaffeine} onChange={(event) => setField("sensitiveToCaffeine", event.target.checked)} /></label>
        <label className="switch-row"><div><strong>Ansiedade ou insônia</strong><span>Exige cuidado com horário e composição.</span></div><input type="checkbox" checked={form.anxietyOrInsomnia} onChange={(event) => setField("anxietyOrInsomnia", event.target.checked)} /></label>

        <label className="field field-span-two"><span>Produtos que não devem ser indicados</span><textarea className="textarea" rows={2} value={form.prohibitedProducts} onChange={(event) => setField("prohibitedProducts", event.target.value)} /></label>
        <label className="field field-span-two"><span>Preferência de abordagem</span><textarea className="textarea" rows={2} placeholder="Ex.: prefere mensagem curta, não ligar, retornar após o pagamento" value={form.approachPreferences} onChange={(event) => setField("approachPreferences", event.target.value)} /></label>

        <div className="field-span-two" style={{ display: "grid", gap: 12, padding: 14, border: "1px solid var(--line)", borderRadius: 14, background: "rgba(255,255,255,.018)" }}>
          <label className="switch-row">
            <div>
              <strong>Participar do CRM automático</strong>
              <span>Desative para cliente interno, teste ou alguém que não deve aparecer no Radar de Oportunidades.</span>
            </div>
            <input type="checkbox" checked={form.crmAutomationEnabled} disabled={crmLoading} onChange={(event) => setField("crmAutomationEnabled", event.target.checked)} />
          </label>

          {crmLoading ? (
            <small style={{ color: "var(--muted)" }}>Carregando configuração do CRM...</small>
          ) : !form.crmAutomationEnabled ? (
            <label className="field">
              <span>Motivo da exclusão</span>
              <select className="select" required value={form.crmExclusionReason} onChange={(event) => setField("crmExclusionReason", event.target.value)}>
                <option value="">Selecione</option>
                {CRM_EXCLUSION_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
              <small style={{ color: "var(--muted)", lineHeight: 1.45 }}>
                O histórico continua intacto. Apenas sugestões automáticas, recompra e contadores do Radar deixam de considerar este cliente.
              </small>
            </label>
          ) : (
            <small style={{ color: "var(--muted)", lineHeight: 1.45 }}>
              Após registrar um contato, o Radar respeita um intervalo automático antes de sugerir o cliente novamente.
            </small>
          )}
        </div>

        <label className="switch-row field-span-two">
          <div><strong>Cliente ativo</strong><span>Clientes inativos continuam no histórico, mas não aparecem nos novos formulários.</span></div>
          <input type="checkbox" checked={form.active} onChange={(event) => setField("active", event.target.checked)} />
        </label>
      </div>

      <div className="customer-editor-footer">
        <button className="button ghost" type="button" onClick={() => setOpen(false)}>Cancelar</button>
        <button className="button gold" disabled={loading || crmLoading}>
          {loading ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
          {loading ? "Salvando" : "Salvar alterações"}
        </button>
      </div>

      {message && <p className="form-message crm-form-message">{message}</p>}
    </form>
  );
}
