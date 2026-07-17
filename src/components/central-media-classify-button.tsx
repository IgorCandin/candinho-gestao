"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CentralMediaClassifyButton({ assetId, disabled = false }: { assetId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function classify() {
    setLoading(true); setMessage(null);
    try {
      const supabase = createClient();
      const result = await supabase.functions.invoke("central-media-classify", { body: { asset_id: assetId } });
      if (result.error) throw result.error;
      setMessage("Classificação atualizada.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível classificar agora.");
    } finally { setLoading(false); }
  }

  return <div className="central-media-classify-action">
    <button className="button gold" type="button" onClick={classify} disabled={disabled || loading}>{loading ? <LoaderCircle className="spin" size={15}/> : <Sparkles size={15}/>}Classificar com Nexus</button>
    {message && <small>{message}</small>}
  </div>;
}
