"use client";

import Link from "next/link";
import { Building2, ChartNoAxesCombined, CircleDollarSign, History } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type Undo = () => void;

function setText(element: Element | null, text: string, undo: Undo[]) {
  if (!element) return;
  const previous = element.textContent;
  if (previous === text) return;
  element.textContent = text;
  undo.push(() => {
    element.textContent = previous;
  });
}

function setDisplay(element: HTMLElement | null, display: string, undo: Undo[]) {
  if (!element) return;
  const previous = element.style.display;
  element.style.display = display;
  undo.push(() => {
    element.style.display = previous;
  });
}

function setHref(element: HTMLAnchorElement | null, href: string, undo: Undo[]) {
  if (!element) return;
  const previous = element.getAttribute("href");
  element.setAttribute("href", href);
  undo.push(() => {
    if (previous === null) element.removeAttribute("href");
    else element.setAttribute("href", previous);
  });
}

function pathnameOf(anchor: HTMLAnchorElement) {
  try {
    return new URL(anchor.href, window.location.origin).pathname;
  } catch {
    return anchor.getAttribute("href") ?? "";
  }
}

export function BankV39Shell() {
  const pathname = usePathname();

  useEffect(() => {
    const undo: Undo[] = [];

    const hidden = new Set([
      "/bank/atualizar",
      "/bank/operacoes",
      "/bank/cobrancas",
      "/bank/mensalidades",
      "/bank/visao-anual",
      "/bank/fechamento",
    ]);

    const navAnchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        ".sidebar .nav-link, .mobile-menu-panel .mobile-menu-link",
      ),
    );

    for (const anchor of navAnchors) {
      const href = pathnameOf(anchor);
      if (!href.startsWith("/bank")) continue;

      if (hidden.has(href)) {
        setDisplay(anchor, "none", undo);
        continue;
      }

      const label = anchor.querySelector(".nav-label") ?? anchor.querySelector("span");

      if (href === "/bank/entradas") {
        setText(label, "Entradas", undo);
      } else if (href === "/bank/emprestimos") {
        setText(label, "Empréstimos", undo);
      } else if (href === "/bank/contas") {
        setHref(anchor, "/bank/organizar", undo);
        setText(label, "Organizar", undo);
      }
    }

    const oldMobileNav = document.querySelector<HTMLElement>(".mobile-action-nav");
    if (oldMobileNav) setDisplay(oldMobileNav, "none", undo);

    if (pathname === "/bank") {
      const cards = Array.from(document.querySelectorAll<HTMLElement>(".stat-card"));
      for (const card of cards) {
        const label = card.querySelector<HTMLElement>(".stat-head > span:first-child");
        if (label?.textContent?.trim() === "Projeção até o fim do mês") {
          setText(label, "Projeção confirmada até o fim do mês", undo);
          setText(
            card.querySelector<HTMLElement>(".stat-note"),
            "Saldo + valores reais a receber − compromissos abertos. Entradas mensais ainda não confirmadas ficam fora deste número.",
            undo,
          );
        }
      }

      for (const heading of Array.from(document.querySelectorAll<HTMLHeadingElement>("h2"))) {
        if (heading.textContent?.trim() === "Projeção do próximo mês") {
          setDisplay(heading.closest<HTMLElement>("article.panel"), "none", undo);
        }
      }

      setDisplay(document.querySelector<HTMLElement>(".operation-investment-panel"), "none", undo);

      for (const anchor of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/bank/emprestimos?ajustar="]'))) {
        const current = anchor.getAttribute("href") ?? "";
        setHref(anchor, current.replace("?ajustar=", "?detalhes="), undo);
      }

      for (const anchor of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href="/bank/fechamento"]'))) {
        const strong = anchor.querySelector("strong");
        if (strong?.textContent?.trim() !== "Fechar o mês") continue;
        setHref(anchor, "/bank/organizar", undo);
        setText(strong, "Organizar Bank", undo);
        setText(
          anchor.querySelector("span"),
          "Mensalidades, contas, histórico e planejamento.",
          undo,
        );
      }
    }

    return () => {
      for (const restore of undo.reverse()) restore();
    };
  }, [pathname]);

  const items = [
    { href: "/bank", label: "Mês", icon: ChartNoAxesCombined },
    { href: "/bank/entradas", label: "Entradas", icon: CircleDollarSign },
    { href: "/bank/faturas", label: "Faturas", icon: History },
    { href: "/bank/organizar", label: "Mais", icon: Building2 },
  ];

  return (
    <nav className="bank-v39-mobile-nav" aria-label="Atalhos do Candinho Bank">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/bank" ? pathname === "/bank" : pathname.startsWith(href);
        return (
          <Link className={active ? "active" : ""} href={href} key={href}>
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
