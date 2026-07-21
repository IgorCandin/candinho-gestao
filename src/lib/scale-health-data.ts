import { createClient } from "./supabase/server";

export type ScaleHealthSnapshot = {
  generated_at: string;
  sales: number;
  sale_items: number;
  customers: number;
  inventory_movements: number;
  inventory_history: number;
  fitness_inventory_movements: number;
  fitness_purchase_orders: number;
  fitness_purchase_order_items: number;
  central_messages: number;
  central_webhook_events: number;
  audit_events: number;
};

const number = (value: unknown) =>
  Number(value ?? 0);

export async function getScaleHealthSnapshot():
  Promise<ScaleHealthSnapshot> {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase.rpc(
      "erp_scale_health_snapshot",
    );

  if (error) throw error;

  const row =
    data &&
    typeof data === "object"
      ? (data as Record<
          string,
          unknown
        >)
      : {};

  return {
    generated_at:
      typeof row.generated_at ===
      "string"
        ? row.generated_at
        : new Date().toISOString(),
    sales: number(row.sales),
    sale_items: number(
      row.sale_items,
    ),
    customers: number(
      row.customers,
    ),
    inventory_movements:
      number(
        row.inventory_movements,
      ),
    inventory_history:
      number(
        row.inventory_history,
      ),
    fitness_inventory_movements:
      number(
        row.fitness_inventory_movements,
      ),
    fitness_purchase_orders:
      number(
        row.fitness_purchase_orders,
      ),
    fitness_purchase_order_items:
      number(
        row.fitness_purchase_order_items,
      ),
    central_messages:
      number(
        row.central_messages,
      ),
    central_webhook_events:
      number(
        row.central_webhook_events,
      ),
    audit_events:
      number(
        row.audit_events,
      ),
  };
}
