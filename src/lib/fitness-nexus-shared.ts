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
