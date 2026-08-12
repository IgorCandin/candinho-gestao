import { createClient } from "@/lib/supabase/server";

export type PublicStorefrontTopSeller = {
  operation: "supplements" | "fitness";
  product_id: string;
  name: string;
  image_url: string | null;
  price_from: number;
  units_sold: number;
  available_quantity: number;
  href: string;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getPublicStorefrontTopSellers(
  limit = 3,
): Promise<PublicStorefrontTopSeller[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "public_storefront_top_sellers",
    {
      p_limit: Math.min(Math.max(limit, 1), 12),
    },
  );

  if (error) {
    throw new Error(
      `Falha ao carregar os mais vendidos da Vitrine: ${error.message}`,
    );
  }

  if (!Array.isArray(data)) return [];

  return data
    .filter(
      (row): row is Record<string, unknown> =>
        Boolean(row && typeof row === "object"),
    )
    .map((row): PublicStorefrontTopSeller => ({
      operation:
        row.operation === "fitness"
          ? "fitness"
          : "supplements",
      product_id: String(row.product_id ?? ""),
      name: String(row.name ?? "Produto"),
      image_url:
        typeof row.image_url === "string"
          ? row.image_url
          : null,
      price_from: numberValue(row.price_from),
      units_sold: numberValue(row.units_sold),
      available_quantity: numberValue(
        row.available_quantity,
      ),
      href:
        typeof row.href === "string" &&
        row.href.startsWith("/")
          ? row.href
          : "/catalogo",
    }))
    .filter(
      (row) =>
        row.product_id &&
        row.units_sold > 0 &&
        row.available_quantity > 0,
    )
    .slice(0, limit);
}
