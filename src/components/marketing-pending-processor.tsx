"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

async function processAsset(assetId: string) {
  const response = await fetch("/api/marketing/pdf-ingest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ asset_id: assetId }),
  });

  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok || payload.error) {
    throw new Error(payload.error || "Falha ao interpretar PDF.");
  }
}

export function MarketingPendingProcessor({ assetIds }: { assetIds: string[] }) {
  const router = useRouter();
  const started = useRef(false);
  const [remaining, setRemaining] = useState(assetIds.length);
  const [failed, setFailed] = useState(0);

  useEffect(() => {
    if (started.current || assetIds.length === 0) return;
    started.current = true;

    void (async () => {
      let errors = 0;

      for (let index = 0; index < assetIds.length; index += 1) {
        try {
          await processAsset(assetIds[index]);
        } catch {
          errors += 1;
        }
        setRemaining(assetIds.length - index - 1);
        setFailed(errors);
      }

      router.refresh();
    })();
  }, [assetIds, router]);

  if (assetIds.length === 0) return null;

  return (
    <div className="bank-success-banner" style={{ marginBottom: 18 }}>
      {remaining > 0 ? <LoaderCircle className="spin" size={18}/> : <Sparkles size={18}/>} 
      <div>
        <strong>{remaining > 0 ? `Nexus interpretando ${remaining} PDF(s)...` : failed ? "Processamento finalizado com pendências." : "Processamento concluído."}</strong>
        <span>
          {failed > 0
            ? `${failed} material(is) não puderam ser interpretados nesta tentativa.`
            : "Os PDFs foram transformados em páginas de roteiro dentro do Marketing."}
        </span>
      </div>
    </div>
  );
}
