"use client";

import { LoaderCircle, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LeadConvertButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function convert() {
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("prepare_lead_conversion_v1", {
        p_lead_id: leadId,
      });

      if (error) throw error;

      const quoteId = String(data ?? "");
      if (!quoteId) {
        throw new Error("O orçamento foi preparado, mas não foi possível identificar o registro.");
      }

      router.push(`/vendas/nova?quote=${quoteId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível iniciar a conversão.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 5 }}>
      <button className="button gold" type="button" onClick={convert} disabled={loading}>
        {loading ? <LoaderCircle className="spin" size={16} /> : <ShoppingBag size={16} />}
        {loading ? "Abrindo venda..." : "Converter em venda"}
      </button>
      {message && <small style={{ color: "var(--danger, #ef6b6b)" }}>{message}</small>}
    </div>
  );
}
