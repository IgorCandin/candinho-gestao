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
      label: "Verificar estoque",
      title: `${product.name}: demanda comprovada`,
      body: `O modelo zerou depois de ${product.sold_90d} saída(s) em 90 dias. Use isso como pista de demanda: confira tamanho e cor e procure um modelo novo da mesma família, inclusive em outro fornecedor, antes de repetir a mesma peça.`,
    };
  }

  if (product.signal_type === "protect_stock") {
    return {
      tone: "attention",
      label: "Poucas peças",
      title: `Segure a divulgação de ${product.name}`,
      body: `A peça está girando, mas restam somente ${product.available_quantity} unidade(s). Preserve o saldo até decidir o próximo mix.`,
    };
  }

  if (product.signal_type === "promote") {
    return {
      tone: "opportunity",
      label: "Dar visibilidade",
      title: `${product.name} merece exposição`,
      body: `Há ${product.available_quantity} unidade(s) disponíveis e pouco giro recente. Teste vitrine, Story ou combinação de look antes de pensar em desconto.`,
    };
  }

  if (product.signal_type === "stagnant") {
    return {
      tone: "opportunity",
      label: "Revisar exposição",
      title: `${product.name} está parado no mix`,
      body: `Há ${product.available_quantity} unidade(s) e nenhum giro registrado nos últimos 90 dias. Revise foto, combinação, exposição e preço antes de comprar mais.`,
    };
  }

  if (product.signal_type === "momentum") {
    return {
      tone: "positive",
      label: "Em alta",
      title: `${product.name} está com movimento`,
      body: `Teve ${product.sold_30d} unidade(s) em 30 dias e ainda possui estoque. Guarde esse padrão de tamanho/cor como referência para próximas compras.`,
    };
  }

  return {
    tone: "neutral",
    label: "Acompanhar mix",
    title: product.name,
    body: `${product.available_quantity} unidade(s) disponíveis · ${product.sold_90d} vendida(s) em 90 dias. O histórico fica como referência, sem obrigar recompra do mesmo modelo.`,
  };
}
