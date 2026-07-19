"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function MarketingPendingProcessor({ assetIds }: { assetIds: string[] }) {
  const router = useRouter();
  const started = useRef(false);
  const [remaining, setRemaining] = useState(assetIds.length);
  const [failed, setFailed] = useState(0);

  useEffect(() => {
    if (started.current || assetIds.length === 0) return;
    started.current = true;

    void (async () => {
      const supabase = createClient();
      let errors = 0;

      for (let index = 0; index < assetIds.length; index += 1) {
        const result = await supabase.functions.invoke("marketing-pdf-ingest", {
          body: { asset_id: assetIds[index] },
        });
        if (result.error || result.data?.error) errors += 1;
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
        <strong>{remaining > 0 ? `Nexus interpretando ${remaining} PDF(s)...` : "Processamento concluído."}</strong>
        <span>
          {failed > 0
            ? `${failed} material(is) tiveram erro e continuam disponíveis para nova tentativa.`
            : "Os PDFs antigos enviados como Marketing estão sendo transformados em páginas de roteiro automaticamente."}
        </span>
      </div>
    </div>
  );
}
