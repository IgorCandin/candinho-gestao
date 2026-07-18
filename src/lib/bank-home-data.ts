import { createClient } from "./supabase/server";

export type BankMonthCommitment = {
  id: string;
  kind: "charge" | "invoice" | "subscription" | "debt";
  title: string;
  amount: number;
  dueDate: string;
  status: string;
  origin: string | null;
  href: string;
};

export type BankMonthHomeData = {
  referenceMonth: string;
  monthLabel: string;
  today: string;
  commitments: BankMonthCommitment[];
  overdue: BankMonthCommitment[];
  dueToday: BankMonthCommitment[];
  upcoming: BankMonthCommitment[];
  remainingMonthTotal: number;
  overdueTotal: number;
  dueTodayTotal: number;
  monthCommitmentTotal: number;
};

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isoDateInSaoPaulo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function monthBounds(today: string) {
  const [year, month] = today.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  const nextStart = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
  return { start, nextStart, year, month };
}

function safeDay(year: number, month: number, day: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.max(1, Math.min(day, last))).padStart(2, "0")}`;
}

export async function getBankMonthHomeData(): Promise<BankMonthHomeData> {
  const supabase = await createClient();
  const today = isoDateInSaoPaulo();
  const { start, nextStart, year, month } = monthBounds(today);

  const [chargesResult, invoicesResult, subscriptionsResult, debtsResult] = await Promise.all([
    supabase
      .from("bank_charges_overview")
      .select("id,title,remaining_amount,effective_status,origin,due_date,charge_type,source_id,card_invoice_id")
      .gte("due_date", start)
      .lt("due_date", nextStart)
      .not("effective_status", "in", "(paid,cancelled)")
      .order("due_date", { ascending: true }),
    supabase
      .from("bank_card_invoice_overview")
      .select("id,card_name,amount,status,due_date,origin,reference_month")
      .eq("reference_month", start)
      .not("status", "in", "(paid,cancelled)")
      .gt("amount", 0)
      .order("due_date", { ascending: true }),
    supabase
      .from("bank_subscriptions")
      .select("id,name,provider,amount,billing_day,origin,payment_method_type,is_active,starts_on,ends_on")
      .eq("is_active", true),
    supabase
      .from("bank_debts")
      .select("id,name,creditor_name,monthly_amount,next_due_date,due_day,origin,status,start_date")
      .eq("status", "active"),
  ]);

  if (chargesResult.error) throw chargesResult.error;
  if (invoicesResult.error) throw invoicesResult.error;
  if (subscriptionsResult.error) throw subscriptionsResult.error;
  if (debtsResult.error) throw debtsResult.error;

  const charges = (chargesResult.data ?? []) as Array<Record<string, unknown>>;
  const sourceIds = new Set(charges.map((row) => String(row.source_id ?? "")).filter(Boolean));
  const invoiceIdsAlreadyCharged = new Set(charges.map((row) => String(row.card_invoice_id ?? "")).filter(Boolean));

  const commitments: BankMonthCommitment[] = charges
    .map((row) => ({
      id: `charge:${String(row.id)}`,
      kind: "charge" as const,
      title: String(row.title ?? "Cobrança"),
      amount: number(row.remaining_amount),
      dueDate: String(row.due_date ?? ""),
      status: String(row.effective_status ?? "pending"),
      origin: typeof row.origin === "string" ? row.origin : null,
      href: "/bank/cobrancas",
    }))
    .filter((item) => item.amount > 0 && item.dueDate);

  for (const row of (invoicesResult.data ?? []) as Array<Record<string, unknown>>) {
    const id = String(row.id);
    if (invoiceIdsAlreadyCharged.has(id)) continue;
    const dueDate = String(row.due_date ?? "");
    const amount = number(row.amount);
    if (!dueDate || amount <= 0) continue;
    commitments.push({
      id: `invoice:${id}`,
      kind: "invoice",
      title: `Fatura ${String(row.card_name ?? "Cartão")}`,
      amount,
      dueDate,
      status: String(row.status ?? "planned"),
      origin: typeof row.origin === "string" ? row.origin : "Cartão",
      href: "/bank/faturas",
    });
  }

  for (const row of (subscriptionsResult.data ?? []) as Array<Record<string, unknown>>) {
    const id = String(row.id);
    if (sourceIds.has(id)) continue;
    if (String(row.payment_method_type ?? "").toLowerCase() === "card") continue;
    const startsOn = typeof row.starts_on === "string" ? row.starts_on : null;
    const endsOn = typeof row.ends_on === "string" ? row.ends_on : null;
    if (startsOn && startsOn >= nextStart) continue;
    if (endsOn && endsOn < start) continue;
    const billingDay = number(row.billing_day);
    const amount = number(row.amount);
    if (!billingDay || amount <= 0) continue;
    commitments.push({
      id: `subscription:${id}`,
      kind: "subscription",
      title: String(row.name ?? row.provider ?? "Mensalidade"),
      amount,
      dueDate: safeDay(year, month, billingDay),
      status: "active",
      origin: typeof row.origin === "string" ? row.origin : "Mensalidade",
      href: "/bank/mensalidades",
    });
  }

  for (const row of (debtsResult.data ?? []) as Array<Record<string, unknown>>) {
    const id = String(row.id);
    if (sourceIds.has(id)) continue;
    const amount = number(row.monthly_amount);
    if (amount <= 0) continue;
    let dueDate = typeof row.next_due_date === "string" ? row.next_due_date : "";
    if (!dueDate || dueDate < start || dueDate >= nextStart) {
      const dueDay = number(row.due_day);
      if (!dueDay) continue;
      dueDate = safeDay(year, month, dueDay);
    }
    commitments.push({
      id: `debt:${id}`,
      kind: "debt",
      title: String(row.name ?? row.creditor_name ?? "Parcela"),
      amount,
      dueDate,
      status: dueDate < today ? "overdue" : "pending",
      origin: typeof row.origin === "string" ? row.origin : "Dívida",
      href: "/bank/emprestimos",
    });
  }

  const unique = Array.from(
    new Map(
      commitments
        .filter((item) => item.dueDate >= start && item.dueDate < nextStart)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title, "pt-BR"))
        .map((item) => [item.id, item]),
    ).values(),
  );

  const overdue = unique.filter((item) => item.dueDate < today);
  const dueToday = unique.filter((item) => item.dueDate === today);
  const upcoming = unique.filter((item) => item.dueDate > today);
  const sum = (rows: BankMonthCommitment[]) => rows.reduce((total, item) => total + item.amount, 0);

  return {
    referenceMonth: start,
    monthLabel: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      month: "long",
      year: "numeric",
    }).format(new Date(`${start}T12:00:00-03:00`)),
    today,
    commitments: unique,
    overdue,
    dueToday,
    upcoming,
    remainingMonthTotal: sum([...dueToday, ...upcoming]),
    overdueTotal: sum(overdue),
    dueTodayTotal: sum(dueToday),
    monthCommitmentTotal: sum(unique),
  };
}
