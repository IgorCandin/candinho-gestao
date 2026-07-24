import type {
  FitnessProductRow,
  FitnessStockRow,
  ProductCatalogRow,
  SaleStockOption,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export type ActivePromotionRow = {
  promotion_item_id: string;
  promotion_id: string;
  promotion_name: string;
  starts_on: string | null;
  ends_on: string | null;
  operation_scope: "supplements" | "fitness";
  supplement_product_id: string | null;
  fitness_variant_id: string | null;
  fitness_product_id: string | null;
  item_label: string;
  category: string | null;
  image_url: string | null;
  current_price: number;
  effective_promotional_price: number;
  effective_discount_pct: number;
  available_quantity: number;
  incoming_quantity: number;
  quantity_limit: number | null;
};

export type PromotedSupplementProduct = ProductCatalogRow & {
  regular_sale_price: number;
  regular_installment_price: number;
  promotion_price: number | null;
  promotion_name: string | null;
  promotion_ends_on: string | null;
  promotion_discount_pct: number;
};

export type PromotedFitnessProduct = FitnessProductRow & {
  regular_min_sale_price: number;
  regular_max_sale_price: number;
  promotion_price_from: number | null;
  promotion_price_to: number | null;
  promotion_name: string | null;
  promotion_ends_on: string | null;
  promotion_variant_count: number;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export async function getActivePromotionRows(): Promise<ActivePromotionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "active_operation_promotion_snapshot",
  );

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    promotion_item_id: String(row.promotion_item_id),
    promotion_id: String(row.promotion_id),
    promotion_name: String(row.promotion_name ?? "Promoção"),
    starts_on: nullableText(row.starts_on),
    ends_on: nullableText(row.ends_on),
    operation_scope:
      row.operation_scope === "fitness" ? "fitness" : "supplements",
    supplement_product_id: nullableText(row.supplement_product_id),
    fitness_variant_id: nullableText(row.fitness_variant_id),
    fitness_product_id: nullableText(row.fitness_product_id),
    item_label: String(row.item_label ?? "Produto"),
    category: nullableText(row.category),
    image_url: nullableText(row.image_url),
    current_price: numberValue(row.current_price),
    effective_promotional_price: numberValue(
      row.effective_promotional_price,
    ),
    effective_discount_pct: numberValue(row.effective_discount_pct),
    available_quantity: numberValue(row.available_quantity),
    incoming_quantity: numberValue(row.incoming_quantity),
    quantity_limit:
      row.quantity_limit == null ? null : numberValue(row.quantity_limit),
  }));
}

function usable(rows: ActivePromotionRow[]) {
  return rows.filter(
    (row) =>
      row.available_quantity > 0 &&
      row.effective_promotional_price >= 0 &&
      row.effective_promotional_price < row.current_price,
  );
}

function bestBySupplement(rows: ActivePromotionRow[]) {
  const map = new Map<string, ActivePromotionRow>();

  for (const row of usable(rows)) {
    if (!row.supplement_product_id) continue;
    const current = map.get(row.supplement_product_id);
    if (
      !current ||
      row.effective_promotional_price < current.effective_promotional_price
    ) {
      map.set(row.supplement_product_id, row);
    }
  }

  return map;
}

function bestByVariant(rows: ActivePromotionRow[]) {
  const map = new Map<string, ActivePromotionRow>();

  for (const row of usable(rows)) {
    if (!row.fitness_variant_id) continue;
    const current = map.get(row.fitness_variant_id);
    if (
      !current ||
      row.effective_promotional_price < current.effective_promotional_price
    ) {
      map.set(row.fitness_variant_id, row);
    }
  }

  return map;
}

export function applySupplementCatalogPromotions(
  products: ProductCatalogRow[],
  rows: ActivePromotionRow[],
): PromotedSupplementProduct[] {
  const map = bestBySupplement(rows);

  return products.map((product) => {
    const promotion = map.get(product.id);
    return {
      ...product,
      regular_sale_price: product.sale_price,
      regular_installment_price: product.installment_price,
      sale_price: promotion?.effective_promotional_price ?? product.sale_price,
      promotion_price: promotion?.effective_promotional_price ?? null,
      promotion_name: promotion?.promotion_name ?? null,
      promotion_ends_on: promotion?.ends_on ?? null,
      promotion_discount_pct: promotion?.effective_discount_pct ?? 0,
    };
  });
}

export function applySupplementSalePromotions(
  stock: SaleStockOption[],
  rows: ActivePromotionRow[],
): SaleStockOption[] {
  const map = bestBySupplement(rows);

  return stock.map((item) => {
    const promotion = map.get(item.product_id);
    return promotion
      ? { ...item, sale_price: promotion.effective_promotional_price }
      : item;
  });
}

export function applyFitnessStockPromotions(
  stock: FitnessStockRow[],
  rows: ActivePromotionRow[],
): FitnessStockRow[] {
  const map = bestByVariant(rows);

  return stock.map((item) => {
    const promotion = map.get(item.variant_id);
    return promotion
      ? { ...item, sale_price: promotion.effective_promotional_price }
      : item;
  });
}

export function applyFitnessCatalogPromotions(
  products: FitnessProductRow[],
  rows: ActivePromotionRow[],
): PromotedFitnessProduct[] {
  const grouped = new Map<string, ActivePromotionRow[]>();

  for (const row of usable(rows)) {
    if (!row.fitness_product_id) continue;
    const current = grouped.get(row.fitness_product_id) ?? [];
    current.push(row);
    grouped.set(row.fitness_product_id, current);
  }

  return products.map((product) => {
    const promotions = grouped.get(product.id) ?? [];
    const prices = promotions.map(
      (row) => row.effective_promotional_price,
    );
    const names = [
      ...new Set(promotions.map((row) => row.promotion_name)),
    ];
    const ends = promotions
      .map((row) => row.ends_on)
      .filter((value): value is string => Boolean(value))
      .sort();

    const promotionFrom = prices.length ? Math.min(...prices) : null;
    const promotionTo = prices.length ? Math.max(...prices) : null;

    return {
      ...product,
      regular_min_sale_price: product.min_sale_price,
      regular_max_sale_price: product.max_sale_price,
      min_sale_price:
        promotionFrom == null ? product.min_sale_price : promotionFrom,
      max_sale_price:
        promotionTo == null
          ? product.max_sale_price
          : Math.max(promotionTo, product.max_sale_price),
      promotion_price_from: promotionFrom,
      promotion_price_to: promotionTo,
      promotion_name:
        names.length === 1
          ? names[0]
          : names.length
            ? "Promoção ativa"
            : null,
      promotion_ends_on: ends[0] ?? null,
      promotion_variant_count: promotions.length,
    };
  });
}

export function getSupplementPromotion(
  productId: string,
  rows: ActivePromotionRow[],
) {
  return bestBySupplement(rows).get(productId) ?? null;
}

export function getFitnessProductPromotions(
  productId: string,
  rows: ActivePromotionRow[],
) {
  return usable(rows).filter(
    (row) => row.fitness_product_id === productId,
  );
}
