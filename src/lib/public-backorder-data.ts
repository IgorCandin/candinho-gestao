import { publicSupabaseRpc } from "@/lib/public-supabase-rpc-v45-36";

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type PublicBackorderProduct = {
  product_id: string;
  name: string;
  category: string | null;
  brand: string | null;
  image_url: string | null;
  sale_price: number;
  available_quantity: number;
  incoming_quantity: number;
};

export async function getPublicSupplementBackorders(): Promise<
  PublicBackorderProduct[]
> {
  const { data, error } =
    await publicSupabaseRpc<
      Array<Record<string, unknown>>
    >(
      "public_catalog_backorders_v1",
      {
        p_limit: 80,
      },
      10,
    );

  if (error) {
    console.warn(
      "[Catalog Backorders] Não foi possível carregar Sob encomenda:",
      error.message,
    );
    return [];
  }

  return (Array.isArray(data) ? data : []).map(
    (row) => ({
      product_id: String(row.product_id ?? ""),
      name: String(row.name ?? "Produto"),
      category:
        typeof row.category === "string"
          ? row.category
          : null,
      brand:
        typeof row.brand === "string"
          ? row.brand
          : null,
      image_url:
        typeof row.image_url === "string"
          ? row.image_url
          : null,
      sale_price:
        numberValue(row.sale_price),
      available_quantity:
        numberValue(row.available_quantity),
      incoming_quantity:
        numberValue(row.incoming_quantity),
    }),
  );
}
