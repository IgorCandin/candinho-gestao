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


export type BankPatrimony = {
  totalCashBalance: number;
  companyCashBalance: number;
  supplementsStockCost: number;
  supplementsStockSaleValue: number;
  fitnessStockCost: number;
  fitnessStockSaleValue: number;
  totalInventoryCost: number;
  bankReceivables: number;
  operationReceivables: number;
  totalReceivables: number;
  companyDebtRemaining: number;
  totalDebtRemaining: number;
  operationalNetPosition: number;
  totalNetPosition: number;
};

export type BankReviewAlert = {
  kind: "stale_balance" | "overdue_invoice" | "duplicate_subscription" | "missing_invoice";
  title: string;
  description: string;
  href: string;
  count: number;
  amount?: number;
};

export type BankMonthClosure = {
  id: string;
  referenceMonth: string;
  closedOn: string;
  totalBalance: number;
  companyCashBalance: number;
  bankReceivables: number;
  operationReceivables: number;
  supplementsStockCost: number;
  fitnessStockCost: number;
  companyDebtRemaining: number;
  totalDebtRemaining: number;
  projectedIncome: number;
  projectedCommitments: number;
  projectedResult: number;
  operationalNetPosition: number;
  totalNetPosition: number;
  notes: string | null;
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
  patrimony: BankPatrimony;
  reviewAlerts: BankReviewAlert[];
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
      patrimony: { totalCashBalance: 0, companyCashBalance: 0, supplementsStockCost: 0, supplementsStockSaleValue: 0, fitnessStockCost: 0, fitnessStockSaleValue: 0, totalInventoryCost: 0, bankReceivables: 0, operationReceivables: 0, totalReceivables: 0, companyDebtRemaining: 0, totalDebtRemaining: 0, operationalNetPosition: 0, totalNetPosition: 0 },
      reviewAlerts: [],
    };
  }

  const supabase = await createClient();
  const [summaryResult, chargesResult, receivablesResult, accountsResult, projectionResult, operationReceivablesResult, supplementsProjectionResult, patrimonyResult, subscriptionsResult, cardsResult, currentInvoicesResult] = await Promise.all([
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
    supabase.rpc("bank_get_company_patrimony"),
    supabase.from("bank_subscriptions").select("id,name,provider,amount,billing_day,origin,is_active").eq("is_active", true),
    supabase.from("bank_cards").select("id,name").eq("is_active", true),
    supabase.from("bank_card_invoice_overview").select("id,card_id,card_name,reference_month,amount,status,due_date").eq("reference_month", new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(new Date()) + "-01"),
  ]);

  if (summaryResult.error) throw summaryResult.error;
  if (chargesResult.error) throw chargesResult.error;
  if (receivablesResult.error) throw receivablesResult.error;
  if (accountsResult.error) throw accountsResult.error;
  if (projectionResult.error) throw projectionResult.error;
  if (operationReceivablesResult.error) throw operationReceivablesResult.error;
  if (supplementsProjectionResult.error) throw supplementsProjectionResult.error;
  if (patrimonyResult.error) throw patrimonyResult.error;
  if (subscriptionsResult.error) throw subscriptionsResult.error;
  if (cardsResult.error) throw cardsResult.error;
  if (currentInvoicesResult.error) throw currentInvoicesResult.error;

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

  const patrimonyRow = ((patrimonyResult.data ?? [])[0] ?? {}) as Record<string, unknown>;
  const patrimony: BankPatrimony = {
    totalCashBalance: number(patrimonyRow.total_cash_balance),
    companyCashBalance: number(patrimonyRow.company_cash_balance),
    supplementsStockCost: number(patrimonyRow.supplements_stock_cost),
    supplementsStockSaleValue: number(patrimonyRow.supplements_stock_sale_value),
    fitnessStockCost: number(patrimonyRow.fitness_stock_cost),
    fitnessStockSaleValue: number(patrimonyRow.fitness_stock_sale_value),
    totalInventoryCost: number(patrimonyRow.total_inventory_cost),
    bankReceivables: number(patrimonyRow.bank_receivables),
    operationReceivables: number(patrimonyRow.operation_receivables),
    totalReceivables: number(patrimonyRow.total_receivables),
    companyDebtRemaining: number(patrimonyRow.company_debt_remaining),
    totalDebtRemaining: number(patrimonyRow.total_debt_remaining),
    operationalNetPosition: number(patrimonyRow.operational_net_position),
    totalNetPosition: number(patrimonyRow.total_net_position),
  };

  const reviewAlerts: BankReviewAlert[] = [];
  const today = new Date();
  const staleAccounts = accounts.filter((account) => {
    if (!account.balanceDate) return true;
    const ageMs = today.getTime() - new Date(`${account.balanceDate}T12:00:00Z`).getTime();
    return ageMs > 7 * 24 * 60 * 60 * 1000;
  });
  if (staleAccounts.length > 0) {
    reviewAlerts.push({ kind: "stale_balance", title: "Saldos precisam de atualização", description: `${staleAccounts.length} conta(s) estão há mais de 7 dias sem novo saldo.`, href: "/bank/atualizar", count: staleAccounts.length });
  }

  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(today);
  const overdueInvoices = (currentInvoicesResult.data ?? []).filter((row: Record<string, unknown>) => String(row.status ?? "planned") !== "paid" && String(row.status ?? "planned") !== "cancelled" && String(row.due_date ?? "") < todayKey && number(row.amount) > 0);
  if (overdueInvoices.length > 0) {
    reviewAlerts.push({ kind: "overdue_invoice", title: "Faturas vencidas ainda abertas", description: `${overdueInvoices.length} fatura(s) do mês já passaram do vencimento e continuam em aberto.`, href: "/bank/faturas", count: overdueInvoices.length, amount: overdueInvoices.reduce((sum, row) => sum + number((row as Record<string, unknown>).amount), 0) });
  }

  const currentInvoiceCardIds = new Set((currentInvoicesResult.data ?? []).map((row: Record<string, unknown>) => String(row.card_id)));
  const missingInvoices = (cardsResult.data ?? []).filter((row: Record<string, unknown>) => !currentInvoiceCardIds.has(String(row.id)));
  if (missingInvoices.length > 0) {
    reviewAlerts.push({ kind: "missing_invoice", title: "Cartões sem fatura do mês", description: `${missingInvoices.length} cartão(ões) ainda não têm valor informado para o mês atual.`, href: "/bank/atualizar", count: missingInvoices.length });
  }

  const duplicateMap = new Map<string, number>();
  for (const raw of subscriptionsResult.data ?? []) {
    const row = raw as Record<string, unknown>;
    const key = [String(row.name ?? "").trim().toLowerCase(), String(row.provider ?? "").trim().toLowerCase(), number(row.amount).toFixed(2), String(row.billing_day ?? ""), String(row.origin ?? "").trim().toLowerCase()].join("|");
    duplicateMap.set(key, (duplicateMap.get(key) ?? 0) + 1);
  }
  const duplicateCount = [...duplicateMap.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
  if (duplicateCount > 0) {
    reviewAlerts.push({ kind: "duplicate_subscription", title: "Possíveis mensalidades duplicadas", description: `${duplicateCount} lançamento(s) parecem duplicados. Revise antes de confiar na projeção.`, href: "/bank/mensalidades", count: duplicateCount });
  }

  return {
    summary,
    upcomingCharges,
    upcomingReceivables,
    accounts,
    annualProjection,
    operationReceivables,
    operationReceivablesSummary,
    supplementsProfitProjection,
    patrimony,
    reviewAlerts,
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


export async function getBankMonthClosures(): Promise<BankMonthClosure[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("bank_month_closures").select("*").order("reference_month", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    referenceMonth: String(row.reference_month ?? ""),
    closedOn: String(row.closed_on ?? ""),
    totalBalance: number(row.total_balance),
    companyCashBalance: number(row.company_cash_balance),
    bankReceivables: number(row.bank_receivables),
    operationReceivables: number(row.operation_receivables),
    supplementsStockCost: number(row.supplements_stock_cost),
    fitnessStockCost: number(row.fitness_stock_cost),
    companyDebtRemaining: number(row.company_debt_remaining),
    totalDebtRemaining: number(row.total_debt_remaining),
    projectedIncome: number(row.projected_income),
    projectedCommitments: number(row.projected_commitments),
    projectedResult: number(row.projected_result),
    operationalNetPosition: number(row.operational_net_position),
    totalNetPosition: number(row.total_net_position),
    notes: nullableText(row.notes),
  }));
}
