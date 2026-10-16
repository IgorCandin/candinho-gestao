import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/data";
import { getBankMonthHomeDataV2 } from "@/lib/bank-home-data-v2";
import type { BankMonthCommitment } from "@/lib/bank-home-data";
import type { PlanningIncome, PlanningReserve } from "@/lib/bank-planning";

export type PlanningCard = { id: string; name: string; institution: string; holder: string; closingDay?: number | null; dueDay?: number | null };
export type PlanningMonth = { referenceMonth: string; label: string; rows: BankMonthCommitment[]; incomes: PlanningIncome[] };
export type BankPlanningData = { currentMonth: string; balance: number; balanceDate: string | null; reserves: PlanningReserve[]; months: PlanningMonth[]; cards: PlanningCard[]; warnings: string[]; canWrite?: boolean };

// Reconciliation metadata, NOT new financial entries. Source: audit 3373, 15/10/2026.
// Bound to the existing reserve and income sources; never repeats in another month.
const advanceReserveId = "9c617ae2-23e6-468a-b8ba-51a5f070bed2";
const advances = new Map([["de28f5b6-06f3-4f7a-af2e-29dd1aa52840", 1800], ["4f68563f-5122-481a-965e-d9a03978719b", 1100]]);

export async function getBankPlanningData(): Promise<BankPlanningData> {
  const access = await getCurrentUserAccess();
  if (!access.active || (!access.canAccessBank && access.role !== "admin")) throw new Error("Sem permissão para acessar o planejamento do Bank.");
  const db = await createClient();
  const current = await getBankMonthHomeDataV2();
  const [year, month] = current.referenceMonth.split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const [following, accounts, goals, sources, receipts, receivables, cards, invoices, charges, subscriptions, supplementSchedule, fitness] = await Promise.all([
    getBankMonthHomeDataV2(next),
    db.from("bank_account_current_balances").select("balance,balance_date").eq("is_active", true),
    db.from("bank_financial_goals").select("id,title,due_date,reserved_amount").eq("goal_type", "reserve").eq("status", "active"),
    db.from("bank_income_sources").select("id,name,amount,frequency,starts_on,ends_on,include_in_projection").eq("is_active", true),
    db.from("bank_income_source_receipts").select("source_id,reference_month,amount").in("reference_month", [current.referenceMonth, next]),
    db.from("bank_receivables").select("id,title,amount,received_amount,status,due_date,source_id,category").gte("due_date", current.referenceMonth).lt("due_date", new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 10)),
    db.from("bank_cards").select("id,name,institution,holder_name,closing_day,due_day").eq("is_active", true).order("display_order"),
    db.from("bank_card_invoice_overview").select("id,card_id").in("reference_month", [current.referenceMonth, next]),
    db.from("bank_charges_overview").select("id,card_invoice_id").gte("due_date", current.referenceMonth).lt("due_date", new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 10)),
    db.from("bank_subscriptions").select("id,card_id"),
    db.from("supplement_sale_receivable_schedule").select("receivable_key,amount,due_date,has_explicit_due"),
    db.from("fitness_sales").select("id,total_amount,payment_due_on").eq("payment_status", "receivable").neq("general_status", "cancelled"),
  ]);
  for (const result of [accounts, goals, sources, receipts, receivables, cards, invoices, charges, subscriptions, supplementSchedule, fitness]) if (result.error) throw result.error;
  const warnings = ["Saldos são conferências, não um extrato automático. Atualize após movimentações. Entradas a conferir não são dinheiro disponível."];
  const reserves: PlanningReserve[] = (goals.data ?? []).filter(row => row.due_date).map(row => ({ id: String(row.id), month: `${String(row.due_date).slice(0, 7)}-01`, amount: Number(row.reserved_amount), outsideBalances: String(row.id) === advanceReserveId }));
  const advanceReserve = reserves.find(row => row.id === advanceReserveId);
  if (advanceReserve) warnings.push("Conferência de 15/10: reserva fora dos saldos (Giulia R$ 1.800 + Igor R$ 1.100). A diferença de R$ 80 da tabela não foi confirmada. Entradas adicionais de novembro continuam a conferir.");
  if (advanceReserve && (advanceReserve.amount !== 2900 || advanceReserve.month !== "2026-11-01")) warnings.push("A reserva reconciliada mudou: confira a distribuição dos salários antecipados antes de assumir entradas adicionais.");
  const invoiceCard = new Map((invoices.data ?? []).map(row => [String(row.id), String(row.card_id)]));
  const chargeCard = new Map((charges.data ?? []).map(row => [String(row.id), invoiceCard.get(String(row.card_invoice_id))]));
  const subscriptionCard = new Map((subscriptions.data ?? []).map(row => [String(row.id), row.card_id ? String(row.card_id) : undefined]));
  const months = [current, following].map(base => {
    const incomes: PlanningIncome[] = [];
    const eligible = (sources.data ?? []).filter(row => row.include_in_projection && row.frequency === "monthly" && String(row.starts_on).slice(0, 7) <= base.referenceMonth.slice(0, 7) && (!row.ends_on || String(row.ends_on).slice(0, 7) >= base.referenceMonth.slice(0, 7)));
    for (const source of eligible) {
      const received = (receipts.data ?? []).filter(row => row.source_id === source.id && row.reference_month === base.referenceMonth).reduce((sum, row) => sum + Number(row.amount), 0);
      const advance = base.referenceMonth === "2026-11-01" ? advances.get(String(source.id)) ?? 0 : 0;
      if (received > 0) incomes.push({ id: `receipt:${source.id}`, title: `${source.name} · recebimento registrado (confira o saldo)`, amount: received, state: "received", kind: "income" });
      const outstanding = Math.max(0, Number(source.amount) - received - advance);
      if (outstanding > 0) incomes.push({ id: `source:${source.id}`, title: String(source.name), amount: outstanding, state: "pending", kind: "income", sourceId: String(source.id), confirmedAmount: received });
    }
    for (const row of receivables.data ?? []) {
      if (!String(row.due_date).startsWith(base.referenceMonth.slice(0, 7)) || ["received", "cancelled"].includes(String(row.status))) continue;
      if (row.source_id && eligible.some(source => source.id === row.source_id)) continue;
      incomes.push({ id: String(row.id), title: String(row.title), amount: Math.max(0, Number(row.amount) - Number(row.received_amount)), state: "pending", kind: /transfer/i.test(String(row.category)) ? "transfer" : "income", href: `/bank/entradas?receber=${encodeURIComponent(String(row.id))}` });
    }
    // Explicit schedules use outstanding amounts (not the original sale total).
    // Undated/overdue operations stay in the current month, not both months.
    const belongs = (date: string | null, explicit = true) => {
      if (!date || !explicit) return base.referenceMonth === current.referenceMonth;
      return date.slice(0, 7) === base.referenceMonth.slice(0, 7) || (date < current.referenceMonth && base.referenceMonth === current.referenceMonth);
    };
    const operations = (supplementSchedule.data ?? []).filter(row => belongs(row.due_date, row.has_explicit_due)).reduce((sum, row) => sum + Number(row.amount), 0)
      + (fitness.data ?? []).filter(row => belongs(row.payment_due_on)).reduce((sum, row) => sum + Number(row.total_amount), 0);
    if (operations > 0) incomes.push({ id: "operations", title: "Operações · recebimento a conferir", amount: operations, state: "pending", kind: "income" });
    const rows = base.commitments.map(row => {
      const [kind, id] = row.id.split(":");
      const cardId = kind === "invoice" ? invoiceCard.get(id) : kind === "charge" ? chargeCard.get(id) : subscriptionCard.get(id);
      return { ...row, cardId: cardId ?? null };
    });
    return { referenceMonth: base.referenceMonth, label: base.monthLabel, rows, incomes };
  });
  return { canWrite: access.canWriteBank, currentMonth: current.referenceMonth, balance: (accounts.data ?? []).reduce((sum, row) => sum + Number(row.balance), 0), balanceDate: (accounts.data ?? []).map(row => row.balance_date as string | null).filter((date): date is string => Boolean(date)).sort()[0] ?? null, reserves, months, cards: (cards.data ?? []).map(row => ({ id: String(row.id), name: String(row.name), institution: String(row.institution ?? "Banco"), holder: String(row.holder_name ?? "Titular não informado"), closingDay: row.closing_day ? Number(row.closing_day) : null, dueDay: row.due_day ? Number(row.due_day) : null })), warnings };
}
