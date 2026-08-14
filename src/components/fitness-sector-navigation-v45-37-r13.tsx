"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SALES_PREFIXES = [
  "/fitness/vendas",
  "/fitness/orcamentos",
  "/fitness/clientes",
  "/fitness/pos-venda",
  "/fitness/agenda",
  "/fitness/consignacoes",
];

const OPERATION_PREFIXES = [
  "/fitness/estoque",
  "/fitness/produtos",
  "/fitness/pedidos",
  "/fitness/fornecedores",
  "/fitness/movimentacoes",
  "/fitness/pdfs",
  "/fitness/nexus",
  "/fitness/painel",
];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`),
  );
}

function setLabel(
  root: ParentNode,
  href: string,
  label: string,
) {
  root
    .querySelectorAll<HTMLAnchorElement>(
      `a[href="${href}"]`,
    )
    .forEach((anchor) => {
      const labelNode =
        anchor.querySelector<HTMLElement>(
          ".nav-label, span",
        );

      if (
        labelNode &&
        labelNode.textContent !== label
      ) {
        labelNode.textContent = label;
      }
    });
}

function setActive(
  root: ParentNode,
  href: string,
  active: boolean,
) {
  root
    .querySelectorAll<HTMLAnchorElement>(
      `a[href="${href}"]`,
    )
    .forEach((anchor) => {
      anchor.classList.toggle("primary", active);
    });
}

export function FitnessSectorNavigationV4537R13() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/fitness")) {
      return;
    }

    let frame = 0;
    let disposed = false;

    function apply() {
      frame = 0;
      if (disposed) return;

      const shell =
        document.querySelector<HTMLElement>(
          ".app-shell.theme-fitness",
        );

      if (shell) {
        setLabel(
          shell,
          "/fitness/vendas",
          "Setor de Vendas",
        );
        setLabel(
          shell,
          "/fitness/estoque",
          "Setor Operacional",
        );

        const salesActive =
          startsWithAny(pathname, SALES_PREFIXES);
        const operationActive =
          startsWithAny(
            pathname,
            OPERATION_PREFIXES,
          ) || pathname === "/fitness";

        setActive(
          shell,
          "/fitness/vendas",
          salesActive,
        );
        setActive(
          shell,
          "/fitness/estoque",
          operationActive,
        );

        const newOrder =
          shell.querySelector<HTMLElement>(
            '.topbar a[href="/fitness/pedidos/novo"]',
          );
        const newSale =
          shell.querySelector<HTMLElement>(
            '.topbar a[href="/fitness/vendas/nova"]',
          );

        if (newOrder) {
          newOrder.style.display = salesActive ? "none" : "";
        }
        if (newSale) {
          newSale.style.display = operationActive ? "none" : "";
        }

        const mobileActions =
          shell.querySelector<HTMLElement>(
            ".mobile-action-nav",
          );

        if (mobileActions) {
          const orderShortcut =
            mobileActions.querySelector<HTMLAnchorElement>(
              'a[href="/fitness/pedidos/novo"]',
            );
          const productsShortcut =
            mobileActions.querySelector<HTMLAnchorElement>(
              'a[href="/fitness/produtos"]',
            );

          if (orderShortcut) {
            orderShortcut.setAttribute(
              "href",
              "/fitness/vendas",
            );
            const label =
              orderShortcut.querySelector<HTMLElement>("span");
            if (label && label.textContent !== "Vendas") {
              label.textContent = "Vendas";
            }
          }

          if (productsShortcut) {
            productsShortcut.setAttribute(
              "href",
              "/fitness/estoque",
            );
            const label =
              productsShortcut.querySelector<HTMLElement>("span");
            if (label && label.textContent !== "Operação") {
              label.textContent = "Operação";
            }
          }
        }
      }

      if (pathname === "/fitness/inicio") {
        const gateway =
          document.querySelector<HTMLElement>(
            ".tone-fitness .v4521-entry-menu",
          );

        if (gateway) {
          const buttons = Array.from(
            gateway.querySelectorAll<HTMLButtonElement>(
              ":scope > button",
            ),
          );

          const salesButton = buttons[2];
          const operationButton = buttons[4];

          if (salesButton) {
            const strong =
              salesButton.querySelector<HTMLElement>(
                "strong",
              );
            const small =
              salesButton.querySelector<HTMLElement>(
                "small",
              );

            if (
              strong &&
              strong.textContent !== "Setor de Vendas"
            ) {
              strong.textContent =
                "Setor de Vendas";
            }
            if (
              small &&
              small.textContent !==
                "Interesses, orçamentos, vendas e pós-venda"
            ) {
              small.textContent =
                "Interesses, orçamentos, vendas e pós-venda";
            }
          }

          if (operationButton) {
            const strong =
              operationButton.querySelector<HTMLElement>(
                "strong",
              );
            const small =
              operationButton.querySelector<HTMLElement>(
                "small",
              );

            if (
              strong &&
              strong.textContent !== "Setor Operacional"
            ) {
              strong.textContent =
                "Setor Operacional";
            }
            if (
              small &&
              small.textContent !==
                "Estoque, mix, compras e fornecedores"
            ) {
              small.textContent =
                "Estoque, mix, compras e fornecedores";
            }
          }
        }
      }
    }

    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    }

    apply();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      disposed = true;
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
