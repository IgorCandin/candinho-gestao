import { publicSupabaseRpc } from "@/lib/public-supabase-rpc-v45-36";

export type PublicStorefrontImage = {
  url: string;
  color: string | null;
  label: string | null;
  kind: "product" | "color" | "model_ai" | "lifestyle" | "extra";
  available_quantity: number;
};

export type PublicStorefrontProduct = {
  id: string;
  operation: "supplements" | "fitness";
  name: string;
  category: string | null;
  image_url: string | null;
  price_from: number;
  price_to: number;
  available: boolean;
  notes: string | null;
  images: PublicStorefrontImage[];
};

export type PublicStorefrontPromotion = {
  id: string;
  promotion_id: string;
  product_id: string | null;
  operation: "supplements" | "fitness";
  name: string;
  category: string | null;
  image_url: string | null;
  current_price: number;
  promotional_price: number;
  discount_pct: number;
  promotion_name: string;
  promotion_status: "active" | "scheduled";
  starts_on: string | null;
  ends_on: string | null;
  available_quantity: number;
  stock_status: "available" | "sold_out";
};

export type PublicStorefrontSnapshot = {
  products: {
    supplements: PublicStorefrontProduct[];
    fitness: PublicStorefrontProduct[];
  };
  promotions: {
    supplements: PublicStorefrontPromotion[];
    fitness: PublicStorefrontPromotion[];
  };
  categories: {
    supplements: string[];
    fitness: string[];
  };
  generated_at: string | null;
};

const EMPTY: PublicStorefrontSnapshot = {
  products: { supplements: [], fitness: [] },
  promotions: { supplements: [], fitness: [] },
  categories: { supplements: [], fitness: [] },
  generated_at: null,
};

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function images(value: unknown): PublicStorefrontImage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => object(entry))
    .map((entry) => {
      const kind = String(entry.kind ?? "product");

      return {
        url: String(entry.url ?? ""),
        color: typeof entry.color === "string" ? entry.color : null,
        label: typeof entry.label === "string" ? entry.label : null,
        kind:
          kind === "color" ||
          kind === "model_ai" ||
          kind === "lifestyle" ||
          kind === "extra"
            ? kind
            : "product",
        available_quantity: num(entry.available_quantity),
      } satisfies PublicStorefrontImage;
    })
    .filter((entry) => entry.url);
}

function product(
  row: Record<string, unknown>,
): PublicStorefrontProduct {
  const parsedImages = images(row.images);
  const imageUrl =
    typeof row.image_url === "string" ? row.image_url : null;

  return {
    id: String(row.id ?? ""),
    operation:
      row.operation === "fitness" ? "fitness" : "supplements",
    name: String(row.name ?? "Produto"),
    category:
      typeof row.category === "string" ? row.category : null,
    image_url: imageUrl,
    price_from: num(row.price_from),
    price_to: num(row.price_to),
    available: row.available !== false,
    notes: typeof row.notes === "string" ? row.notes : null,
    images:
      parsedImages.length > 0
        ? parsedImages
        : imageUrl
          ? [
              {
                url: imageUrl,
                color: null,
                label: null,
                kind: "product",
                available_quantity: 0,
              },
            ]
          : [],
  };
}

function promotion(
  row: Record<string, unknown>,
): PublicStorefrontPromotion {
  const availableQuantity = num(row.available_quantity);

  return {
    id: String(row.id ?? ""),
    promotion_id: String(row.promotion_id ?? ""),
    product_id:
      typeof row.product_id === "string"
        ? row.product_id
        : null,
    operation:
      row.operation === "fitness" ? "fitness" : "supplements",
    name: String(row.name ?? "Produto"),
    category:
      typeof row.category === "string" ? row.category : null,
    image_url:
      typeof row.image_url === "string" ? row.image_url : null,
    current_price: num(row.current_price),
    promotional_price: num(row.promotional_price),
    discount_pct: num(row.discount_pct),
    promotion_name: String(row.promotion_name ?? "Promoção"),
    promotion_status:
      row.promotion_status === "scheduled" ? "scheduled" : "active",
    starts_on:
      typeof row.starts_on === "string" ? row.starts_on : null,
    ends_on:
      typeof row.ends_on === "string" ? row.ends_on : null,
    available_quantity: availableQuantity,
    stock_status:
      row.stock_status === "sold_out" || availableQuantity <= 0
        ? "sold_out"
        : "available",
  };
}

export async function getPublicStorefrontSnapshot(): Promise<PublicStorefrontSnapshot> {
  const { data, error } =
    await publicSupabaseRpc<Record<string, unknown>>(
      "public_storefront_snapshot",
      {
        p_limit: 500,
      },
      10,
    );

  if (error) {
    throw new Error(
      `Falha ao abrir a vitrine pública: ${error.message}`,
    );
  }

  if (!data || typeof data !== "object") return EMPTY;

  const payload = data as Record<string, unknown>;
  const products = object(payload.products);
  const promotions = object(payload.promotions);
  const categories = object(payload.categories);

  const asRows = (
    value: unknown,
  ): Record<string, unknown>[] =>
    Array.isArray(value)
      ? value.filter(
          (
            item,
          ): item is Record<string, unknown> =>
            Boolean(
              item &&
                typeof item === "object" &&
                !Array.isArray(item),
            ),
        )
      : [];

  const asStrings = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter(
          (item): item is string =>
            typeof item === "string" &&
            item.trim().length > 0,
        )
      : [];

  return {
    products: {
      supplements:
        asRows(products.supplements).map(product),
      fitness:
        asRows(products.fitness).map(product),
    },
    promotions: {
      supplements:
        asRows(promotions.supplements).map(promotion),
      fitness:
        asRows(promotions.fitness).map(promotion),
    },
    categories: {
      supplements:
        asStrings(categories.supplements),
      fitness:
        asStrings(categories.fitness),
    },
    generated_at:
      typeof payload.generated_at === "string"
        ? payload.generated_at
        : null,
  };
}
