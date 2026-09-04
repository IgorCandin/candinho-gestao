"use client";

/* eslint-disable @next/next/no-img-element */

import { X } from "lucide-react";
import { useEffect, useState } from "react";

export function CompanyNutritionLightbox() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    function open(event: MouseEvent) {
      const image = (event.target as Element | null)?.closest<HTMLImageElement>(".company-nutrition-image-slot img");
      if (!image?.src) return;
      event.preventDefault();
      setSrc(image.src);
    }
    document.addEventListener("click", open);
    return () => document.removeEventListener("click", open);
  }, []);
  useEffect(() => { if (!src) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSrc(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [src]);
  return src ? <div className="company-nutrition-lightbox" role="dialog" aria-modal="true" aria-label="Tabela nutricional ampliada" onClick={() => setSrc(null)}><button type="button" aria-label="Fechar"><X/></button><img src={src} alt="Tabela nutricional ampliada" onClick={(event) => event.stopPropagation()}/></div> : null;
}
