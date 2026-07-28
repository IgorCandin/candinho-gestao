"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LeadDeleteButton({ leadId, customerName }: { leadId: string; customerName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function remove() {
    const confirmed = window.confirm(
      `Excluir definitivamente o lead de ${customerName}?\n\nEssa ação remove o lead da lista. Se existir um orçamento ainda não confirmado, o orçamento é mantido, mas deixa de ficar vinculado ao lead.`,
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("delete_lead_v1", { p_lead_id: leadId });
      if (error) throw error;

      router.push("/leads");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir o lead.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 5 }}>
      <button className="button danger" type="button" onClick={remove} disabled={loading}>
        {loading ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}
        {loading ? "Excluindo..." : "Excluir lead"}
      </button>
      {message && <small style={{ color: "var(--danger, #ef6b6b)" }}>{message}</small>}
    </div>
  );
}
