"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PublicCatalogWarmupV4536() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const warm = () => {
      if (cancelled) return;

      // A página inicial já sabe quais são os dois destinos
      // principais. Aquecemos ambos quando a rede/CPU estiver livre,
      // sem alterar nada visualmente.
      router.prefetch("/catalogo/fitness");
      router.prefetch("/catalogo/suplementos");
    };

    const idleWindow =
      window as Window & {
        requestIdleCallback?: (
          callback: () => void,
          options?: { timeout?: number },
        ) => number;
        cancelIdleCallback?: (
          handle: number,
        ) => void;
      };

    if (idleWindow.requestIdleCallback) {
      const handle =
        idleWindow.requestIdleCallback(
          warm,
          { timeout: 1400 },
        );

      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(
          handle,
        );
      };
    }

    const timer =
      window.setTimeout(
        warm,
        700,
      );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router]);

  return null;
}
