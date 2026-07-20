import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  PackageSearch,
} from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import {
  InventoryIntelligenceDashboard,
  type InventoryAbcSummary,
  type InventoryIntelligenceRow,
  type InventoryIntelligenceSnapshot,
  type InventoryIntelligenceSummary,
} from "@/components/inventory-intelligence-dashboard";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

function number(value: unknown) {
  return Number(value ?? 0);
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function normalizeSummary(
  value: unknown,
): InventoryIntelligenceSummary {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    total_products: number(source.total_products),
    products_with_stock: number(source.products_with_stock),
    stock_cost_value: number(source.stock_cost_value),
    stagnant_products_90d: number(source.stagnant_products_90d),
    stagnant_capital_90d: number(source.stagnant_capital_90d),
    slow_products_60d: number(source.slow_products_60d),
    excess_products: number(source.excess_products),
    excess_capital: number(source.excess_capital),
    critical_products: number(source.critical_products),
    urgent_products: number(source.urgent_products),
    attention_products: number(source.attention_products),
    expired_units: number(source.expired_units),
    expires_30_units: number(source.expires_30_units),
    expires_60_units: number(source.expires_60_units),
    expires_90_units: number(source.expires_90_units),
    quarantined_units: number(source.quarantined_units),
    action_products: number(source.action_products),
    abc_a: number(source.abc_a),
    abc_b: number(source.abc_b),
    abc_c: number(source.abc_c),
    abc_n: number(source.abc_n),
    revenue_90d: number(source.revenue_90d),
    profit_90d: number(source.profit_90d),
  };
}

function normalizeAbc(value: unknown): InventoryAbcSummary[] {
  if (!Array.isArray(value)) return [];

  return value.map((entry) => {
    const row = entry as Record<string, unknown>;

    return {
      abc_class: String(row.abc_class ?? "N"),
      products: number(row.products),
      revenue_90d: number(row.revenue_90d),
      stock_cost_value: number(row.stock_cost_value),
      physical_units: number(row.physical_units),
    };
  });
}

function normalizeRows(value: unknown): InventoryIntelligenceRow[] {
  if (!Array.isArray(value)) return [];

  return value.map((entry) => {
    const row = entry as Record<string, unknown>;

    return {
      product_id: String(row.product_id ?? ""),
      product_name: String(row.product_name ?? "Produto"),
      category: String(row.category ?? ""),
      brand: nullableString(row.brand),
      image_url: nullableString(row.image_url),
      cost_price: number(row.cost_price),
      sale_price: number(row.sale_price),
      min_stock: number(row.min_stock),
      ideal_stock: number(row.ideal_stock),
      supplier_id: nullableString(row.supplier_id),
      supplier_name: nullableString(row.supplier_name),
      lead_time_days: number(row.lead_time_days),
      target_cover_days: number(row.target_cover_days),
      flavor_tracking_enabled: Boolean(row.flavor_tracking_enabled),
      lot_tracking_enabled: Boolean(row.lot_tracking_enabled),
      product_created_at: String(row.product_created_at ?? ""),
      product_age_days: number(row.product_age_days),
      physical_quantity: number(row.physical_quantity),
      reserved_quantity: number(row.reserved_quantity),
      available_quantity: number(row.available_quantity),
      incoming_quantity: number(row.incoming_quantity),
      backlog_quantity: number(row.backlog_quantity),
      weighted_daily_demand: number(row.weighted_daily_demand),
      coverage_days:
        row.coverage_days === null || row.coverage_days === undefined
          ? null
          : number(row.coverage_days),
      target_units: number(row.target_units),
      suggested_order_quantity: number(row.suggested_order_quantity),
      estimated_order_cost: number(row.estimated_order_cost),
      purchase_priority: String(row.purchase_priority ?? "ok"),
      estimated_stockout_on: nullableString(row.estimated_stockout_on),
      units_30d: number(row.units_30d),
      units_90d: number(row.units_90d),
      revenue_90d: number(row.revenue_90d),
      profit_90d: number(row.profit_90d),
      last_sale_at_all: nullableString(row.last_sale_at_all),
      days_since_last_sale:
        row.days_since_last_sale === null ||
        row.days_since_last_sale === undefined
          ? null
          : number(row.days_since_last_sale),
      expired_units: number(row.expired_units),
      expires_30_units: number(row.expires_30_units),
      expires_60_units: number(row.expires_60_units),
      expires_90_units: number(row.expires_90_units),
      quarantined_units: number(row.quarantined_units),
      stock_cost_value: number(row.stock_cost_value),
      excess_units: number(row.excess_units),
      excess_capital: number(row.excess_capital),
      total_revenue_90d: number(row.total_revenue_90d),
      cumulative_revenue_90d: number(row.cumulative_revenue_90d),
      abc_class: String(row.abc_class ?? "N"),
      revenue_share_pct: number(row.revenue_share_pct),
      cumulative_revenue_share_pct: number(
        row.cumulative_revenue_share_pct,
      ),
      slow_stock_60d: Boolean(row.slow_stock_60d),
      stagnant_stock_90d: Boolean(row.stagnant_stock_90d),
      overstock: Boolean(row.overstock),
      top_action: String(row.top_action ?? "healthy"),
      action_priority: number(row.action_priority),
      stagnant_capital_90d: number(row.stagnant_capital_90d),
    };
  });
}

export default async function InventoryIntelligencePage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "inventory_intelligence_snapshot",
  );

  if (error) throw error;

  const source =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};

  const snapshot: InventoryIntelligenceSnapshot = {
    generated_at: nullableString(source.generated_at),
    summary: normalizeSummary(source.summary),
    abc: normalizeAbc(source.abc),
    rows: normalizeRows(source.rows),
  };

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Estoque · Inteligência"
        title="O que preciso fazer com meu estoque hoje?"
        description="Curva ABC, capital parado, excesso, giro, cobertura, risco de ruptura e validade em uma visão executiva."
        action={
          <div className="page-header-actions">
            <Link className="button ghost" href="/estoque">
              <ArrowLeft size={16} />
              Estoque
            </Link>

            <Link
              className="button ghost"
              href="/pedidos-fornecedor/planejamento"
            >
              <PackageSearch size={16} />
              Planejar compras
            </Link>

            <Link className="button ghost" href="/estoque/lotes">
              <CalendarClock size={16} />
              Lotes
            </Link>
          </div>
        }
      />

      <InventoryIntelligenceDashboard snapshot={snapshot} />
    </>
  );
}
