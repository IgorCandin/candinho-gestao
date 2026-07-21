import { createClient } from "@/lib/supabase/server";

export type CommercialIntegrityMetrics = {
  active_sales_without_items: number;
  confirmed_quotes_without_sale: number;
  quoted_quotes_with_sale: number;
  cancelled_sales_active_reservations: number;
  delivered_without_stock_deducted: number;
  finalized_not_paid_or_delivered: number;
  negative_stock_balances: number;
  negative_flavor_stock: number;
  reserved_gt_physical: number;
  fitness_negative_stock: number;
  sales_total_mismatch: number;
  sales_cost_mismatch: number;
  sales_profit_mismatch: number;
  confirmed_quote_total_mismatch: number;
  recent_received_without_payment_entry: number;
  legacy_received_without_payment_entry: number;
  calendar_pending: number;
  calendar_processing: number;
  calendar_errors: number;
  calendar_stuck: number;
  partner_sales_with_inactive_partner: number;
  post_sale_planned_without_sale: number;
  post_sale_completed_sales_open: number;
};

export type CommercialIntegritySnapshot = {
  generated_at: string;
  payment_entry_cutover: string;
  status:
    | "healthy"
    | "attention"
    | "critical";
  critical_count: number;
  attention_count: number;
  metrics: CommercialIntegrityMetrics;
};

const emptyMetrics:
  CommercialIntegrityMetrics = {
    active_sales_without_items: 0,
    confirmed_quotes_without_sale: 0,
    quoted_quotes_with_sale: 0,
    cancelled_sales_active_reservations: 0,
    delivered_without_stock_deducted: 0,
    finalized_not_paid_or_delivered: 0,
    negative_stock_balances: 0,
    negative_flavor_stock: 0,
    reserved_gt_physical: 0,
    fitness_negative_stock: 0,
    sales_total_mismatch: 0,
    sales_cost_mismatch: 0,
    sales_profit_mismatch: 0,
    confirmed_quote_total_mismatch: 0,
    recent_received_without_payment_entry: 0,
    legacy_received_without_payment_entry: 0,
    calendar_pending: 0,
    calendar_processing: 0,
    calendar_errors: 0,
    calendar_stuck: 0,
    partner_sales_with_inactive_partner: 0,
    post_sale_planned_without_sale: 0,
    post_sale_completed_sales_open: 0,
  };

function number(value: unknown) {
  return Number(value ?? 0);
}

export async function getCommercialIntegritySnapshot():
  Promise<CommercialIntegritySnapshot> {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase.rpc(
      "erp_commercial_integrity_snapshot",
    );

  if (error) throw error;

  const payload =
    data &&
    typeof data === "object"
      ? data as Record<
          string,
          unknown
        >
      : {};

  const source =
    payload.metrics &&
    typeof payload.metrics ===
      "object"
      ? payload.metrics as Record<
          string,
          unknown
        >
      : {};

  const metrics = {
    ...emptyMetrics,
    ...Object.fromEntries(
      Object.keys(
        emptyMetrics,
      ).map(
        (key) => [
          key,
          number(source[key]),
        ],
      ),
    ),
  } as CommercialIntegrityMetrics;

  const rawStatus =
    typeof payload.status ===
      "string"
      ? payload.status
      : "healthy";

  const status:
    CommercialIntegritySnapshot["status"] =
      rawStatus === "critical"
        ? "critical"
        : rawStatus ===
            "attention"
          ? "attention"
          : "healthy";

  return {
    generated_at:
      typeof payload.generated_at ===
      "string"
        ? payload.generated_at
        : new Date().toISOString(),
    payment_entry_cutover:
      typeof payload.payment_entry_cutover ===
      "string"
        ? payload.payment_entry_cutover
        : "",
    status,
    critical_count:
      number(
        payload.critical_count,
      ),
    attention_count:
      number(
        payload.attention_count,
      ),
    metrics,
  };
}
