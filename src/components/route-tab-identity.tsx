"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const FAVICON_VERSION = "2026.08.24.49";

type RouteIdentity = {
  label: string;
  icon: string;
};

function resolveIdentity(pathname: string): RouteIdentity {
  if (pathname.startsWith("/bank")) {
    return { label: "Candinho Bank", icon: "/favicons/cb.png" };
  }

  if (pathname.startsWith("/fitness")) {
    return { label: "Candinho Fitness", icon: "/favicons/cf.png" };
  }

  if (
    pathname.startsWith("/central") ||
    pathname.startsWith("/marketing") ||
    pathname.startsWith("/nexus")
  ) {
    return { label: "Candinho Central", icon: "/favicons/cce.png" };
  }

  if (
    pathname.startsWith("/parceiro") ||
    pathname.startsWith("/suplementos") ||
    pathname.startsWith("/vendas") ||
    pathname.startsWith("/clientes") ||
    pathname.startsWith("/leads") ||
    pathname.startsWith("/produtos") ||
    pathname.startsWith("/estoque") ||
    pathname.startsWith("/compras") ||
    pathname.startsWith("/fornecedores") ||
    pathname.startsWith("/saidas") ||
    pathname.startsWith("/operacao") ||
    pathname.startsWith("/agenda")
  ) {
    return { label: "Candinho Suplementos", icon: "/favicons/cs.png" };
  }

  return { label: "Candinho Company", icon: "/favicons/cc.png" };
}

function ensureIconLink(
  id: string,
  rel: "icon" | "shortcut icon",
): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>(`#${id}`);

  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = rel;
    document.head.appendChild(link);
  }

  link.type = "image/png";
  return link;
}

function applyIdentity(identity: RouteIdentity) {
  document.title = identity.label;

  const href = `${identity.icon}?v=${FAVICON_VERSION}`;
  const absoluteHref = new URL(href, window.location.origin).href;

  const main = ensureIconLink("candinho-route-favicon", "icon");
  if (main.href !== absoluteHref) {
    main.href = href;
  }

  const shortcut = ensureIconLink(
    "candinho-route-shortcut-favicon",
    "shortcut icon",
  );
  if (shortcut.href !== absoluteHref) {
    shortcut.href = href;
  }

  document.head
    .querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"]',
    )
    .forEach((link) => {
      if (link.href !== absoluteHref) {
        link.href = href;
      }
      if (link.type !== "image/png") {
        link.type = "image/png";
      }
    });
}

export function RouteTabIdentity() {
  const pathname = usePathname();

  useEffect(() => {
    const identity = resolveIdentity(pathname);
    let applying = false;

    const refresh = () => {
      if (applying) return;
      applying = true;
      try {
        applyIdentity(identity);
      } finally {
        applying = false;
      }
    };

    refresh();

    const observer = new MutationObserver(() => {
      queueMicrotask(refresh);
    });

    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "rel"],
    });

    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      observer.disconnect();
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname]);

  return null;
}
