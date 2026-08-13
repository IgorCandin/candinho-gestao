import { publicSupabaseRpc } from "@/lib/public-supabase-rpc-v45-36";

export type PublicStorefrontSlugRow = {
  product_id: string;
  slug: string;
  name: string | null;
};

function object(
  value: unknown,
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function getCachedPublicStorefrontSlugMap(): Promise<
  PublicStorefrontSlugRow[]
> {
  const { data, error } =
    await publicSupabaseRpc<unknown>(
      "public_storefront_slug_map_v1",
      {},
      30,
    );

  if (error) {
    throw new Error(
      `Falha ao carregar links do catálogo: ${error.message}`,
    );
  }

  const rows =
    Array.isArray(data) ? data : [];

  return rows
    .map((value) => {
      const row = object(value);

      return {
        product_id:
          String(row.product_id ?? ""),
        slug:
          String(row.slug ?? ""),
        name:
          typeof row.name === "string" &&
          row.name.trim()
            ? row.name
            : null,
      };
    })
    .filter(
      (row) =>
        row.product_id &&
        row.slug &&
        row.name,
    );
}
