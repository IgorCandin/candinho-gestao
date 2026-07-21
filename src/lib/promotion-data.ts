import { createClient } from "@/lib/supabase/server";

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type PromotionOverview = {
  id: string;
  name: string;
  operation_scope: "supplements" | "fitness" | "both";
  status: "draft" | "scheduled" | "active" | "ended" | "cancelled";
  effective_status: "draft" | "scheduled" | "active" | "ended" | "cancelled";
  objective: string;
  promotion_type: string;
  default_discount_pct: number;
  coupon_code: string | null;
  starts_on: string | null;
  ends_on: string | null;
  channels: string[];
  notes: string | null;
  result_revenue: number | null;
  result_profit: number | null;
  result_units: number | null;
  result_notes: string | null;
  item_count: number;
  supplement_item_count: number;
  fitness_item_count: number;
  created_at: string;
  updated_at: string;
};

export type PromotionSuggestion = {
  suggestion_key: string;
  operation_scope: "supplements" | "fitness";
  entity_id: string;
  entity_label: string;
  category: string | null;
  image_url: string | null;
  current_price: number;
  cost_price: number;
  available_quantity: number;
  units_30d: number;
  units_90d: number;
  days_since_last_sale: number | null;
  score: number;
  reason: string;
  recommended_action: string;
  recommended_discount_pct: number;
  recommended_price: number;
  protected_price: boolean;
};

export type PromotionItem = {
  id: string;
  promotion_id: string;
  operation_scope: "supplements" | "fitness";
  supplement_product_id: string | null;
  fitness_variant_id: string | null;
  item_role: "discounted" | "anchor" | "cross_sell";
  discount_pct: number | null;
  promotional_price: number | null;
  quantity_limit: number | null;
  item_label: string;
  category: string | null;
  image_url: string | null;
  current_price: number;
  cost_price: number;
};

export type PromotionProductOption = {
  id: string;
  label: string;
  meta: string;
  currentPrice: number;
  availableQuantity: number;
};

function mapPromotion(row: Record<string, unknown>): PromotionOverview {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    operation_scope: String(row.operation_scope) as PromotionOverview["operation_scope"],
    status: String(row.status) as PromotionOverview["status"],
    effective_status: String(row.effective_status) as PromotionOverview["effective_status"],
    objective: String(row.objective ?? "stock_turnover"),
    promotion_type: String(row.promotion_type ?? "percentage"),
    default_discount_pct: numberValue(row.default_discount_pct),
    coupon_code: row.coupon_code ? String(row.coupon_code) : null,
    starts_on: row.starts_on ? String(row.starts_on) : null,
    ends_on: row.ends_on ? String(row.ends_on) : null,
    channels: Array.isArray(row.channels) ? row.channels.map(String) : [],
    notes: row.notes ? String(row.notes) : null,
    result_revenue: row.result_revenue == null ? null : numberValue(row.result_revenue),
    result_profit: row.result_profit == null ? null : numberValue(row.result_profit),
    result_units: row.result_units == null ? null : numberValue(row.result_units),
    result_notes: row.result_notes ? String(row.result_notes) : null,
    item_count: numberValue(row.item_count),
    supplement_item_count: numberValue(row.supplement_item_count),
    fitness_item_count: numberValue(row.fitness_item_count),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function getPromotionsCenter() {
  const supabase = await createClient();

  const [promotionsResult, suggestionsResult] = await Promise.all([
    supabase
      .from("central_promotions_overview")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.rpc("central_promotion_suggestions", {
      p_operation: null,
      p_limit: 30,
    }),
  ]);

  if (promotionsResult.error) {
    throw new Error(`Falha ao carregar promoções: ${promotionsResult.error.message}`);
  }

  if (suggestionsResult.error) {
    throw new Error(`Falha ao gerar sugestões: ${suggestionsResult.error.message}`);
  }

  const promotions = (promotionsResult.data ?? []).map((row) =>
    mapPromotion(row as Record<string, unknown>),
  );

  const suggestions: PromotionSuggestion[] = (suggestionsResult.data ?? []).map(
    (row: Record<string, unknown>) => ({
      suggestion_key: String(row.suggestion_key),
      operation_scope: String(row.operation_scope) as PromotionSuggestion["operation_scope"],
      entity_id: String(row.entity_id),
      entity_label: String(row.entity_label ?? ""),
      category: row.category ? String(row.category) : null,
      image_url: row.image_url ? String(row.image_url) : null,
      current_price: numberValue(row.current_price),
      cost_price: numberValue(row.cost_price),
      available_quantity: numberValue(row.available_quantity),
      units_30d: numberValue(row.units_30d),
      units_90d: numberValue(row.units_90d),
      days_since_last_sale:
        row.days_since_last_sale == null ? null : numberValue(row.days_since_last_sale),
      score: numberValue(row.score),
      reason: String(row.reason ?? ""),
      recommended_action: String(row.recommended_action ?? ""),
      recommended_discount_pct: numberValue(row.recommended_discount_pct),
      recommended_price: numberValue(row.recommended_price),
      protected_price: Boolean(row.protected_price),
    }),
  );

  return { promotions, suggestions };
}

export async function getPromotionDetail(id: string) {
  const supabase = await createClient();

  const [
    promotionResult,
    itemsResult,
    supplementProductsResult,
    fitnessVariantsResult,
  ] = await Promise.all([
    supabase
      .from("central_promotions_overview")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("central_promotion_items_overview")
      .select("*")
      .eq("promotion_id", id)
      .order("operation_scope")
      .order("item_label"),
    supabase
      .from("products")
      .select("id,name,category,sales_category,sale_price,active")
      .eq("active", true)
      .order("name"),
    supabase
      .from("fitness_stock_overview")
      .select(
        "variant_id,product_name,category,size,color,sale_price,available_quantity,product_active,variant_active",
      )
      .eq("product_active", true)
      .eq("variant_active", true)
      .order("product_name"),
  ]);

  if (promotionResult.error) {
    throw new Error(`Falha ao carregar promoção: ${promotionResult.error.message}`);
  }

  if (!promotionResult.data) return null;

  if (itemsResult.error) {
    throw new Error(`Falha ao carregar itens: ${itemsResult.error.message}`);
  }

  if (supplementProductsResult.error) {
    throw new Error(
      `Falha ao carregar produtos de Suplementos: ${supplementProductsResult.error.message}`,
    );
  }

  if (fitnessVariantsResult.error) {
    throw new Error(
      `Falha ao carregar produtos da Fitness: ${fitnessVariantsResult.error.message}`,
    );
  }

  const items: PromotionItem[] = (itemsResult.data ?? []).map(
    (row: Record<string, unknown>) => ({
      id: String(row.id),
      promotion_id: String(row.promotion_id),
      operation_scope: String(row.operation_scope) as PromotionItem["operation_scope"],
      supplement_product_id: row.supplement_product_id
        ? String(row.supplement_product_id)
        : null,
      fitness_variant_id: row.fitness_variant_id
        ? String(row.fitness_variant_id)
        : null,
      item_role: String(row.item_role) as PromotionItem["item_role"],
      discount_pct: row.discount_pct == null ? null : numberValue(row.discount_pct),
      promotional_price:
        row.promotional_price == null ? null : numberValue(row.promotional_price),
      quantity_limit:
        row.quantity_limit == null ? null : numberValue(row.quantity_limit),
      item_label: String(row.item_label ?? ""),
      category: row.category ? String(row.category) : null,
      image_url: row.image_url ? String(row.image_url) : null,
      current_price: numberValue(row.current_price),
      cost_price: numberValue(row.cost_price),
    }),
  );

  const supplementOptions: PromotionProductOption[] = (
    supplementProductsResult.data ?? []
  )
    .filter(
      (row) => String(row.sales_category ?? "").toUpperCase() !== "Z",
    )
    .map((row) => ({
      id: String(row.id),
      label: String(row.name),
      meta: `${String(row.category ?? "Sem categoria")} · curva ${String(
        row.sales_category ?? "—",
      )}`,
      currentPrice: numberValue(row.sale_price),
      availableQuantity: 0,
    }));

  const fitnessOptions: PromotionProductOption[] = (
    fitnessVariantsResult.data ?? []
  ).map((row) => ({
    id: String(row.variant_id),
    label: [row.product_name, row.size, row.color].filter(Boolean).join(" · "),
    meta: String(row.category ?? "Fitness"),
    currentPrice: numberValue(row.sale_price),
    availableQuantity: numberValue(row.available_quantity),
  }));

  return {
    promotion: mapPromotion(promotionResult.data as Record<string, unknown>),
    items,
    supplementOptions,
    fitnessOptions,
  };
}
