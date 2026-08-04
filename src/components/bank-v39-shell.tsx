"use client";

import Link from "next/link";
import {
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  HandCoins,
  History,
  ShoppingBag,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type Undo = () => void;

type NoteSummary = {
  count: number;
  totalRemaining: number;
};

type MonthSummary = {
  fixedExpected: number;
  fixedReceived: number;
  fixedPending: number;
  fixedPendingCount: number;
  fixedReceivedCount: number;
  operationsTotal: number;
  operationsCount: number;
  manualTotal: number;
  manualCount: number;
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

function setTrailingText(
  element: HTMLElement | null,
  text: string,
  undo: Undo[],
) {
  if (!element) return;

  const textNode = Array.from(element.childNodes).find(
    (node) =>
      node.nodeType === Node.TEXT_NODE &&
      Boolean(node.textContent?.trim()),
  );

  if (!textNode) return;

  const previous = textNode.textContent;
  textNode.textContent = ` ${text}`;

  undo.push(() => {
    textNode.textContent = previous;
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

function findStatCard(label: string) {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".stat-card"),
  ).find((card) => {
    const text = card
      .querySelector<HTMLElement>(".stat-head > span:first-child")
      ?.textContent?.trim()
      .toLowerCase();

    return text?.includes(label.toLowerCase());
  });
}

export function BankV39Shell() {
  const pathname = usePathname();

  const [statsHost, setStatsHost] = useState<HTMLElement | null>(null);
  const [homeReceivableHost, setHomeReceivableHost] =
    useState<HTMLElement | null>(null);
  const [incomeFixedHost, setIncomeFixedHost] =
    useState<HTMLElement | null>(null);
  const [incomeStatsHost, setIncomeStatsHost] =
    useState<HTMLElement | null>(null);

  const [noteSummary, setNoteSummary] = useState<NoteSummary | null>(null);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);

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
      for (const card of Array.from(
        document.querySelectorAll<HTMLElement>(".stat-card"),
      )) {
        const label = card.querySelector<HTMLElement>(
          ".stat-head > span:first-child",
        );
        const note = card.querySelector<HTMLElement>(".stat-note");
        const currentLabel = label?.textContent?.trim();

        if (currentLabel === "Projeção até o fim do mês") {
          setText(label, "Projeção confirmada", undo);
          setText(
            note,
            "Saldo + valores a receber − compromissos obrigatórios. Notinhas ficam fora.",
            undo,
          );
        }

        if (currentLabel === "A pagar até o fim do mês" && note) {
          const original = note.textContent?.trim() ?? "";
          if (original && !original.includes("Notinhas")) {
            setText(note, `${original} Notinhas ficam separadas.`, undo);
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

    if (pathname === "/bank/entradas") {
      const manualCard = findStatCard("A receber pendente");
      const fixedCard = findStatCard("Entradas mensais previstas");

      setText(
        manualCard?.querySelector(".stat-head > span:first-child") ?? null,
        "Avulsos a receber",
        undo,
      );
      setText(
        manualCard?.querySelector(".stat-note") ?? null,
        "Valores lançados manualmente, fora das vendas das operações.",
        undo,
      );

      setText(
        fixedCard?.querySelector(".stat-head > span:first-child") ?? null,
        "Entradas fixas do mês",
        undo,
      );
    }

    if (pathname === "/bank/faturas") {
      const launchLink = document.querySelector<HTMLAnchorElement>(
        'a[href="/bank/faturas?acao=atualizar"]',
      );

      if (launchLink) {
        setHref(launchLink, "/bank/faturas/rapido", undo);
        setTrailingText(launchLink, "Lançar faturas", undo);
      }

      const advancedPanel =
        document.querySelector<HTMLElement>(".bank-invoice-update-panel");

      if (advancedPanel) {
        setText(
          advancedPanel.querySelector(".panel-head h2"),
          "Edição avançada de faturas",
          undo,
        );
        setText(
          advancedPanel.querySelector(".panel-head p"),
          "Use esta tela somente quando precisar editar meses futuros ou vários meses do mesmo cartão.",
          undo,
        );
      }
    }

    return () => {
      for (const restore of undo.reverse()) restore();
    };
  }, [pathname]);

  useEffect(() => {
    if (!pathname.startsWith("/bank")) return;

    const controller = new AbortController();

    if (pathname === "/bank") {
      void fetch("/api/bank/notes-summary", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) =>
          response.ok ? ((await response.json()) as NoteSummary) : null,
        )
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
    }

    if (pathname === "/bank" || pathname === "/bank/entradas") {
      void fetch("/api/bank/month-summary", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) =>
          response.ok ? ((await response.json()) as MonthSummary) : null,
        )
        .then((payload) => {
          if (!controller.signal.aborted && payload) {
            setMonthSummary({
              fixedExpected: Number(payload.fixedExpected ?? 0),
              fixedReceived: Number(payload.fixedReceived ?? 0),
              fixedPending: Number(payload.fixedPending ?? 0),
              fixedPendingCount: Number(payload.fixedPendingCount ?? 0),
              fixedReceivedCount: Number(payload.fixedReceivedCount ?? 0),
              operationsTotal: Number(payload.operationsTotal ?? 0),
              operationsCount: Number(payload.operationsCount ?? 0),
              manualTotal: Number(payload.manualTotal ?? 0),
              manualCount: Number(payload.manualCount ?? 0),
            });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setMonthSummary(null);
        });
    }

    return () => controller.abort();
  }, [pathname]);

  useEffect(() => {
    const created: HTMLElement[] = [];
    const restored: Array<() => void> = [];

    setStatsHost(null);
    setHomeReceivableHost(null);
    setIncomeFixedHost(null);
    setIncomeStatsHost(null);

    if (pathname === "/bank") {
      const stats = document.querySelector<HTMLElement>(
        ".bank-dashboard .bank-stats-grid",
      );

      if (stats) {
        stats.classList.add("bank-v39-stats-with-notes");
        setStatsHost(stats);
        restored.push(() =>
          stats.classList.remove("bank-v39-stats-with-notes"),
        );
      }

      const receivableCard = findStatCard("A receber neste mês");
      const note = receivableCard?.querySelector<HTMLElement>(".stat-note");

      if (receivableCard) {
        if (note) {
          const previous = note.style.display;
          note.style.display = "none";
          restored.push(() => {
            note.style.display = previous;
          });
        }

        const host = document.createElement("div");
        host.dataset.bankReceivableBreakdown = "home";
        receivableCard.append(host);
        created.push(host);
        setHomeReceivableHost(host);
      }
    }

    if (pathname === "/bank/entradas") {
      const stats = document.querySelector<HTMLElement>(".bank-income-stats");
      if (stats) setIncomeStatsHost(stats);

      const fixedCard = findStatCard("Entradas fixas do mês");
      const note = fixedCard?.querySelector<HTMLElement>(".stat-note");

      if (fixedCard) {
        if (note) {
          const previous = note.style.display;
          note.style.display = "none";
          restored.push(() => {
            note.style.display = previous;
          });
        }

        const host = document.createElement("div");
        host.dataset.bankReceivableBreakdown = "fixed";
        fixedCard.append(host);
        created.push(host);
        setIncomeFixedHost(host);
      }
    }

    return () => {
      for (const restore of restored.reverse()) restore();
      for (const host of created) host.remove();

      setStatsHost(null);
      setHomeReceivableHost(null);
      setIncomeFixedHost(null);
      setIncomeStatsHost(null);
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

      {homeReceivableHost &&
        monthSummary &&
        createPortal(
          <div className="bank-receivable-breakdown">
            <div>
              <span>Fixos a receber</span>
              <strong>{currency(monthSummary.fixedPending)}</strong>
            </div>
            <div>
              <span>Operações</span>
              <strong>{currency(monthSummary.operationsTotal)}</strong>
            </div>
            {monthSummary.manualTotal > 0 && (
              <div>
                <span>Avulsos</span>
                <strong>{currency(monthSummary.manualTotal)}</strong>
              </div>
            )}
          </div>,
          homeReceivableHost,
        )}

      {incomeFixedHost &&
        monthSummary &&
        createPortal(
          <div className="bank-receivable-breakdown fixed-breakdown">
            <div>
              <span>A receber</span>
              <strong>{currency(monthSummary.fixedPending)}</strong>
            </div>
            <div>
              <span>Já recebido</span>
              <strong>{currency(monthSummary.fixedReceived)}</strong>
            </div>
          </div>,
          incomeFixedHost,
        )}

      {incomeStatsHost &&
        monthSummary &&
        createPortal(
          <article className="stat-card bank-operation-receivable-card">
            <div className="stat-head">
              <span>Operações a receber</span>
              <span className="stat-icon">
                <ShoppingBag size={17} />
              </span>
            </div>
            <div className="stat-value">
              {currency(monthSummary.operationsTotal)}
            </div>
            <div className="stat-note">
              {monthSummary.operationsCount} venda(s) da Suplementos/Fitness
              aguardando recebimento neste mês.
            </div>
          </article>,
          incomeStatsHost,
        )}

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
              {noteSummary.count} aberta(s) · fora da projeção. Pague somente
              quando houver sobra.
            </div>
          </Link>,
          statsHost,
        )}
    </>
  );
}
