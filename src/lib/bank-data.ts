import { isSupabaseConfigured } from "./config";
import { createClient } from "./supabase/server";

const number = (value: unknown) => Number(value ?? 0);
const nullableText = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);

export type BankDashboardSummary = {
  totalBalance: number;
  latestBalanceDate: string | null;
  dueThisMonth: number;
  overdueTotal: number;
  next30Days: number;
  invoicesThisMonth: number;
  totalDebtRemaining: number;
  balanceAfterCurrentMonthCommitments: number;
  receivableThisMonth: number;
  receivableOverdue: number;
  receivableNext30Days: number;
  projectedBalanceAfterCurrentMonth: number;
};

export type BankChargePreview = {
  id: string;
  title: string;
  dueDate: string;
  remainingAmount: number;
  effectiveStatus: string;
  category: string | null;
  origin: string | null;
};

export type BankReceivablePreview = {
  id: string;
  title: string;
  dueDate: string;
  remainingAmount: number;
  effectiveStatus: string;
  payerName: string | null;
  origin: string | null;
};

export type BankAccountBalance = {
  id: string;
  name: string;
  accountType: string;
  origin: string | null;
  balance: number;
  balanceDate: string | null;
};

export type BankAnnualProjection = {
  referenceMonth: string;
  cardInvoices: number;
  cardSubscriptionEstimate: number;
  directCharges: number;
  debtPayments: number;
  directSubscriptions: number;
  totalCommitments: number;
  receivables: number;
  recurringIncomeEstimate: number;
  operationReceivables: number;
  supplementsProfitProjection: number;
  totalExpectedIncome: number;
  projectedResult: number;
};

export type BankOperationReceivable = {
  operation: "supplements" | "fitness";
  operationLabel: string;
  saleId: string;
  customerName: string;
  productSummary: string;
  amount: number;
  profit: number;
  dueDate: string;
  quotedOn: string;
  paymentStatus: string;
  deliveryStatus: string;
  href: string;
};

export type BankOperationReceivableSummary = {
  total: number;
  totalCount: number;
  supplementsTotal: number;
  supplementsCount: number;
  fitnessTotal: number;
  fitnessCount: number;
};

export type BankSupplementsProfitProjection = {
  periodStart: string | null;
  periodEnd: string | null;
  averageMonthlyProfit: number;
  projectionFactor: number;
  projectedMonthlyReceivable: number;
  monthlyHistory: Array<{ month: string; profit: number }>;
};

export type BankDashboardData = {
  summary: BankDashboardSummary;
  upcomingCharges: BankChargePreview[];
  upcomingReceivables: BankReceivablePreview[];
  accounts: BankAccountBalance[];
  annualProjection: BankAnnualProjection[];
  operationReceivables: BankOperationReceivable[];
  operationReceivablesSummary: BankOperationReceivableSummary;
  supplementsProfitProjection: BankSupplementsProfitProjection;
};

const emptySummary: BankDashboardSummary = {
  totalBalance: 0,
  latestBalanceDate: null,
  dueThisMonth: 0,
  overdueTotal: 0,
  next30Days: 0,
  invoicesThisMonth: 0,
  totalDebtRemaining: 0,
  balanceAfterCurrentMonthCommitments: 0,
  receivableThisMonth: 0,
  receivableOverdue: 0,
  receivableNext30Days: 0,
  projectedBalanceAfterCurrentMonth: 0,
};

export async function getBankDashboardData(): Promise<BankDashboardData> {
  if (!isSupabaseConfigured) {
    return {
      summary: emptySummary,
      upcomingCharges: [],
      upcomingReceivables: [],
      accounts: [],
      annualProjection: [],
      operationReceivables: [],
      operationReceivablesSummary: { total: 0, totalCount: 0, supplementsTotal: 0, supplementsCount: 0, fitnessTotal: 0, fitnessCount: 0 },
      supplementsProfitProjection: { periodStart: null, periodEnd: null, averageMonthlyProfit: 0, projectionFactor: 0.7, projectedMonthlyReceivable: 0, monthlyHistory: [] },
    };
  }

  const supabase = await createClient();
  const [summaryResult, chargesResult, receivablesResult, accountsResult, projectionResult, operationReceivablesResult, supplementsProjectionResult] = await Promise.all([
    supabase.from("bank_dashboard_summary").select("*").single(),
    supabase
      .from("bank_charges_overview")
      .select("id,title,due_date,remaining_amount,effective_status,category,origin")
      .not("effective_status", "in", "(paid,cancelled)")
      .order("due_date", { ascending: true })
      .limit(6),
    supabase
      .from("bank_receivables_overview")
      .select("id,title,due_date,remaining_amount,effective_status,payer_name,origin")
      .not("effective_status", "in", "(received,cancelled)")
      .order("due_date", { ascending: true })
      .limit(6),
    supabase
      .from("bank_account_current_balances")
      .select("id,name,account_type,origin,balance,balance_date")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.rpc("bank_get_annual_projection"),
    supabase.rpc("bank_get_operation_receivables"),
    supabase.rpc("bank_get_supplements_profit_projection"),
  ]);

  if (summaryResult.error) throw summaryResult.error;
  if (chargesResult.error) throw chargesResult.error;
  if (receivablesResult.error) throw receivablesResult.error;
  if (accountsResult.error) throw accountsResult.error;
  if (projectionResult.error) throw projectionResult.error;
  if (operationReceivablesResult.error) throw operationReceivablesResult.error;
  if (supplementsProjectionResult.error) throw supplementsProjectionResult.error;

  const summaryRow = (summaryResult.data ?? {}) as Record<string, unknown>;
  const summary: BankDashboardSummary = {
    totalBalance: number(summaryRow.total_balance),
    latestBalanceDate: nullableText(summaryRow.latest_balance_date),
    dueThisMonth: number(summaryRow.due_this_month),
    overdueTotal: number(summaryRow.overdue_total),
    next30Days: number(summaryRow.next_30_days),
    invoicesThisMonth: number(summaryRow.invoices_this_month),
    totalDebtRemaining: number(summaryRow.total_debt_remaining),
    balanceAfterCurrentMonthCommitments: number(summaryRow.balance_after_current_month_commitments),
    receivableThisMonth: number(summaryRow.receivable_this_month),
    receivableOverdue: number(summaryRow.receivable_overdue),
    receivableNext30Days: number(summaryRow.receivable_next_30_days),
    projectedBalanceAfterCurrentMonth: number(summaryRow.projected_balance_after_current_month),
  };

  const upcomingCharges: BankChargePreview[] = (chargesResult.data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    title: String(row.title ?? "Cobrança"),
    dueDate: String(row.due_date ?? ""),
    remainingAmount: number(row.remaining_amount),
    effectiveStatus: String(row.effective_status ?? "pending"),
    category: nullableText(row.category),
    origin: nullableText(row.origin),
  }));

  const upcomingReceivables: BankReceivablePreview[] = (receivablesResult.data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    title: String(row.title ?? "Recebimento"),
    dueDate: String(row.due_date ?? ""),
    remainingAmount: number(row.remaining_amount),
    effectiveStatus: String(row.effective_status ?? "pending"),
    payerName: nullableText(row.payer_name),
    origin: nullableText(row.origin),
  }));

  const accounts: BankAccountBalance[] = (accountsResult.data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name ?? "Conta"),
    accountType: String(row.account_type ?? "bank"),
    origin: nullableText(row.origin),
    balance: number(row.balance),
    balanceDate: nullableText(row.balance_date),
  }));

  const annualProjection: BankAnnualProjection[] = (projectionResult.data ?? []).map((row: Record<string, unknown>) => ({
    referenceMonth: String(row.reference_month ?? ""),
    cardInvoices: number(row.card_invoices),
    cardSubscriptionEstimate: number(row.card_subscription_estimate),
    directCharges: number(row.direct_charges),
    debtPayments: number(row.debt_payments),
    directSubscriptions: number(row.direct_subscriptions),
    totalCommitments: number(row.total_commitments),
    receivables: number(row.receivables),
    recurringIncomeEstimate: number(row.recurring_income_estimate),
    operationReceivables: number(row.operation_receivables),
    supplementsProfitProjection: number(row.supplements_profit_projection),
    totalExpectedIncome: number(row.total_expected_income),
    projectedResult: number(row.projected_result),
  }));

  const operationReceivables: BankOperationReceivable[] = (operationReceivablesResult.data ?? []).map((row: Record<string, unknown>) => ({
    operation: String(row.operation ?? "supplements") === "fitness" ? "fitness" : "supplements",
    operationLabel: String(row.operation_label ?? "Operação"),
    saleId: String(row.sale_id ?? ""),
    customerName: String(row.customer_name ?? "Cliente"),
    productSummary: String(row.product_summary ?? "Venda sem itens"),
    amount: number(row.amount),
    profit: number(row.profit),
    dueDate: String(row.due_date ?? ""),
    quotedOn: String(row.quoted_on ?? ""),
    paymentStatus: String(row.payment_status ?? "receivable"),
    deliveryStatus: String(row.delivery_status ?? ""),
    href: String(row.href ?? "#"),
  }));

  const operationReceivablesSummary: BankOperationReceivableSummary = operationReceivables.reduce(
    (acc, item) => {
      acc.total += item.amount;
      acc.totalCount += 1;
      if (item.operation === "fitness") {
        acc.fitnessTotal += item.amount;
        acc.fitnessCount += 1;
      } else {
        acc.supplementsTotal += item.amount;
        acc.supplementsCount += 1;
      }
      return acc;
    },
    { total: 0, totalCount: 0, supplementsTotal: 0, supplementsCount: 0, fitnessTotal: 0, fitnessCount: 0 },
  );

  const supplementsProjectionRow = ((supplementsProjectionResult.data ?? [])[0] ?? {}) as Record<string, unknown>;
  const rawHistory = Array.isArray(supplementsProjectionRow.monthly_history) ? supplementsProjectionRow.monthly_history : [];
  const supplementsProfitProjection: BankSupplementsProfitProjection = {
    periodStart: nullableText(supplementsProjectionRow.period_start),
    periodEnd: nullableText(supplementsProjectionRow.period_end),
    averageMonthlyProfit: number(supplementsProjectionRow.average_monthly_profit),
    projectionFactor: number(supplementsProjectionRow.projection_factor),
    projectedMonthlyReceivable: number(supplementsProjectionRow.projected_monthly_receivable),
    monthlyHistory: rawHistory.map((item) => {
      const row = item as Record<string, unknown>;
      return { month: String(row.month ?? ""), profit: number(row.profit) };
    }),
  };

  return {
    summary,
    upcomingCharges,
    upcomingReceivables,
    accounts,
    annualProjection,
    operationReceivables,
    operationReceivablesSummary,
    supplementsProfitProjection,
  };
}

export async function getBankOperationReceivables(): Promise<{
  items: BankOperationReceivable[];
  summary: BankOperationReceivableSummary;
  supplementsProjection: BankSupplementsProfitProjection;
}> {
  const data = await getBankDashboardData();
  return {
    items: data.operationReceivables,
    summary: data.operationReceivablesSummary,
    supplementsProjection: data.supplementsProfitProjection,
  };
}

export async function getBankCharges(): Promise<Record<string, unknown>[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_charges_overview")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBankCardsAndInvoices(): Promise<{ cards: Record<string, unknown>[]; invoices: Record<string, unknown>[] }> {
  if (!isSupabaseConfigured) return { cards: [], invoices: [] };
  const supabase = await createClient();
  const [cardsResult, invoicesResult] = await Promise.all([
    supabase.from("bank_cards").select("*").eq("is_active", true).order("display_order", { ascending: true }).order("name", { ascending: true }),
    supabase.from("bank_card_invoice_overview").select("*").order("reference_month", { ascending: true }),
  ]);
  if (cardsResult.error) throw cardsResult.error;
  if (invoicesResult.error) throw invoicesResult.error;
  return { cards: cardsResult.data ?? [], invoices: invoicesResult.data ?? [] };
}

export async function getBankDebts(): Promise<Record<string, unknown>[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("bank_debts_overview").select("*").order("next_due_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBankSubscriptions(): Promise<Record<string, unknown>[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("bank_subscriptions_overview").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBankAccounts(): Promise<Record<string, unknown>[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("bank_account_current_balances").select("*").eq("is_active", true).order("display_order", { ascending: true }).order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}


export async function getBankIncomeSources(): Promise<Record<string, unknown>[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_income_sources")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBankReceivables(): Promise<Record<string, unknown>[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_receivables_overview")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBankAnnualProjection(): Promise<Record<string, unknown>[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bank_get_annual_projection");
  if (error) throw error;
  return data ?? [];
}
