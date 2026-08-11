"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const SUPPLEMENT_ROUTE_ROOTS = [
  "agenda",
  "cadastros",
  "clientes",
  "estoque",
  "fornecedores",
  "leads",
  "movimentacoes",
  "orcamentos",
  "painel-cs",
  "parceiros",
  "pedidos-fornecedor",
  "pedidos-pendentes",
  "pos-venda",
  "produtos",
  "trocas",
  "vendas",
] as const;

function splitHref(rawHref: string) {
  const queryIndex = rawHref.indexOf("?");
  const hashIndex = rawHref.indexOf("#");

  const endings = [queryIndex, hashIndex]
    .filter((value) => value >= 0);

  const end =
    endings.length > 0
      ? Math.min(...endings)
      : rawHref.length;

  return {
    path: rawHref.slice(0, end),
    suffix: rawHref.slice(end),
  };
}

function canonicalSupplementHref(
  rawHref: string,
) {
  if (
    !rawHref.startsWith("/") ||
    rawHref.startsWith("/suplementos")
  ) {
    return rawHref;
  }

  const { path, suffix } = splitHref(rawHref);

  for (const root of SUPPLEMENT_ROUTE_ROOTS) {
    const legacyRoot = `/${root}`;

    if (
      path === legacyRoot ||
      path.startsWith(`${legacyRoot}/`)
    ) {
      return `/suplementos${path}${suffix}`;
    }
  }

  return rawHref;
}

function supplementNavIsActive(
  href: string,
  pathname: string,
) {
  const { path } = splitHref(href);

  if (path === "/suplementos/vendas") {
    return [
      "/suplementos/vendas",
      "/suplementos/leads",
      "/suplementos/orcamentos",
      "/suplementos/pedidos-pendentes",
    ].some(
      (root) =>
        pathname === root ||
        pathname.startsWith(`${root}/`),
    );
  }

  if (path === "/suplementos/clientes") {
    return [
      "/suplementos/clientes",
      "/suplementos/pos-venda",
      "/suplementos/agenda",
    ].some(
      (root) =>
        pathname === root ||
        pathname.startsWith(`${root}/`),
    );
  }

  if (path === "/suplementos/estoque") {
    return [
      "/suplementos/estoque",
      "/suplementos/movimentacoes",
      "/suplementos/pedidos-fornecedor",
      "/suplementos/fornecedores",
    ].some(
      (root) =>
        pathname === root ||
        pathname.startsWith(`${root}/`),
    );
  }

  return (
    pathname === path ||
    pathname.startsWith(`${path}/`)
  );
}

/**
 * Compatibilidade da fase de migração de URLs.
 *
 * O next.config garante que URLs antigas continuam funcionando.
 * Este componente evita o salto extra nos Links já renderizados,
 * muda o endereço mostrado ao passar o mouse/copiar o link e mantém
 * o estado ativo do menu enquanto o código interno ainda possui
 * alguns hrefs históricos.
 *
 * Quando todos os hrefs do ERP já apontarem diretamente para
 * /suplementos/..., este componente pode ser removido.
 */
export function SupplementCanonicalNavigationUX() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let frame = 0;

    function syncAnchors() {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const anchors = Array.from(
          document.querySelectorAll<HTMLAnchorElement>(
            'a[href^="/"]',
          ),
        );

        for (const anchor of anchors) {
          const original =
            anchor.dataset.v4517LegacyHref ??
            anchor.getAttribute("href") ??
            "";

          const canonical =
            canonicalSupplementHref(original);

          if (canonical !== original) {
            anchor.dataset.v4517LegacyHref =
              original;
            anchor.setAttribute(
              "href",
              canonical,
            );
          }
        }

        if (
          pathname !== "/suplementos" &&
          !pathname.startsWith(
            "/suplementos/",
          )
        ) {
          return;
        }

        const navigationLinks =
          document.querySelectorAll<HTMLAnchorElement>(
            [
              ".sidebar .nav a[href]",
              ".mobile-menu-panel a[href]",
              ".mobile-nav a[href]",
            ].join(","),
          );

        for (const link of navigationLinks) {
          const href =
            link.getAttribute("href") ?? "";

          if (
            href !== "/suplementos" &&
            !href.startsWith(
              "/suplementos/",
            )
          ) {
            continue;
          }

          link.classList.toggle(
            "primary",
            supplementNavIsActive(
              href,
              pathname,
            ),
          );
        }
      });
    }

    function onClickCapture(
      event: MouseEvent,
    ) {
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

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor =
        target.closest<HTMLAnchorElement>(
          "a[href]",
        );

      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        (
          anchor.target &&
          anchor.target !== "_self"
        )
      ) {
        return;
      }

      const legacy =
        anchor.dataset.v4517LegacyHref;

      if (!legacy) return;

      const canonical =
        canonicalSupplementHref(legacy);

      if (
        canonical === legacy ||
        !canonical.startsWith("/")
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      router.push(canonical);
    }

    syncAnchors();

    const observer =
      new MutationObserver(syncAnchors);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "class"],
    });

    document.addEventListener(
      "click",
      onClickCapture,
      true,
    );

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();

      document.removeEventListener(
        "click",
        onClickCapture,
        true,
      );
    };
  }, [pathname, router]);

  return null;
}
