"use client";

import { useEffect } from "react";

function samePageHashOnly(url: URL) {
  return (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    Boolean(url.hash)
  );
}

export function NavigationStabilityV4537R1() {
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

      if (!anchor) return;

      if (
        anchor.target &&
        anchor.target.toLowerCase() !== "_self"
      ) {
        return;
      }

      if (anchor.hasAttribute("download")) return;

      let url: URL;

      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        return;
      }

      if (samePageHashOnly(url)) return;

      const current =
        `${window.location.pathname}${window.location.search}${window.location.hash}`;

      const next =
        `${url.pathname}${url.search}${url.hash}`;

      if (current === next) return;

      /*
       * Modo de estabilidade:
       *
       * O App Router estava atualizando a URL em algumas navegações sem
       * efetivamente trocar a árvore visível. Como o servidor está saudável
       * e respondendo 200, a prioridade agora é impedir que cliente/operador
       * fique preso numa tela antiga.
       *
       * Interceptamos links internos e deixamos o navegador fazer a navegação
       * documental normal. Isso preserva histórico, botão Voltar, URL, cookies,
       * autenticação e todos os links, mas elimina a transição RSC que estava
       * ficando presa no cliente.
       */
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Garante que overlays antigos não deixem a próxima página "travada".
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
