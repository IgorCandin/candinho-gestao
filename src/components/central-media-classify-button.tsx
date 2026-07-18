"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CentralMediaClassifyButton({ assetId, disabled = false }: { assetId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function classify() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/central/media-classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asset_id: assetId }),
      });

      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível classificar agora.");
      }

      setMessage("Classificação atualizada.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível classificar agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="central-media-classify-action">
      <button className="button gold" type="button" onClick={classify} disabled={disabled || loading}>
        {loading ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}
        Classificar com Nexus
      </button>
      {message && <small>{message}</small>}
    </div>
  );
}
