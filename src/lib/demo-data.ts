import type { Customer, Movement, Product, SaleRow, StockRow } from "./types";

export const demoProducts: Product[] = [
  { id: "p1", name: "Creatina Candinho 300g", sku: "CREA-CAND-300", category: "Força", brand: "Candinho", cost_price: 29.9, sale_price: 70, min_stock: 10, active: true, image_url: null },
  { id: "p2", name: "Touro Power", sku: "TOURO-60", category: "Energia", brand: "Health Labs", cost_price: 29.9, sale_price: 64.9, min_stock: 3, active: true, image_url: null },
  { id: "p3", name: "Ashwagandha + Moringa + Maca Negra", sku: "ASH-MMM", category: "Saúde", brand: "Health Labs", cost_price: 29, sale_price: 69.9, min_stock: 3, active: true, image_url: null },
  { id: "p4", name: "Picolinato de Cromo Growth", sku: "PICO-GR", category: "Emagrecimento", brand: "Growth", cost_price: 19.9, sale_price: 54.9, min_stock: 2, active: true, image_url: null },
  { id: "p5", name: "Coqueteleira Candinho", sku: "COQ-CAND", category: "Acessórios", brand: "Candinho", cost_price: 6.5, sale_price: 14.9, min_stock: 5, active: true, image_url: null },
];

export const demoStock: StockRow[] = [
  { product_id: "p1", product_name: "Creatina Candinho 300g", category: "Força", location_id: "l1", location_code: "CS", location_name: "Estoque principal", quantity: 46, min_stock: 10, cost_price: 29.9, sale_price: 70, stock_cost_value: 1375.4, stock_sale_value: 3220 },
  { product_id: "p1", product_name: "Creatina Candinho 300g", category: "Força", location_id: "l2", location_code: "CTS", location_name: "Candinho Treino Studio", quantity: 8, min_stock: 10, cost_price: 29.9, sale_price: 70, stock_cost_value: 239.2, stock_sale_value: 560 },
  { product_id: "p2", product_name: "Touro Power", category: "Energia", location_id: "l1", location_code: "CS", location_name: "Estoque principal", quantity: 4, min_stock: 3, cost_price: 29.9, sale_price: 64.9, stock_cost_value: 119.6, stock_sale_value: 259.6 },
  { product_id: "p3", product_name: "Ashwagandha + Moringa + Maca Negra", category: "Saúde", location_id: "l1", location_code: "CS", location_name: "Estoque principal", quantity: 2, min_stock: 3, cost_price: 29, sale_price: 69.9, stock_cost_value: 58, stock_sale_value: 139.8 },
  { product_id: "p4", product_name: "Picolinato de Cromo Growth", category: "Emagrecimento", location_id: "l1", location_code: "CS", location_name: "Estoque principal", quantity: 0, min_stock: 2, cost_price: 19.9, sale_price: 54.9, stock_cost_value: 0, stock_sale_value: 0 },
  { product_id: "p5", product_name: "Coqueteleira Candinho", category: "Acessórios", location_id: "l1", location_code: "CS", location_name: "Estoque principal", quantity: 13, min_stock: 5, cost_price: 6.5, sale_price: 14.9, stock_cost_value: 84.5, stock_sale_value: 193.7 },
];

export const demoSales: SaleRow[] = [
  { id: "v1", created_at: "2026-07-13T12:10:00-03:00", record_type: "sale", general_status: "finalized", payment_status: "received", delivery_status: "delivered", total_amount: 70, total_profit: 40.1, customer_name: "Cliente demonstração", location_code: "CS" },
  { id: "v2", created_at: "2026-07-12T18:20:00-03:00", record_type: "sale", general_status: "active", payment_status: "receivable", delivery_status: "to_deliver", total_amount: 134.9, total_profit: 75.1, customer_name: "Noelma Amora - AC", location_code: "CS" },
  { id: "v3", created_at: "2026-07-12T15:00:00-03:00", record_type: "lead", general_status: "pending", payment_status: "not_applicable", delivery_status: "not_applicable", total_amount: 69.9, total_profit: 40.9, customer_name: "Lead de exemplo", location_code: "CS" },
];

export const demoCustomers: Customer[] = [
  { id: "c1", name: "Noelma Amora - AC", city: "Alto Caparaó", phone: "(32) 99931-9360", total_spent: 194.8, purchase_count: 2, last_purchase_at: "2026-07-12T18:20:00-03:00" },
  { id: "c2", name: "Igor Candinho", city: "Caparaó", phone: "(32) 99831-8385", total_spent: 139.8, purchase_count: 2, last_purchase_at: "2026-07-10T11:00:00-03:00" },
  { id: "c3", name: "Cliente demonstração", city: "Carangola", phone: null, total_spent: 70, purchase_count: 1, last_purchase_at: "2026-07-13T12:10:00-03:00" },
];

export const demoMovements: Movement[] = [
  { id: "m1", created_at: "2026-07-13T12:10:00-03:00", movement_type: "sale", quantity_delta: -1, product_name: "Creatina Candinho 300g", location_code: "CS", notes: "Venda v1" },
  { id: "m2", created_at: "2026-07-12T18:20:00-03:00", movement_type: "sale", quantity_delta: -1, product_name: "Creatina Candinho 300g", location_code: "CS", notes: "Venda v2" },
  { id: "m3", created_at: "2026-07-11T09:00:00-03:00", movement_type: "transfer_out", quantity_delta: -10, product_name: "Creatina Candinho 300g", location_code: "CS", notes: "Transferência para Itapharma" },
  { id: "m4", created_at: "2026-07-11T09:00:00-03:00", movement_type: "transfer_in", quantity_delta: 10, product_name: "Creatina Candinho 300g", location_code: "ITAPHARMA", notes: "Recebido de CS" },
];
