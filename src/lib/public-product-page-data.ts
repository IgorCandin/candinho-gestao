import { createClient } from "@/lib/supabase/server";

export type PublicProductFlavor = {
  id: string;
  name: string;
  available_quantity: number;
  incoming_quantity: number;
  available: boolean;
};

export type PublicProductRecommendation = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  brand: string | null;
  image_url: string | null;
  sale_price: number;
  available_quantity: number;
  same_category: boolean;
};

export type PublicProductPageSnapshot = {
  product: {
    id: string;
    slug: string;
    name: string;
    catalog_name: string;
    category: string | null;
    brand: string | null;
    image_url: string | null;
    image_full_url: string | null;
    secondary_image_url: string | null;
    sale_price: number;
    installment_price: number;
    available_quantity: number;
    incoming_quantity: number;
    available: boolean;
    description: string | null;
    long_description: string | null;
    objective: string | null;
    ideal_profile: string | null;
    information: string | null;
    quick_message: string | null;
    highlights: string[];
    usage_text: string | null;
    warnings_text: string | null;
    faq: Array<{ question: string; answer: string }>;
    meta_title: string | null;
    meta_description: string | null;
    whatsapp_message_template: string | null;
  };
  promotion: {
    promotion_name: string;
    current_price: number;
    promotional_price: number;
    discount_pct: number;
    ends_on: string | null;
  } | null;
  flavors: PublicProductFlavor[];
  recommendations: PublicProductRecommendation[];
  generated_at: string | null;
};

export type PublicAdvisorProduct = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  brand: string | null;
  image_url: string | null;
  description: string | null;
  objective: string | null;
  ideal_profile: string | null;
  sale_price: number;
  available_quantity: number;
  incoming_quantity: number;
  priority_index: number;
  promotional_price: number | null;
  promotion_name: string | null;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function faqArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => object(item))
    .map((item) => ({
      question: String(item.question ?? "").trim(),
      answer: String(item.answer ?? "").trim(),
    }))
    .filter((item) => item.question && item.answer);
}

export async function getPublicProductPage(
  slug: string,
): Promise<PublicProductPageSnapshot | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "public_storefront_product_page_v1",
    { p_slug: slug },
  );

  if (error) {
    throw new Error(`Falha ao abrir produto público: ${error.message}`);
  }

  if (!data || typeof data !== "object") return null;

  const source = object(data);
  const product = object(source.product);

  if (!product.id) return null;

  const promotionRaw = object(source.promotion);
  const flavorsRaw = Array.isArray(source.flavors) ? source.flavors : [];
  const recommendationsRaw = Array.isArray(source.recommendations)
    ? source.recommendations
    : [];

  return {
    product: {
      id: String(product.id),
      slug: String(product.slug ?? slug),
      name: String(product.name ?? "Produto"),
      catalog_name: String(product.catalog_name ?? product.name ?? "Produto"),
      category: text(product.category),
      brand: text(product.brand),
      image_url: text(product.image_url),
      image_full_url: text(product.image_full_url),
      secondary_image_url: text(product.secondary_image_url),
      sale_price: numberValue(product.sale_price),
      installment_price: numberValue(product.installment_price),
      available_quantity: numberValue(product.available_quantity),
      incoming_quantity: numberValue(product.incoming_quantity),
      available: product.available === true,
      description: text(product.description),
      long_description: text(product.long_description),
      objective: text(product.objective),
      ideal_profile: text(product.ideal_profile),
      information: text(product.information),
      quick_message: text(product.quick_message),
      highlights: stringArray(product.highlights),
      usage_text: text(product.usage_text),
      warnings_text: text(product.warnings_text),
      faq: faqArray(product.faq),
      meta_title: text(product.meta_title),
      meta_description: text(product.meta_description),
      whatsapp_message_template: text(product.whatsapp_message_template),
    },
    promotion: promotionRaw.promotion_name
      ? {
          promotion_name: String(promotionRaw.promotion_name),
          current_price: numberValue(promotionRaw.current_price),
          promotional_price: numberValue(promotionRaw.promotional_price),
          discount_pct: numberValue(promotionRaw.discount_pct),
          ends_on: text(promotionRaw.ends_on),
        }
      : null,
    flavors: flavorsRaw.map((value: unknown) => {
      const row = object(value);
      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? "Sabor"),
        available_quantity: numberValue(row.available_quantity),
        incoming_quantity: numberValue(row.incoming_quantity),
        available: row.available === true,
      };
    }),
    recommendations: recommendationsRaw.map((value: unknown) => {
      const row = object(value);
      return {
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        name: String(row.name ?? "Produto"),
        category: text(row.category),
        brand: text(row.brand),
        image_url: text(row.image_url),
        sale_price: numberValue(row.sale_price),
        available_quantity: numberValue(row.available_quantity),
        same_category: row.same_category === true,
      };
    }),
    generated_at: text(source.generated_at),
  };
}

export async function getPublicCatalogAdvisorSnapshot(): Promise<{
  products: PublicAdvisorProduct[];
  generated_at: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "public_catalog_advisor_snapshot_v1",
    { p_limit: 120 },
  );

  if (error) {
    throw new Error(`Falha ao carregar catálogo do Nexus: ${error.message}`);
  }

  const source = object(data);
  const rows = Array.isArray(source.products) ? source.products : [];

  return {
    products: rows.map((value: unknown) => {
      const row = object(value);
      return {
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        name: String(row.name ?? "Produto"),
        category: text(row.category),
        brand: text(row.brand),
        image_url: text(row.image_url),
        description: text(row.description),
        objective: text(row.objective),
        ideal_profile: text(row.ideal_profile),
        sale_price: numberValue(row.sale_price),
        available_quantity: numberValue(row.available_quantity),
        incoming_quantity: numberValue(row.incoming_quantity),
        priority_index: numberValue(row.priority_index),
        promotional_price:
          row.promotional_price == null
            ? null
            : numberValue(row.promotional_price),
        promotion_name: text(row.promotion_name),
      };
    }),
    generated_at: text(source.generated_at),
  };
}


export async function getPublicStorefrontSlugMap(): Promise<
  Array<{ product_id: string; slug: string; name: string | null }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_storefront_slug_map_v1");

  if (error) {
    throw new Error(`Falha ao carregar links do catálogo: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : [];

  return rows
    .map((value: unknown) => {
      const row = object(value);
      return {
        product_id: String(row.product_id ?? ""),
        slug: String(row.slug ?? ""),
        name: text(row.name),
      };
    })
    .filter((row) => row.product_id && row.slug && row.name);
}
