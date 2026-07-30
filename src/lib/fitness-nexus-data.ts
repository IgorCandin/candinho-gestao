import { createClient } from "@/lib/supabase/server";

export type FitnessNexusSignalType =
  | "reorder"
  | "promote"
  | "protect_stock"
  | "momentum"
  | "stagnant"
  | "watch";

export type FitnessNexusProduct = {
  product_id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  available_quantity: number;
  incoming_quantity: number;
  attention_variants: number;
  variant_count: number;
  min_sale_price: number;
  max_sale_price: number;
  max_cost: number;
  sold_30d: number;
  sold_90d: number;
  last_sale_on: string | null;
  signal_type: FitnessNexusSignalType;
  score: number;
  suggested_discount_pct: number;
  suggested_price: number | null;
  cost_complete: boolean;
};

export type FitnessNexusSnapshot = {
  summary: {
    month_sales: number;
    month_revenue: number;
    month_profit: number;
    available_units: number;
    incoming_units: number;
    pending_delivery: number;
    pending_payment: number;
    receivable_total: number;
    open_orders: number;
  };
  products: FitnessNexusProduct[];
  generated_at: string | null;
};

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function txt(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function signal(value: unknown): FitnessNexusSignalType {
  const valid: FitnessNexusSignalType[] = [
    "reorder",
    "promote",
    "protect_stock",
    "momentum",
    "stagnant",
    "watch",
  ];
  return valid.includes(value as FitnessNexusSignalType)
    ? (value as FitnessNexusSignalType)
    : "watch";
}

export async function getFitnessNexusSnapshot(): Promise<FitnessNexusSnapshot> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fitness_nexus_snapshot_v1");

  if (error) {
    throw new Error(`Falha ao carregar Nexus Fitness: ${error.message}`);
  }

  const source = obj(data);
  const summary = obj(source.summary);
  const rows = Array.isArray(source.products) ? source.products : [];

  return {
    summary: {
      month_sales: num(summary.month_sales),
      month_revenue: num(summary.month_revenue),
      month_profit: num(summary.month_profit),
      available_units: num(summary.available_units),
      incoming_units: num(summary.incoming_units),
      pending_delivery: num(summary.pending_delivery),
      pending_payment: num(summary.pending_payment),
      receivable_total: num(summary.receivable_total),
      open_orders: num(summary.open_orders),
    },
    products: rows.map((value: unknown) => {
      const row = obj(value);
      return {
        product_id: String(row.product_id ?? ""),
        name: String(row.name ?? "Produto"),
        category: txt(row.category),
        image_url: txt(row.image_url),
        available_quantity: num(row.available_quantity),
        incoming_quantity: num(row.incoming_quantity),
        attention_variants: num(row.attention_variants),
        variant_count: num(row.variant_count),
        min_sale_price: num(row.min_sale_price),
        max_sale_price: num(row.max_sale_price),
        max_cost: num(row.max_cost),
        sold_30d: num(row.sold_30d),
        sold_90d: num(row.sold_90d),
        last_sale_on: txt(row.last_sale_on),
        signal_type: signal(row.signal_type),
        score: num(row.score),
        suggested_discount_pct: num(row.suggested_discount_pct),
        suggested_price:
          row.suggested_price == null ? null : num(row.suggested_price),
        cost_complete: row.cost_complete === true,
      };
    }),
    generated_at: txt(source.generated_at),
  };
}

export function fitnessSignalCopy(product: FitnessNexusProduct) {
  if (product.signal_type === "reorder") {
    return {
      tone: "urgent",
      label: "Reposição",
      title: `${product.name} merece reposição`,
      body: `Está sem estoque e teve ${product.sold_90d} unidade(s) vendida(s) nos últimos 90 dias.`,
    };
  }

  if (product.signal_type === "protect_stock") {
    return {
      tone: "attention",
      label: "Não promover agora",
      title: `Segure a promoção de ${product.name}`,
      body: `A peça está girando, mas restam somente ${product.available_quantity} unidade(s).`,
    };
  }

  if (product.signal_type === "promote") {
    return {
      tone: "opportunity",
      label: "Promover agora",
      title: `${product.name} pede divulgação`,
      body: `Há ${product.available_quantity} unidade(s) disponíveis e pouco giro recente.`,
    };
  }

  if (product.signal_type === "stagnant") {
    return {
      tone: "opportunity",
      label: "Estoque parado",
      title: `${product.name} pode virar campanha`,
      body: `Há ${product.available_quantity} unidade(s) e nenhum giro registrado nos últimos 90 dias.`,
    };
  }

  if (product.signal_type === "momentum") {
    return {
      tone: "positive",
      label: "Em alta",
      title: `${product.name} está com movimento`,
      body: `Teve ${product.sold_30d} unidade(s) em 30 dias e ainda possui estoque.`,
    };
  }

  return {
    tone: "neutral",
    label: "Acompanhar",
    title: product.name,
    body: `${product.available_quantity} unidade(s) disponíveis · ${product.sold_90d} vendida(s) em 90 dias.`,
  };
}
