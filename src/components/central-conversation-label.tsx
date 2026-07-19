"use client";

import { LoaderCircle, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const CENTRAL_LABELS = [
  { key: "", label: "Sem etiqueta" },
  { key: "novo_lead", label: "Novo lead" },
  { key: "orcamento", label: "Orçamento enviado" },
  { key: "aguardando", label: "Aguardando resposta" },
  { key: "pagamento", label: "Aguardando pagamento" },
  { key: "venda", label: "Venda fechada" },
  { key: "urgente", label: "Problema / Urgente" },
  { key: "pos_venda", label: "Pós-venda" },
  { key: "parceiro", label: "Parceiro" },
] as const;

export function labelName(key?: string | null) {
  return CENTRAL_LABELS.find((item) => item.key === (key ?? ""))?.label ?? "Sem etiqueta";
}

export function CentralConversationLabel({ conversationId, value }: { conversationId: string; value?: string | null }) {
  const router = useRouter();
  const [current, setCurrent] = useState(value ?? "");
  const [loading, setLoading] = useState(false);

  async function change(next: string) {
    const previous = current;
    setCurrent(next);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("central_set_conversation_label", {
        p_conversation_id: conversationId,
        p_label_key: next || null,
      });
      if (error) throw error;
      router.refresh();
    } catch {
      setCurrent(previous);
    } finally {
      setLoading(false);
    }
  }

  return (
    <label className={`central-label-control label-${current || "none"}`}>
      {loading ? <LoaderCircle className="spin" size={14}/> : <Tag size={14}/>}
      <select value={current} onChange={(event) => change(event.target.value)} disabled={loading}>
        {CENTRAL_LABELS.map((item) => <option value={item.key} key={item.key || "none"}>{item.label}</option>)}
      </select>
    </label>
  );
}
