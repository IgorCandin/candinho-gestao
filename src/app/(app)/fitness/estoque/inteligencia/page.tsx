import Link from "next/link";
import {
  ArrowLeft,
  Shirt,
  Truck,
} from "lucide-react";
import {
  FitnessInventoryIntelligenceDashboard,
  type FitnessInventoryAbcSummary,
  type FitnessInventoryIntelligenceRow,
  type FitnessInventoryIntelligenceSnapshot,
  type FitnessInventoryIntelligenceSummary,
} from "@/components/fitness-inventory-intelligence-dashboard";
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
): FitnessInventoryIntelligenceSummary {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    total_variants: number(source.total_variants),
    total_products: number(source.total_products),
    variants_with_stock: number(source.variants_with_stock),
    stock_cost_value: number(source.stock_cost_value),
    out_of_stock_variants: number(source.out_of_stock_variants),
    low_stock_variants: number(source.low_stock_variants),
    stagnant_variants_90d: number(source.stagnant_variants_90d),
    stagnant_capital_90d: number(source.stagnant_capital_90d),
    slow_variants_60d: number(source.slow_variants_60d),
    excess_variants: number(source.excess_variants),
    excess_capital: number(source.excess_capital),
    consigned_units: number(source.consigned_units),
    overdue_consigned_units: number(source.overdue_consigned_units),
    overdue_consignments: number(source.overdue_consignments),
    action_variants: number(source.action_variants),
    revenue_90d: number(source.revenue_90d),
    profit_90d: number(source.profit_90d),
  };
}

function normalizeAbc(value: unknown): FitnessInventoryAbcSummary[] {
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

function normalizeRows(value: unknown): FitnessInventoryIntelligenceRow[] {
  if (!Array.isArray(value)) return [];

  return value.map((entry) => {
    const row = entry as Record<string, unknown>;

    return {
      variant_id: String(row.variant_id ?? ""),
      product_id: String(row.product_id ?? ""),
      product_name: String(row.product_name ?? "Produto"),
      category: String(row.category ?? ""),
      image_url: nullableString(row.image_url),
      size: String(row.size ?? ""),
      color: String(row.color ?? ""),
      sku: nullableString(row.sku),
      cost_price: number(row.cost_price),
      sale_price: number(row.sale_price),
      minimum_stock: number(row.minimum_stock),
      reorder_target: number(row.reorder_target),
      default_supplier_id: nullableString(row.default_supplier_id),
      default_supplier_name: nullableString(row.default_supplier_name),
      physical_quantity: number(row.physical_quantity),
      reserved_quantity: number(row.reserved_quantity),
      available_quantity: number(row.available_quantity),
      incoming_quantity: number(row.incoming_quantity),
      consigned_quantity: number(row.consigned_quantity),
      stock_cost_value: number(row.stock_cost_value),
      stock_sale_value: number(row.stock_sale_value),
      stock_status: String(row.stock_status ?? ""),
      operational_status: String(row.operational_status ?? ""),
      quantity_below_minimum: number(row.quantity_below_minimum),
      suggested_reorder_quantity: number(row.suggested_reorder_quantity),
      variant_created_at: String(row.variant_created_at ?? ""),
      variant_age_days: number(row.variant_age_days),
      units_30d: number(row.units_30d),
      units_60d: number(row.units_60d),
      units_90d: number(row.units_90d),
      revenue_90d: number(row.revenue_90d),
      profit_90d: number(row.profit_90d),
      last_sale_on: nullableString(row.last_sale_on),
      days_since_last_sale:
        row.days_since_last_sale === null ||
        row.days_since_last_sale === undefined
          ? null
          : number(row.days_since_last_sale),
      open_consigned_quantity: number(row.open_consigned_quantity),
      overdue_consigned_quantity: number(row.overdue_consigned_quantity),
      overdue_consignment_count: number(row.overdue_consignment_count),
      weighted_daily_demand: number(row.weighted_daily_demand),
      excess_units: number(row.excess_units),
      excess_capital: number(row.excess_capital),
      coverage_days:
        row.coverage_days === null || row.coverage_days === undefined
          ? null
          : number(row.coverage_days),
      slow_stock_60d: Boolean(row.slow_stock_60d),
      stagnant_stock_90d: Boolean(row.stagnant_stock_90d),
      abc_class: String(row.abc_class ?? "N"),
      product_revenue_90d: number(row.product_revenue_90d),
      product_revenue_share_pct: number(row.product_revenue_share_pct),
      overstock: Boolean(row.overstock),
      top_action: String(row.top_action ?? "healthy"),
      action_priority: number(row.action_priority),
      stagnant_capital_90d: number(row.stagnant_capital_90d),
    };
  });
}

export default async function FitnessInventoryIntelligencePage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "fitness_inventory_intelligence_snapshot",
  );

  if (error) throw error;

  const source =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};

  const snapshot: FitnessInventoryIntelligenceSnapshot = {
    generated_at: nullableString(source.generated_at),
    summary: normalizeSummary(source.summary),
    abc: normalizeAbc(source.abc),
    rows: normalizeRows(source.rows),
  };

  return (
    <>
      <PageHeader
        eyebrow="Fitness · Estoque inteligente"
        title="O que preciso fazer com as peças hoje?"
        description="Curva ABC, variações zeradas, excesso, giro, peças em prova e capital parado por cor e tamanho."
        action={
          <div className="page-header-actions">
            <Link className="button ghost" href="/fitness/estoque">
              <ArrowLeft size={16} />
              Estoque
            </Link>

            <Link className="button ghost" href="/fitness/consignacoes">
              <Shirt size={16} />
              Consignações
            </Link>

            <Link className="button ghost" href="/fitness/pedidos/novo">
              <Truck size={16} />
              Novo pedido
            </Link>
          </div>
        }
      />

      <FitnessInventoryIntelligenceDashboard snapshot={snapshot} />
    </>
  );
}
