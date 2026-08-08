"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

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

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function currentBalance() {
  for (const card of document.querySelectorAll<HTMLElement>(".stat-card")) {
    const label = card
      .querySelector<HTMLElement>(".stat-head span")
      ?.textContent?.trim();

    if (label !== "Saldo disponível") continue;

    return parseBrl(
      card.querySelector<HTMLElement>(".stat-value")?.textContent ?? "0",
    );
  }

  return 0;
}

function dateLabel(item: HTMLElement) {
  return (
    item
      .querySelector<HTMLElement>(".bank-charge-date strong")
      ?.textContent?.trim() || "Sem data"
  );
}

function itemAmount(item: HTMLElement) {
  return parseBrl(
    item.querySelector<HTMLElement>(".bank-charge-value > strong")
      ?.textContent ?? "0",
  );
}

function isFixedDateList(list: HTMLElement) {
  const panel = list.closest<HTMLElement>("article.panel");
  const title = panel
    ?.querySelector<HTMLElement>(".panel-head h2")
    ?.textContent?.trim();

  return Boolean(title?.startsWith("Vencimentos de "));
}

function buildHeader({
  label,
  total,
  availableBefore,
  firstGroup,
}: {
  label: string;
  total: number;
  availableBefore: number;
  firstGroup: boolean;
}) {
  const header = document.createElement("header");
  header.className = "bank-day-group-head-v4512";

  const main = document.createElement("div");
  main.className = "bank-day-group-title-v4512";

  const eyebrow = document.createElement("span");
  eyebrow.textContent = "VENCIMENTOS DO DIA";

  const title = document.createElement("strong");
  title.textContent = label;

  const count = document.createElement("small");
  count.textContent = "Compromissos agrupados por vencimento";

  main.append(eyebrow, title, count);

  const totalBlock = document.createElement("div");
  totalBlock.className = "bank-day-total-v4512";
  totalBlock.innerHTML = `
    <span>Precisa neste dia</span>
    <strong>${money(total)}</strong>
  `;

  const difference = availableBefore - total;
  const covered = difference >= -0.005;

  const status = document.createElement("div");
  status.className = `bank-day-coverage-v4512 ${
    covered ? "covered" : "short"
  }`;

  const statusLabel = document.createElement("span");
  statusLabel.textContent = firstGroup
    ? `Saldo atual ${money(availableBefore)}`
    : `Saldo projetado ${money(availableBefore)}`;

  const statusValue = document.createElement("strong");
  statusValue.textContent = covered
    ? `Coberto · sobra ${money(Math.max(0, difference))}`
    : `Falta ${money(Math.abs(difference))}`;

  const note = document.createElement("small");
  note.textContent = firstGroup
    ? "Saldo disponível antes destes vencimentos."
    : "Já desconta os vencimentos dos dias anteriores.";

  status.append(statusLabel, statusValue, note);
  header.append(main, totalBlock, status);

  return header;
}

function enhanceFixedDateList(list: HTMLElement, openingBalance: number) {
  if (list.dataset.v4512DailyGrouped === "1") return;

  const items = Array.from(list.children).filter((element) =>
    element.classList.contains("bank-charge-item"),
  ) as HTMLElement[];

  if (!items.length) return;

  list.dataset.v4512DailyGrouped = "1";

  const groups = new Map<string, HTMLElement[]>();

  for (const item of items) {
    const label = dateLabel(item);
    const rows = groups.get(label) ?? [];
    rows.push(item);
    groups.set(label, rows);
  }

  let runningBalance = openingBalance;
  let groupIndex = 0;

  for (const [label, rows] of groups.entries()) {
    const first = rows[0];
    if (!first) continue;

    const total = rows.reduce(
      (sum, row) => sum + itemAmount(row),
      0,
    );

    const header = buildHeader({
      label,
      total,
      availableBefore: runningBalance,
      firstGroup: groupIndex === 0,
    });

    header.dataset.v4512BankGroupHeader = "1";
    list.insertBefore(header, first);

    runningBalance -= total;
    groupIndex += 1;
  }
}

export function BankDailyCommitmentGroupsUX() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/bank") return;

    let frame = 0;

    const scan = () => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const balance = currentBalance();

        document
          .querySelectorAll<HTMLElement>(".bank-charge-list")
          .forEach((list) => {
            if (!isFixedDateList(list)) return;
            enhanceFixedDateList(list, balance);
          });
      });
    };

    scan();

    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
