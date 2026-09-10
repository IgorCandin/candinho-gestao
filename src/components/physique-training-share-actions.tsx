"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

export function PhysiqueTrainingShareActions({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const payload = { title, text: `Abrir ficha de treino: ${title}`, url: window.location.href };
    if (navigator.share) await navigator.share(payload).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return <div className="physique-training-share-actions">
    <button type="button" className="physique-action-button secondary" onClick={() => void share()}><Share2 size={15}/>{copied ? "Link copiado" : "Compartilhar ficha"}</button>
  </div>;
}
