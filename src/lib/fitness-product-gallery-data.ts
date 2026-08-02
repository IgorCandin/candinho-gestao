import { createClient } from "@/lib/supabase/server";

export type FitnessProductGalleryImage = {
  url: string;
  label: string;
  color: string | null;
  kind: "color" | "model_ai" | "lifestyle" | "extra" | "product";
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function colorRank(color: string | null) {
  const normalized = normalize(color ?? "");
  return ["preto", "preta", "black"].includes(normalized) ? 0 : 1;
}

export async function getFitnessProductGallery(
  productId: string,
): Promise<FitnessProductGalleryImage[]> {
  const supabase = await createClient();

  const [productResult, variantsResult, mediaResult] =
    await Promise.all([
      supabase
        .from("fitness_products")
        .select("image_url")
        .eq("id", productId)
        .maybeSingle(),
      supabase
        .from("fitness_variants")
        .select("id,color,image_url,active,created_at")
        .eq("product_id", productId)
        .eq("active", true)
        .order("created_at"),
      supabase
        .from("fitness_product_media")
        .select(
          "id,color,media_type,image_url,public_visible,sort_order,created_at",
        )
        .eq("product_id", productId)
        .order("sort_order")
        .order("created_at"),
    ]);

  if (productResult.error) throw productResult.error;
  if (variantsResult.error) throw variantsResult.error;

  // Migration antiga / deploy parcial não derruba a ficha do produto.
  const mediaRows = mediaResult.error
    ? []
    : mediaResult.data ?? [];

  const images: Array<
    FitnessProductGalleryImage & {
      rank: number;
      order: number;
    }
  > = [];

  const seenColor = new Set<string>();

  for (const row of variantsResult.data ?? []) {
    const url =
      typeof row.image_url === "string"
        ? row.image_url.trim()
        : "";

    if (!url) continue;

    const color = String(row.color ?? "").trim() || null;
    const colorKey = normalize(color ?? "");

    if (colorKey && seenColor.has(colorKey)) continue;
    if (colorKey) seenColor.add(colorKey);

    images.push({
      url,
      label: color || "Produto",
      color,
      kind: "color",
      rank: colorRank(color),
      order: 10,
    });
  }

  const productImage =
    typeof productResult.data?.image_url === "string"
      ? productResult.data.image_url.trim()
      : "";

  if (
    productImage &&
    !images.some((image) => image.url === productImage)
  ) {
    images.push({
      url: productImage,
      label: "Foto principal",
      color: null,
      kind: "product",
      rank: images.length === 0 ? 0 : 2,
      order: 20,
    });
  }

  for (const row of mediaRows) {
    const url =
      typeof row.image_url === "string"
        ? row.image_url.trim()
        : "";

    if (!url || images.some((image) => image.url === url)) {
      continue;
    }

    const mediaType = String(row.media_type ?? "extra");
    const kind =
      mediaType === "model_ai" ||
      mediaType === "lifestyle" ||
      mediaType === "extra"
        ? mediaType
        : "extra";

    const color =
      typeof row.color === "string" && row.color.trim()
        ? row.color.trim()
        : null;

    images.push({
      url,
      label:
        kind === "model_ai"
          ? `${color || "Lifestyle"} · modelo IA`
          : color || "Foto extra",
      color,
      kind,
      rank: 3,
      order: Number(row.sort_order ?? 100),
    });
  }

  return images
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.order - b.order ||
        a.label.localeCompare(b.label, "pt-BR"),
    )
    .map(({ rank: _rank, order: _order, ...image }) => image);
}
