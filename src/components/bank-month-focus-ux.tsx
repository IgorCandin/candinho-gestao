"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Plus,
  TrendingUp,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { markBankCommitmentAsPaid } from "@/app/(app)/bank/actions";

type RecentCommitment = {
  id: string;
  title: string;
  amount: number;
  dueDate: string | null;
  origin: string | null;
  kind: string;
  href: string;
};

type DebtInfo = {
  id: string;
  debtType: string;
  monthlyAmount: number | null;
};

type FocusPayload = {
  today: string;
  tomorrow: string;
  referenceMonth: string;
  mandatoryCommitments: number;
  recent: RecentCommitment[];
  laterCommitmentCount: number;
  debts: DebtInfo[];
  income: {
    fixedPendingTotal: number;
    fixedPendingCount: number;
    fixedReceivedCount: number;
    operationsTotal: number;
    operationsCount: number;
    manualPendingTotal: number;
    manualPendingCount: number;
    fixedPending: Array<{
      id: string;
      name: string;
      payerName: string;
      amount: number;
      expectedDay: number | null;
    }>;
    manualPending: Array<{
      id: string;
      title: string;
      payerName: string;
      amount: number;
      dueDate: string;
    }>;
  };
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function date(value: string | null) {
  if (!value) return "Sem data";

  const source = new Date(`${value.slice(0, 10)}T12:00:00Z`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(source);
}

function parseBrl(value: string) {
  const normalized = value
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function findPanel(label: string, startsWith = false) {
  return Array.from(
    document.querySelectorAll<HTMLElement>("article.panel"),
  ).find((panel) => {
    const text =
      panel.querySelector<HTMLElement>(".panel-head h2")?.textContent?.trim() ??
      "";

    return startsWith ? text.startsWith(label) : text === label;
  }) ?? null;
}

function findStatCard(label: string) {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      ".bank-dashboard .bank-stats-grid > .stat-card",
    ),
  ).find((card) => {
    const text =
      card
        .querySelector<HTMLElement>(".stat-head > span:first-child")
        ?.textContent?.trim() ?? "";

    return text === label || text.includes(label);
  }) ?? null;
}

function debtIdFromRow(row: HTMLElement) {
  const anchor = row.querySelector<HTMLAnchorElement>(
    'a[href*="/bank/emprestimos?"]',
  );
  if (!anchor) return null;

  try {
    const url = new URL(anchor.href, window.location.origin);
    return (
      url.searchParams.get("detalhes") ??
      url.searchParams.get("ajustar")
    );
  } catch {
    return null;
  }
}

export function BankMonthFocusUX() {
  const pathname = usePathname();
  const [payload, setPayload] = useState<FocusPayload | null>(null);
  const [recentHost, setRecentHost] = useState<HTMLElement | null>(null);
  const [incomeHost, setIncomeHost] = useState<HTMLElement | null>(null);

  const debtMap = useMemo(
    () => new Map((payload?.debts ?? []).map((row) => [row.id, row])),
    [payload?.debts],
  );

  useEffect(() => {
    if (pathname !== "/bank") {
      return;
    }

    const controller = new AbortController();

    void fetch("/api/bank/month-focus", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as FocusPayload;
      })
      .then((data) => {
        if (!controller.signal.aborted && data) {
          setPayload(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setPayload(null);
      });

    return () => controller.abort();
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/bank" || !payload) return;

    let frame = 0;
    const created: HTMLElement[] = [];

    const apply = () => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const dashboard =
          document.querySelector<HTMLElement>(".bank-dashboard");
        if (!dashboard) return;

        const balanceCard = findStatCard("Saldo disponível");
        const payableCard = findStatCard("A pagar até o fim do mês");
        const projectionCard =
          findStatCard("Projeção confirmada") ??
          findStatCard("Projeção até o fim do mês");
        const receivableCard = findStatCard("Total a receber");

        if (balanceCard) balanceCard.style.order = "1";
        if (payableCard) payableCard.style.order = "2";
        if (projectionCard) projectionCard.style.order = "3";
        if (receivableCard) receivableCard.style.order = "4";

        const noteCard =
          document.querySelector<HTMLElement>(".bank-note-projection-card");
        if (noteCard) noteCard.style.order = "5";

        if (balanceCard && projectionCard) {
          const balance = parseBrl(
            balanceCard.querySelector<HTMLElement>(".stat-value")?.textContent ??
              "0",
          );
          const projected = balance - payload.mandatoryCommitments;

          const label = projectionCard.querySelector<HTMLElement>(
            ".stat-head > span:first-child",
          );
          const value =
            projectionCard.querySelector<HTMLElement>(".stat-value");
          const note =
            projectionCard.querySelector<HTMLElement>(".stat-note");

          if (label) label.textContent = "Projeção confirmada";
          if (value) value.textContent = money(projected);
          if (note) {
            note.textContent =
              "Saldo atual − compromissos obrigatórios. Entradas e notinhas ficam fora.";
          }

          projectionCard.classList.toggle("negative", projected < 0);
          projectionCard.classList.toggle("positive", projected >= 0);
        }

        const debtPanel = findPanel("Empréstimos e Notinhas");
        const duePanel = findPanel("Vencimentos de ", true);

        if (debtPanel && duePanel) {
          if (debtPanel.compareDocumentPosition(duePanel) & Node.DOCUMENT_POSITION_PRECEDING) {
            dashboard.insertBefore(debtPanel, duePanel);
          }

          let host =
            document.querySelector<HTMLElement>(
              '[data-v4513-bank-recent-host="true"]',
            );

          if (!host) {
            host = document.createElement("div");
            host.dataset.v4513BankRecentHost = "true";
            dashboard.insertBefore(host, debtPanel);
            created.push(host);
          }

          setRecentHost(host);

          let entries =
            document.querySelector<HTMLElement>(
              '[data-v4513-bank-income-host="true"]',
            );

          if (!entries) {
            entries = document.createElement("div");
            entries.dataset.v4513BankIncomeHost = "true";
            duePanel.insertAdjacentElement("afterend", entries);
            created.push(entries);
          }

          setIncomeHost(entries);

          if (payload.laterCommitmentCount === 0) {
            duePanel.style.display = "none";
          } else {
            duePanel.style.display = "";
          }
        }

        if (debtPanel) {
          for (const row of Array.from(
            debtPanel.querySelectorAll<HTMLElement>(
              ".bank-income-list-item",
            ),
          )) {
            if (row.querySelector(".bank-debt-installment-v4513")) continue;

            const id = debtIdFromRow(row);
            const debt = id ? debtMap.get(id) : null;
            if (!debt) continue;

            const identity = row.querySelector<HTMLElement>("div");
            if (!identity) continue;

            const detail = document.createElement("small");
            detail.className = "bank-debt-installment-v4513";

            detail.textContent =
              debt.debtType === "loan" &&
              debt.monthlyAmount !== null &&
              debt.monthlyAmount > 0
                ? `Parcela ${money(debt.monthlyAmount)}`
                : "Sem valor de parcela fixa";

            identity.append(detail);
          }
        }
      });
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();

      for (const element of created) {
        element.remove();
      }

      setRecentHost(null);
      setIncomeHost(null);
    };
  }, [debtMap, pathname, payload]);

  if (pathname !== "/bank" || !payload) return null;

  const totalIncoming =
    payload.income.fixedPendingTotal +
    payload.income.operationsTotal +
    payload.income.manualPendingTotal;

  return (
    <>
      {recentHost &&
        createPortal(
          <article className="panel bank-recent-panel-v4513">
            <div className="panel-head">
              <div>
                <h2>Próximos vencimentos</h2>
                <p>Hoje e amanhã, antes do restante do mês.</p>
              </div>
              <span className="badge gold">
                {payload.recent.length} item(ns)
              </span>
            </div>

            <div className="panel-body">
              {payload.recent.length === 0 ? (
                <div className="bank-empty-state">
                  Nada vence hoje ou amanhã.
                </div>
              ) : (
                <div className="bank-recent-list-v4513">
                  {payload.recent.map((item) => (
                    <div
                      className="bank-recent-item-v4513"
                      key={item.id}
                    >
                      <span className="bank-recent-date-v4513">
                        <CalendarClock size={16} />
                        {date(item.dueDate)}
                      </span>

                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.origin ?? "Geral"}
                        </small>
                      </span>

                      <b>{money(item.amount)}</b>
                      <div className="bank-recent-actions-v4513">
                        <form action={markBankCommitmentAsPaid}>
                          <input type="hidden" name="commitment_key" value={item.id} />
                          <input type="hidden" name="reference_month" value={payload.referenceMonth} />
                          <button className="button gold compact-button" type="submit">
                            <CheckCircle2 size={14} />
                            Paguei
                          </button>
                        </form>
                        <Link
                          className="icon-link"
                          href={item.href}
                          aria-label={`Abrir detalhes de ${item.title}`}
                        >
                          <ArrowRight size={15} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>,
          recentHost,
        )}

      {incomeHost &&
        createPortal(
          <article className="panel bank-month-income-v4513">
            <div className="panel-head">
              <div>
                <h2>Entradas deste mês</h2>
                <p>
                  A antiga aba Entradas fica concentrada aqui. Abra o editor
                  só quando precisar cadastrar ou detalhar.
                </p>
              </div>

              <span className="badge green">{money(totalIncoming)}</span>
            </div>

            <div className="panel-body">
              <div className="bank-income-summary-v4513">
                <div>
                  <span>Fixos a receber</span>
                  <strong>{money(payload.income.fixedPendingTotal)}</strong>
                  <small>
                    {payload.income.fixedPendingCount} aguardando ·{" "}
                    {payload.income.fixedReceivedCount} recebido(s)
                  </small>
                </div>

                <div>
                  <span>Operações</span>
                  <strong>{money(payload.income.operationsTotal)}</strong>
                  <small>
                    {payload.income.operationsCount} venda(s) a receber
                  </small>
                </div>

                <div>
                  <span>Avulsos</span>
                  <strong>{money(payload.income.manualPendingTotal)}</strong>
                  <small>
                    {payload.income.manualPendingCount} conta(s) a receber
                  </small>
                </div>
              </div>

              {(payload.income.fixedPending.length > 0 ||
                payload.income.manualPending.length > 0) && (
                <div className="bank-income-focus-lists-v4513">
                  {payload.income.fixedPending.length > 0 && (
                    <div>
                      <span className="bank-income-list-title-v4513">
                        Entradas fixas aguardando
                      </span>

                      {payload.income.fixedPending.map((item) => (
                        <div
                          className="bank-income-focus-row-v4513"
                          key={item.id}
                        >
                          <span>
                            <strong>{item.name}</strong>
                            <small>
                              {item.payerName}
                              {item.expectedDay
                                ? ` · esperado dia ${item.expectedDay}`
                                : ""}
                            </small>
                          </span>
                          <b>{money(item.amount)}</b>
                        </div>
                      ))}
                    </div>
                  )}

                  {payload.income.manualPending.length > 0 && (
                    <div>
                      <span className="bank-income-list-title-v4513">
                        Avulsos a receber
                      </span>

                      {payload.income.manualPending.map((item) => (
                        <Link
                          className="bank-income-focus-row-v4513"
                          href={`/bank/entradas?receber=${encodeURIComponent(
                            item.id,
                          )}`}
                          key={item.id}
                        >
                          <span>
                            <strong>{item.title}</strong>
                            <small>
                              {item.payerName} · {date(item.dueDate)}
                            </small>
                          </span>
                          <b>{money(item.amount)}</b>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bank-income-actions-v4513">
                <Link
                  className="button ghost"
                  href="/bank/entradas?acao=nova-prevista"
                >
                  <TrendingUp size={15} />
                  Nova entrada fixa
                </Link>

                <Link
                  className="button ghost"
                  href="/bank/entradas?acao=nova-receber"
                >
                  <Plus size={15} />
                  Nova conta a receber
                </Link>

                <Link className="button gold" href="/bank/entradas">
                  <CircleDollarSign size={15} />
                  Gerenciar recebimentos
                </Link>
              </div>
            </div>
          </article>,
          incomeHost,
        )}
    </>
  );
}
