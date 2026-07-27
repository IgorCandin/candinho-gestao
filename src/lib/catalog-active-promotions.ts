import { createClient } from "@/lib/supabase/server";

export type CatalogActivePromotion = {
  productId: string;
  promotionName: string;
  currentPrice: number;
  promotionalPrice: number;
  discountPct: number;
  endsOn: string | null;
  availableQuantity: number;
};

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getActiveSupplementPromotionMap() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_storefront_snapshot", {
    p_limit: 500,
  });

  const result = new Map<string, CatalogActivePromotion>();
  if (error || !data || typeof data !== "object") return result;

  const payload = data as Record<string, unknown>;
  const promotions = (payload.promotions ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(promotions.supplements)
    ? promotions.supplements
    : [];

  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;

    if (String(row.promotion_status ?? "") !== "active") continue;
    if (String(row.stock_status ?? "") === "sold_out") continue;

    const productId = typeof row.product_id === "string" ? row.product_id : "";
    if (!productId) continue;

    const promotionalPrice = num(row.promotional_price);
    const currentPrice = num(row.current_price);
    const availableQuantity = num(row.available_quantity);
    if (promotionalPrice <= 0 || availableQuantity <= 0) continue;

    const promotion: CatalogActivePromotion = {
      productId,
      promotionName: String(row.promotion_name ?? "Promoção"),
      currentPrice,
      promotionalPrice,
      discountPct: num(row.discount_pct),
      endsOn: typeof row.ends_on === "string" ? row.ends_on : null,
      availableQuantity,
    };

    const existing = result.get(productId);
    if (!existing || promotion.promotionalPrice < existing.promotionalPrice) {
      result.set(productId, promotion);
    }
  }

  return result;
}
