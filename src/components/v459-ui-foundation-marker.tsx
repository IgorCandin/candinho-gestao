"use client";

import { useEffect } from "react";

const DESKTOP_QUERY = "(min-width: 821px)";

export function V459UiFoundationMarker() {
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);

    function syncFoundation() {
      // V45.9 nasceu para corrigir densidade/legibilidade do desktop.
      // No telefone, a interface antiga já possuía um shell próprio e
      // mais natural. Mantemos a fundação somente acima de 820px.
      document.body.classList.toggle("v459-erp", media.matches);
    }

    syncFoundation();
    media.addEventListener("change", syncFoundation);

    return () => {
      media.removeEventListener("change", syncFoundation);
      document.body.classList.remove("v459-erp");
    };
  }, []);

  return null;
}
