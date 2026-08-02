import { createClient } from "@/lib/supabase/server";

export type FitnessSetComponent = {
  id: string;
  component_product_id: string;
  component_role: "top" | "bottom" | "other";
  component_label: string;
  sale_price: number;
  cost_share_pct: number;
  product_name: string;
  product_category: string;
};

export type FitnessSetConfig = {
  enabled: boolean;
  components: FitnessSetComponent[];
};

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getFitnessSetConfig(
  productId: string,
): Promise<FitnessSetConfig> {
  const supabase = await createClient();

  const { data: product, error: productError } = await supabase
    .from("fitness_products")
    .select("is_splittable_set")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    // Deploy parcial antes da migration: não quebra a ficha.
    return { enabled: false, components: [] };
  }

  const { data, error } = await supabase
    .from("fitness_set_components")
    .select(
      "id,component_product_id,component_role,component_label,sale_price,cost_share_pct",
    )
    .eq("set_product_id", productId)
    .eq("active", true);

  if (error) {
    return {
      enabled: Boolean(product?.is_splittable_set),
      components: [],
    };
  }

  const productIds = [
    ...new Set(
      (data ?? []).map((row) =>
        String(row.component_product_id),
      ),
    ),
  ];

  const { data: productRows } =
    productIds.length > 0
      ? await supabase
          .from("fitness_products")
          .select("id,name,category")
          .in("id", productIds)
      : { data: [] as Array<Record<string, unknown>> };

  const products = new Map(
    (productRows ?? []).map((row) => [
      String(row.id),
      {
        name: String(row.name ?? "Parte do conjunto"),
        category: String(row.category ?? "Vestuário"),
      },
    ]),
  );

  return {
    enabled: Boolean(product?.is_splittable_set),
    components: (data ?? []).map((row) => {
      const productInfo = products.get(
        String(row.component_product_id),
      );

      return {
        id: String(row.id),
        component_product_id: String(
          row.component_product_id,
        ),
        component_role:
          row.component_role === "top" ||
          row.component_role === "bottom"
            ? row.component_role
            : "other",
        component_label: String(
          row.component_label ?? "Parte",
        ),
        sale_price: num(row.sale_price),
        cost_share_pct: num(row.cost_share_pct),
        product_name:
          productInfo?.name ?? "Parte do conjunto",
        product_category:
          productInfo?.category ?? "Vestuário",
      };
    }),
  };
}
