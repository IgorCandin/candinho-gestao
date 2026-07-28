"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function QuoteDeleteButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function remove() {
    const confirmed = window.confirm(
      "Excluir definitivamente este orçamento?\n\nEle vai sumir da tela de Orçamentos. Essa ação não pode ser desfeita. Orçamentos já convertidos em venda continuam protegidos e não podem ser excluídos.",
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("delete_budget_quote_v1", { p_quote_id: quoteId });
      if (error) throw error;

      router.push("/orcamentos");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir o orçamento.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 5 }}>
      <button className="button danger" type="button" onClick={remove} disabled={loading}>
        {loading ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}
        {loading ? "Excluindo..." : "Excluir definitivamente"}
      </button>
      {message && <small style={{ color: "var(--danger, #ef6b6b)" }}>{message}</small>}
    </div>
  );
}
