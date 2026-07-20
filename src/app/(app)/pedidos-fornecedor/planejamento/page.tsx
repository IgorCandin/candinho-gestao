import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import {
  PurchasePlanner,
  type PurchasePlanningSnapshot,
} from "@/components/purchase-planner";
import { createClient } from "@/lib/supabase/server";

function normalizeSnapshot(
  source: Record<string, unknown>,
): PurchasePlanningSnapshot {
  const summarySource =
    source.summary &&
    typeof source.summary === "object"
      ? (source.summary as Record<string, unknown>)
      : {};

  const rowsSource = Array.isArray(source.rows)
    ? source.rows
    : [];

  const suppliersSource = Array.isArray(source.suppliers)
    ? source.suppliers
    : [];

  return {
    generated_at:
      typeof source.generated_at === "string"
        ? source.generated_at
        : null,

    summary: {
      critical_products: Number(
        summarySource.critical_products ?? 0,
      ),
      urgent_products: Number(
        summarySource.urgent_products ?? 0,
      ),
      attention_products: Number(
        summarySource.attention_products ?? 0,
      ),
      suggested_products: Number(
        summarySource.suggested_products ?? 0,
      ),
      suggested_units: Number(
        summarySource.suggested_units ?? 0,
      ),
      suggested_investment: Number(
        summarySource.suggested_investment ?? 0,
      ),
      suggested_sale_value: Number(
        summarySource.suggested_sale_value ?? 0,
      ),
      suggested_potential_profit: Number(
        summarySource.suggested_potential_profit ?? 0,
      ),
      without_supplier: Number(
        summarySource.without_supplier ?? 0,
      ),
    },

    rows: rowsSource.map((value) => {
      const row = value as Record<string, unknown>;

      return {
        product_id: String(row.product_id ?? ""),
        product_name: String(
          row.product_name ?? "Produto",
        ),
        category: String(row.category ?? ""),
        brand:
          typeof row.brand === "string"
            ? row.brand
            : null,
        image_url:
          typeof row.image_url === "string"
            ? row.image_url
            : null,
        cost_price: Number(row.cost_price ?? 0),
        sale_price: Number(row.sale_price ?? 0),
        min_stock: Number(row.min_stock ?? 0),
        ideal_stock: Number(row.ideal_stock ?? 0),
        supplier_id:
          typeof row.supplier_id === "string"
            ? row.supplier_id
            : null,
        supplier_name:
          typeof row.supplier_name === "string"
            ? row.supplier_name
            : null,
        lead_time_days: Number(
          row.lead_time_days ?? 7,
        ),
        target_cover_days: Number(
          row.target_cover_days ?? 30,
        ),
        minimum_order_amount: Number(
          row.minimum_order_amount ?? 0,
        ),
        free_shipping_threshold: Number(
          row.free_shipping_threshold ?? 0,
        ),
        payment_terms:
          typeof row.payment_terms === "string"
            ? row.payment_terms
            : null,
        freight_notes:
          typeof row.freight_notes === "string"
            ? row.freight_notes
            : null,
        flavor_tracking_enabled: Boolean(
          row.flavor_tracking_enabled,
        ),
        sold_30d: Number(row.sold_30d ?? 0),
        sold_60d: Number(row.sold_60d ?? 0),
        sold_90d: Number(row.sold_90d ?? 0),
        last_sale_at:
          typeof row.last_sale_at === "string"
            ? row.last_sale_at
            : null,
        sales_90d_count: Number(
          row.sales_90d_count ?? 0,
        ),
        physical_quantity: Number(
          row.physical_quantity ?? 0,
        ),
        reserved_quantity: Number(
          row.reserved_quantity ?? 0,
        ),
        available_quantity: Number(
          row.available_quantity ?? 0,
        ),
        incoming_quantity: Number(
          row.incoming_quantity ?? 0,
        ),
        backlog_quantity: Number(
          row.backlog_quantity ?? 0,
        ),
        weighted_daily_demand: Number(
          row.weighted_daily_demand ?? 0,
        ),
        coverage_days:
          row.coverage_days === null ||
          row.coverage_days === undefined
            ? null
            : Number(row.coverage_days),
        target_units: Number(
          row.target_units ?? 0,
        ),
        suggested_order_quantity: Number(
          row.suggested_order_quantity ?? 0,
        ),
        estimated_order_cost: Number(
          row.estimated_order_cost ?? 0,
        ),
        estimated_order_sale_value: Number(
          row.estimated_order_sale_value ?? 0,
        ),
        estimated_order_potential_profit: Number(
          row.estimated_order_potential_profit ?? 0,
        ),
        purchase_priority: String(
          row.purchase_priority ?? "ok",
        ),
        estimated_stockout_on:
          typeof row.estimated_stockout_on === "string"
            ? row.estimated_stockout_on
            : null,
        days_since_last_sale:
          row.days_since_last_sale === null ||
          row.days_since_last_sale === undefined
            ? null
            : Number(row.days_since_last_sale),
        needs_flavor_distribution: Boolean(
          row.needs_flavor_distribution,
        ),
      };
    }),

    suppliers: suppliersSource.map((value) => {
      const row = value as Record<string, unknown>;

      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? "Fornecedor"),
        notes:
          typeof row.notes === "string"
            ? row.notes
            : null,
        lead_time_days: Number(
          row.lead_time_days ?? 7,
        ),
        target_cover_days: Number(
          row.target_cover_days ?? 30,
        ),
        minimum_order_amount: Number(
          row.minimum_order_amount ?? 0,
        ),
        free_shipping_threshold: Number(
          row.free_shipping_threshold ?? 0,
        ),
        payment_terms:
          typeof row.payment_terms === "string"
            ? row.payment_terms
            : null,
        freight_notes:
          typeof row.freight_notes === "string"
            ? row.freight_notes
            : null,
        suggested_products: Number(
          row.suggested_products ?? 0,
        ),
        suggested_units: Number(
          row.suggested_units ?? 0,
        ),
        suggested_order_cost: Number(
          row.suggested_order_cost ?? 0,
        ),
        critical_products: Number(
          row.critical_products ?? 0,
        ),
        urgent_products: Number(
          row.urgent_products ?? 0,
        ),
        gap_to_minimum_order: Number(
          row.gap_to_minimum_order ?? 0,
        ),
        gap_to_free_shipping: Number(
          row.gap_to_free_shipping ?? 0,
        ),
      };
    }),
  };
}

export default async function PurchasePlanningPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "purchase_planning_snapshot",
  );

  if (error) throw error;

  const source =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};

  const snapshot = normalizeSnapshot(source);

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Compras · Inteligência"
        title="Planejador de compras e reposição"
        description="Veja onde existe risco de ruptura, quanto o estoque ainda cobre e uma sugestão de compra baseada no giro real da operação."
        action={
          <div className="page-header-actions">
            <Link
              className="button gold"
              href="/pedidos-fornecedor/novo"
            >
              <Plus size={16} />
              Novo pedido
            </Link>

            <Link
              className="button ghost"
              href="/pedidos-fornecedor"
            >
              <ArrowLeft size={16} />
              Pedidos
            </Link>
          </div>
        }
      />

      <PurchasePlanner snapshot={snapshot} />
    </>
  );
}
