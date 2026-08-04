import { createClient } from "@/lib/supabase/server";

function isoDateInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function monthStart(offset = 0) {
  const today = isoDateInSaoPaulo();
  const [year, month] = today.slice(0, 7).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}-01`;
}

export async function getBankNexusContext() {
  const supabase = await createClient();
  const today = isoDateInSaoPaulo();
  const currentMonth = monthStart(0);
  const invoiceHistoryStart = monthStart(-2);

  const [
    cardsResult,
    invoicesResult,
    incomeSourcesResult,
    receiptsResult,
    debtsResult,
    subscriptionsResult,
    accountsResult,
    balancesResult,
  ] = await Promise.all([
    supabase
      .from("bank_cards")
      .select("id,name,institution,holder_name,due_day,is_active")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("bank_card_invoice_overview")
      .select("id,card_id,card_name,amount,status,reference_month,due_date")
      .gte("reference_month", invoiceHistoryStart)
      .lte("reference_month", currentMonth)
      .order("reference_month", { ascending: false }),
    supabase
      .from("bank_income_sources")
      .select(
        "id,name,payer_name,amount,frequency,is_variable,include_in_projection,is_active",
      )
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("bank_income_source_receipts")
      .select("source_id,reference_month,received_on,amount")
      .eq("reference_month", currentMonth),
    supabase
      .from("bank_debts_overview")
      .select(
        "id,name,debt_type,creditor_name,original_amount,monthly_amount,total_paid,remaining_amount,next_due_date,effective_status,due_mode",
      )
      .not("effective_status", "in", "(paid,cancelled)")
      .order("name"),
    supabase
      .from("bank_subscriptions_overview")
      .select(
        "id,name,provider,amount,billing_cycle,billing_day,payment_method_type,projection_mode,is_active,due_mode",
      )
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("bank_accounts")
      .select("id,name,account_type,origin,is_active")
      .eq("is_active", true)
      .order("display_order")
      .order("name"),
    supabase
      .from("bank_balance_snapshots")
      .select("account_id,balance_date,balance")
      .order("balance_date", { ascending: false })
      .limit(100),
  ]);

  const errors = [
    cardsResult.error,
    invoicesResult.error,
    incomeSourcesResult.error,
    receiptsResult.error,
    debtsResult.error,
    subscriptionsResult.error,
    accountsResult.error,
    balancesResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  const latestBalanceByAccount = new Map<
    string,
    { balance_date: string; balance: number }
  >();

  for (const row of balancesResult.data ?? []) {
    const accountId = String(row.account_id ?? "");
    if (!accountId || latestBalanceByAccount.has(accountId)) continue;

    latestBalanceByAccount.set(accountId, {
      balance_date: String(row.balance_date ?? ""),
      balance: Number(row.balance ?? 0),
    });
  }

  return {
    today,
    current_month: currentMonth,
    previous_month: monthStart(-1),
    rules: {
      notes_are_outside_projection: true,
      card_invoice_amount_is_total_invoice: true,
      debt_postpone_moves_next_due_one_month: true,
      writes_require_user_confirmation: true,
    },
    cards: cardsResult.data ?? [],
    invoice_history: invoicesResult.data ?? [],
    income_sources: incomeSourcesResult.data ?? [],
    current_income_receipts: receiptsResult.data ?? [],
    debts: debtsResult.data ?? [],
    subscriptions: subscriptionsResult.data ?? [],
    accounts: (accountsResult.data ?? []).map((row) => ({
      ...row,
      latest_balance:
        latestBalanceByAccount.get(String(row.id)) ?? null,
    })),
  };
}
