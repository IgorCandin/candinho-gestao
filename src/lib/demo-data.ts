import type {
  Customer,
  LeadRow,
  Movement,
  PendingOrderRow,
  ProductCatalogRow,
  ProductDetails,
  ReplenishmentRow,
  SaleRow,
  StockRow,
} from "./types";

export const demoProducts: ProductCatalogRow[] = [
  { id: "p1", name: "Creatina Candinho 300g", category: "Força", brand: "Candinho", image_url: null, active: true, sale_price: 70, installment_price: 75 },
  { id: "p2", name: "Touro Power", category: "Energia", brand: "Health Labs", image_url: null, active: true, sale_price: 64.9, installment_price: 75 },
];

export const demoProductDetails: ProductDetails = {
  ...demoProducts[0],
  description: "Creatina monohidratada para uso diário.",
  objective: "Força, explosão e desempenho.",
  ideal_profile: "Todos os níveis de treino.",
  duration_days: 100,
  information: "Produto de demonstração.",
  quick_message: "Mais força e desempenho para evoluir no treino.",
  keywords: "Creatina, força, desempenho",
  level: "Essencial",
  sales_category: "A",
  secondary_image_url: null,
};

export const demoStock: StockRow[] = [
  { product_id: "p1", product_name: "Creatina Candinho 300g", category: "Força", location_id: "l1", location_code: "CS", location_name: "Estoque principal", quantity: 46, min_stock: 10, cost_price: 29.9, sale_price: 70, stock_cost_value: 1375.4, stock_sale_value: 3220 },
];

export const demoSales: SaleRow[] = [
  { id: "v1", customer_id: "c1", customer_name: "Cliente demonstração", location_id: "l1", location_code: "CS", location_name: "Estoque principal", business_at: "2026-07-13T12:00:00-03:00", business_date: "2026-07-13", quoted_at: "2026-07-13T12:00:00-03:00", delivered_at: "2026-07-13T12:00:00-03:00", general_status: "finalized", payment_status: "received", delivery_status: "delivered", payment_method: "Pix", payment_condition: null, total_amount: 70, total_profit: 40.1, notes: null, product_summary: "Creatina Candinho 300g", total_items: 1 },
];

export const demoLeads: LeadRow[] = [
  { id: "l1", customer_id: "c2", customer_name: "Lead de exemplo", location_id: "l1", location_code: "CS", location_name: "Estoque principal", lead_at: "2026-07-12T12:00:00-03:00", lead_date: "2026-07-12", lead_month: "2026-07-01", lead_status: "Perguntou sobre", general_status: "pending", reference: null, city: "Caparaó", phone: null, notes: null, product_summary: "Melatonina", total_items: 1, primary_product_id: "p2", primary_image_url: null },
];

export const demoPendingOrders: PendingOrderRow[] = [
  { id: "v2", customer_id: "c3", customer_name: "Pedido demonstração", location_id: "l1", location_code: "CS", location_name: "Estoque principal", business_at: "2026-07-14T12:00:00-03:00", business_date: "2026-07-14", order_at: "2026-07-14T12:00:00-03:00", paid_at: null, delivered_at: null, general_status: "active", payment_status: "receivable", delivery_status: "to_deliver", payment_method: null, payment_condition: null, total_amount: 64.9, total_profit: 24.46, product_summary: "HMB", total_items: 1, primary_product_id: "p1", primary_image_url: null },
];

export const demoReplenishment: ReplenishmentRow[] = [
  { product_id: "p2", product_name: "Touro Power", category: "Energia", company_quantity: 1, min_stock: 2, ideal_stock: 4, needs_replenishment: true, suggested_order_quantity: 3, stock_status: "below_minimum" },
];

export const demoCustomers: Customer[] = [
  { id: "c1", name: "Cliente demonstração", city: "Carangola", phone: null, total_spent: 70, purchase_count: 1, last_purchase_at: "2026-07-13T12:00:00-03:00", lead_count: 0, pending_sales_count: 0 },
];

export const demoMovements: Movement[] = [
  { id: "m1", created_at: "2026-07-13T12:00:00-03:00", movement_type: "sale", quantity_delta: -1, product_name: "Creatina Candinho 300g", location_code: "CS", notes: "Venda de demonstração" },
];
