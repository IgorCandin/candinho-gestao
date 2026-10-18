export type PlanningIncome = { id: string; title: string; amount: number; state: "pending" | "received"; kind: "income" | "transfer"; advance?: number; sourceId?: string; confirmedAmount?: number; receivedOn?: string; href?: string };
export type PlanningReserve = { id: string; month: string; amount: number; outsideBalances: boolean };
export const cents = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100);

export function installmentSchedule(total: number, count: number, firstMonth: string) {
  if (!Number.isFinite(total) || total < 0 || !Number.isInteger(count) || count < 1 || count > 60 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(firstMonth)) return [];
  const amount = cents(total);
  const [year, month] = firstMonth.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => ({
    month: new Date(Date.UTC(year, month - 1 + index, 1)).toISOString().slice(0, 10),
    amount: (Math.floor(amount / count) + (index < amount % count ? 1 : 0)) / 100,
  }));
}

/** Closing day is inclusive here; issuers may differ, so the UI permits an override. */
export function firstInstallmentMonth(purchase: string, closing: number | null | undefined, due: number | null | undefined): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchase) || !closing || !due || closing < 1 || closing > 31 || due < 1 || due > 31) return null;
  const [year, month, day] = purchase.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== purchase) return null;
  const closingDay = Math.min(closing, new Date(Date.UTC(year, month, 0)).getUTCDate());
  const offset = (day > closingDay ? 1 : 0) + (due <= closing ? 1 : 0);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

/** No carry-forward: each month needs its own confirmed opening resources. */
export function calculateBankPlan(input: { month: string; currentMonth: string; balance: number; reserves: PlanningReserve[]; incomes: PlanningIncome[]; commitments: number[]; budget?: number }) {
  const unique = Array.from(new Map(input.reserves.map(row => [row.id, row])).values());
  const reserve = unique.filter(row => row.month === input.month).reduce((sum, row) => sum + cents(row.amount), 0);
  const locked = unique.filter(row => row.month > input.month && !row.outsideBalances).reduce((sum, row) => sum + cents(row.amount), 0);
  const external = unique.filter(row => row.month === input.month && row.outsideBalances).reduce((sum, row) => sum + cents(row.amount), 0);
  const available = input.month === input.currentMonth ? cents(input.balance) - locked + external : reserve;
  const pending = input.incomes.filter(row => row.state === "pending").reduce((sum, row) => sum + Math.max(0, cents(row.amount) - cents(row.advance ?? 0)), 0);
  const commitments = input.commitments.reduce((sum, value) => sum + cents(value), 0);
  const difference = available - commitments;
  const budget = Math.max(0, cents(input.budget ?? 0));
  return { available: available / 100, reserve: reserve / 100, pending: pending / 100, commitments: commitments / 100, difference: difference / 100, projected: (difference + pending) / 100, afterPlan: (difference - budget) / 100, projectedAfterPlan: (difference + pending - budget) / 100 };
}

export function parsePlanBudget(raw: string): number | null {
  const cleaned = raw.trim().replace(/^R\$\s*/, "");
  if (!cleaned) return 0;
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}
