"use client";

import { useEffect } from "react";

export function PublicCatalogHardNavigationV4537() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");

      if (!anchor || !anchor.closest('[role="dialog"]')) return;

      let url: URL;

      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (
        url.origin !== window.location.origin ||
        !url.pathname.startsWith("/catalogo/")
      ) {
        return;
      }

      /*
       * O Next estava alterando a URL da navegação do popup enquanto a
       * árvore RSC antiga permanecia na tela. Dentro do popup usamos uma
       * navegação real do navegador: mantém o mesmo destino/visual, mas
       * elimina qualquer transição de cliente que possa ficar presa.
       */
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      document.body.style.overflow = "";
      window.location.assign(url.href);
    }

    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
