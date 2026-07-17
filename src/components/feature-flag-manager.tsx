"use client";

import { CheckCircle2, LoaderCircle, Power, PowerOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CentralFeatureFlag } from "@/lib/central-data";
import { createClient } from "@/lib/supabase/client";

const labels: Record<string, string> = {
  central_enabled: "Candinho Central",
  company_home_v2: "Home da Company V2",
  inventory_v2_enabled: "Estoque V2",
  marketing_enabled: "Candinho Marketing",
  partner_portal_enabled: "Portal do Parceiro",
  test_lab_visible: "Área de Teste",
};

export function FeatureFlagManager({ flags }: { flags: CentralFeatureFlag[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle(flag: CentralFeatureFlag) {
    if (loading) return;
    const next = !flag.enabled;
    if (!next && ["central_enabled", "company_home_v2", "inventory_v2_enabled"].includes(flag.key)) {
      const ok = window.confirm(`Desativar “${labels[flag.key] ?? flag.key}”? Isso pode esconder uma área principal do sistema.`);
      if (!ok) return;
    }
    setLoading(flag.key);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("central_set_feature_flag", { p_key: flag.key, p_enabled: next });
      if (error) throw error;
      setMessage(`${labels[flag.key] ?? flag.key} ${next ? "ativado" : "desativado"}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o recurso.");
    } finally {
      setLoading(null);
    }
  }

  return <div className="feature-flag-manager">
    {flags.map((flag) => <div className={`feature-flag-row ${flag.enabled ? "enabled" : "disabled"}`} key={flag.key}>
      <span className="feature-flag-state">{flag.enabled ? <Power size={17}/> : <PowerOff size={17}/>}</span>
      <div className="feature-flag-copy"><strong>{labels[flag.key] ?? flag.key}</strong><small>{flag.description ?? "Recurso controlado pela governança da Company."}</small></div>
      <button className={`button ${flag.enabled ? "ghost" : "gold"} compact-button`} type="button" disabled={loading !== null} onClick={() => toggle(flag)}>
        {loading === flag.key ? <LoaderCircle className="spin" size={15}/> : flag.enabled ? <PowerOff size={15}/> : <Power size={15}/>}
        {flag.enabled ? "Desativar" : "Ativar"}
      </button>
    </div>)}
    {message && <div className="feature-flag-message"><CheckCircle2 size={15}/>{message}</div>}
  </div>;
}
