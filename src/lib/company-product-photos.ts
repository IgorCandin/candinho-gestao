import { createClient } from "@/lib/supabase/server";

export type CompanyPhotoSlot = {
  key: string;
  label: string;
  url: string | null;
  color?: string;
  variantIds?: string[];
  sizes?: string[];
};

function normalizeColor(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
}

export async function getCompanyProductPhotos(module: "supplements" | "fitness", productId: string) {
  const supabase = await createClient();
  if (module === "supplements") {
    const { data, error } = await supabase.from("products")
      .select("name,image_url,banner_image_url,secondary_image_url")
      .eq("id", productId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      name: String(data.name),
      slots: [
        { key: "photo1", label: "Foto 01 · Produto", url: data.image_url ?? null },
        { key: "photo2", label: "Foto 02 · Banner", url: data.banner_image_url ?? null },
        { key: "photo3", label: "Foto 03 · Nutrição", url: data.secondary_image_url ?? null },
      ] satisfies CompanyPhotoSlot[],
    };
  }

  const [productResult, variantsResult] = await Promise.all([
    supabase.from("fitness_products").select("name,image_url").eq("id", productId).maybeSingle(),
    supabase.from("fitness_variants").select("id,color,size,image_url").eq("product_id", productId).eq("active", true).order("color").order("size"),
  ]);
  if (productResult.error) throw new Error(productResult.error.message);
  if (variantsResult.error) throw new Error(variantsResult.error.message);
  if (!productResult.data) return null;

  const groups = new Map<string, { color: string; variants: Array<{ id: string; size: string; image: string | null }> }>();
  for (const variant of variantsResult.data ?? []) {
    const color = String(variant.color ?? "").trim() || "Sem cor";
    const key = normalizeColor(color);
    const group = groups.get(key) ?? { color, variants: [] };
    group.variants.push({ id: String(variant.id), size: String(variant.size ?? "").trim(), image: variant.image_url ?? null });
    groups.set(key, group);
  }
  const slots: CompanyPhotoSlot[] = [...groups.values()].map((group) => ({
    key: `color-${normalizeColor(group.color)}`,
    label: `Cor · ${group.color}`,
    color: group.color,
    url: group.variants.find((variant) => variant.image)?.image ?? null,
    variantIds: group.variants.map((variant) => variant.id),
    sizes: [...new Set(group.variants.map((variant) => variant.size).filter(Boolean))],
  }));
  if (!slots.length) slots.push({ key: "cover", label: "Foto de capa", url: productResult.data.image_url ?? null });
  return { name: String(productResult.data.name), slots };
}
