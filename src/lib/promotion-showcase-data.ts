import { createClient } from "@/lib/supabase/server";

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type PromotionShowcaseItem = {
  id: string;
  promotion_id: string;
  promotion_name: string;
  promotion_status: "active" | "scheduled";
  operation_scope: "supplements" | "fitness";
  item_label: string;
  category: string | null;
  image_url: string | null;
  current_price: number;
  promotional_price: number;
  discount_pct: number;
  item_role: string;
  starts_on: string | null;
  ends_on: string | null;
  coupon_code: string | null;
  notes: string | null;
  available_quantity: number;
  stock_status: "available" | "sold_out";
};

function promotionalPrice(
  currentPrice: number,
  explicitPrice: unknown,
  discountValue: unknown,
) {
  if (explicitPrice != null) return numberValue(explicitPrice);
  const discount = numberValue(discountValue);
  if (discount <= 0) return currentPrice;
  return Math.max(0, currentPrice * (1 - discount / 100));
}

function mapItem(
  row: Record<string, unknown>,
  promotion: Record<string, unknown>,
): PromotionShowcaseItem {
  const currentPrice = numberValue(row.current_price);
  const availableQuantity = numberValue(row.available_quantity);

  return {
    id: String(row.id),
    promotion_id: String(row.promotion_id),
    promotion_name: String(promotion.name ?? "Promoção"),
    promotion_status: String(
      promotion.effective_status,
    ) as PromotionShowcaseItem["promotion_status"],
    operation_scope: String(
      row.operation_scope,
    ) as PromotionShowcaseItem["operation_scope"],
    item_label: String(row.item_label ?? "Produto"),
    category: typeof row.category === "string" ? row.category : null,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    current_price: currentPrice,
    promotional_price: promotionalPrice(
      currentPrice,
      row.promotional_price,
      row.discount_pct,
    ),
    discount_pct: numberValue(row.discount_pct),
    item_role: String(row.item_role ?? "discounted"),
    starts_on:
      typeof promotion.starts_on === "string" ? promotion.starts_on : null,
    ends_on: typeof promotion.ends_on === "string" ? promotion.ends_on : null,
    coupon_code:
      typeof promotion.coupon_code === "string" ? promotion.coupon_code : null,
    notes: typeof promotion.notes === "string" ? promotion.notes : null,
    available_quantity: availableQuantity,
    stock_status: availableQuantity > 0 ? "available" : "sold_out",
  };
}

export async function getPromotionShowcase() {
  const supabase = await createClient();

  const { data: promotions, error: promotionsError } = await supabase
    .from("central_promotions_overview")
    .select("id,name,effective_status,starts_on,ends_on,coupon_code,notes")
    .in("effective_status", ["active", "scheduled"])
    .order("starts_on", { ascending: true, nullsFirst: false });

  if (promotionsError) {
    throw new Error(`Falha ao carregar promoções: ${promotionsError.message}`);
  }

  if (!promotions || promotions.length === 0) {
    return {
      supplements: [] as PromotionShowcaseItem[],
      fitness: [] as PromotionShowcaseItem[],
    };
  }

  const promotionMap = new Map(
    promotions.map((promotion) => [String(promotion.id), promotion]),
  );

  const { data: items, error: itemsError } = await supabase
    .from("central_promotion_items_overview")
    .select("*")
    .in(
      "promotion_id",
      promotions.map((promotion) => String(promotion.id)),
    )
    .order("item_label");

  if (itemsError) {
    throw new Error(
      `Falha ao carregar produtos promocionais: ${itemsError.message}`,
    );
  }

  const mapped = (items ?? [])
    .map((row) => {
      const promotion = promotionMap.get(String(row.promotion_id));
      if (!promotion) return null;
      return mapItem(
        row as Record<string, unknown>,
        promotion as Record<string, unknown>,
      );
    })
    .filter((item): item is PromotionShowcaseItem => Boolean(item));

  return {
    supplements: mapped.filter(
      (item) => item.operation_scope === "supplements",
    ),
    fitness: mapped.filter((item) => item.operation_scope === "fitness"),
  };
}

export async function getPromotionShowcaseItem(itemId: string) {
  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from("central_promotion_items_overview")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError) {
    throw new Error(
      `Falha ao carregar produto promocional: ${itemError.message}`,
    );
  }
  if (!item) return null;

  const { data: promotion, error: promotionError } = await supabase
    .from("central_promotions_overview")
    .select("id,name,effective_status,starts_on,ends_on,coupon_code,notes")
    .eq("id", item.promotion_id)
    .in("effective_status", ["active", "scheduled"])
    .maybeSingle();

  if (promotionError) {
    throw new Error(`Falha ao carregar promoção: ${promotionError.message}`);
  }
  if (!promotion) return null;

  return mapItem(
    item as Record<string, unknown>,
    promotion as Record<string, unknown>,
  );
}
