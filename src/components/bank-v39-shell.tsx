"use client";

import Link from "next/link";
import {
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  HandCoins,
  History,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type Undo = () => void;

type NoteSummary = {
  count: number;
  totalRemaining: number;
};

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

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

export function BankV39Shell() {
  const pathname = usePathname();
  const [statsHost, setStatsHost] = useState<HTMLElement | null>(null);
  const [noteSummary, setNoteSummary] = useState<NoteSummary | null>(null);

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

      const label =
        anchor.querySelector(".nav-label") ?? anchor.querySelector("span");

      if (href === "/bank/entradas") {
        setText(label, "Entradas", undo);
      } else if (href === "/bank/emprestimos") {
        setText(label, "Empréstimos", undo);
      } else if (href === "/bank/contas") {
        setHref(anchor, "/bank/organizar", undo);
        setText(label, "Organizar", undo);
      }
    }

    const oldMobileNav =
      document.querySelector<HTMLElement>(".mobile-action-nav");

    if (oldMobileNav) setDisplay(oldMobileNav, "none", undo);

    if (pathname === "/bank") {
      const cards = Array.from(
        document.querySelectorAll<HTMLElement>(".stat-card"),
      );

      for (const card of cards) {
        const label = card.querySelector<HTMLElement>(
          ".stat-head > span:first-child",
        );
        const note = card.querySelector<HTMLElement>(".stat-note");
        const currentLabel = label?.textContent?.trim();

        if (currentLabel === "Projeção até o fim do mês") {
          setText(label, "Projeção confirmada até o fim do mês", undo);
          setText(
            note,
            "Saldo + entradas ainda a receber − compromissos obrigatórios. Notinhas ficam fora e só entram quando você decidir pagar.",
            undo,
          );
        }

        if (currentLabel === "A receber neste mês") {
          setText(
            note,
            "Inclui valores pontuais, salário, vale e outras entradas mensais ainda não recebidas.",
            undo,
          );
        }

        if (currentLabel === "A pagar até o fim do mês" && note) {
          const original = note.textContent?.trim() ?? "";

          if (original && !original.includes("Notinhas")) {
            setText(
              note,
              `${original} Notinhas ficam separadas.`,
              undo,
            );
          }
        }
      }

      for (const heading of Array.from(
        document.querySelectorAll<HTMLHeadingElement>("h2"),
      )) {
        if (heading.textContent?.trim() === "Projeção do próximo mês") {
          setDisplay(
            heading.closest<HTMLElement>("article.panel"),
            "none",
            undo,
          );
        }
      }

      setDisplay(
        document.querySelector<HTMLElement>(".operation-investment-panel"),
        "none",
        undo,
      );

      for (const anchor of Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          'a[href^="/bank/emprestimos?ajustar="]',
        ),
      )) {
        const current = anchor.getAttribute("href") ?? "";
        setHref(anchor, current.replace("?ajustar=", "?detalhes="), undo);
      }

      for (const anchor of Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          'a[href="/bank/fechamento"]',
        ),
      )) {
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

  useEffect(() => {
    if (pathname !== "/bank") {
      setStatsHost(null);
      setNoteSummary(null);
      return;
    }

    const host = document.querySelector<HTMLElement>(
      ".bank-dashboard .bank-stats-grid",
    );

    if (!host) return;

    host.classList.add("bank-v39-stats-with-notes");
    setStatsHost(host);

    const controller = new AbortController();

    void fetch("/api/bank/notes-summary", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;

        return (await response.json()) as NoteSummary;
      })
      .then((payload) => {
        if (!controller.signal.aborted && payload) {
          setNoteSummary({
            count: Number(payload.count ?? 0),
            totalRemaining: Number(payload.totalRemaining ?? 0),
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setNoteSummary(null);
      });

    return () => {
      controller.abort();
      host.classList.remove("bank-v39-stats-with-notes");
      setStatsHost(null);
    };
  }, [pathname]);

  const items = [
    { href: "/bank", label: "Mês", icon: ChartNoAxesCombined },
    { href: "/bank/entradas", label: "Entradas", icon: CircleDollarSign },
    { href: "/bank/faturas", label: "Faturas", icon: History },
    { href: "/bank/organizar", label: "Mais", icon: Building2 },
  ];

  return (
    <>
      <nav
        className="bank-v39-mobile-nav"
        aria-label="Atalhos do Candinho Bank"
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/bank"
              ? pathname === "/bank"
              : pathname.startsWith(href);

          return (
            <Link
              className={active ? "active" : ""}
              href={href}
              key={href}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {statsHost &&
        noteSummary &&
        noteSummary.count > 0 &&
        createPortal(
          <Link
            href="/bank/emprestimos"
            className="stat-card bank-note-projection-card"
            aria-label="Abrir notinhas pendentes"
          >
            <div className="stat-head">
              <span>Notinhas pendentes</span>
              <span className="stat-icon">
                <HandCoins size={17} />
              </span>
            </div>

            <div className="stat-value">
              {currency(noteSummary.totalRemaining)}
            </div>

            <div className="stat-note">
              {noteSummary.count} aberta(s) · fora da projeção confirmada.
              Pague somente quando houver sobra.
            </div>
          </Link>,
          statsHost,
        )}

      <style>{`
        .bank-note-projection-card {
          text-decoration: none;
          color: inherit;
          border-color: rgba(240, 168, 79, .28);
        }

        .bank-note-projection-card:hover {
          border-color: rgba(240, 168, 79, .48);
        }

        @media (min-width: 1081px) {
          .bank-dashboard .bank-stats-grid.bank-v39-stats-with-notes {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
        }
      `}</style>
    </>
  );
}
