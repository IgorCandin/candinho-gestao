export type Product = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  brand: string | null;
  cost_price: number;
  sale_price: number;
  min_stock: number;
  active: boolean;
  image_url: string | null;
};

export type StockRow = {
  product_id: string;
  product_name: string;
  category: string;
  location_id: string;
  location_code: string;
  location_name: string;
  quantity: number;
  min_stock: number;
  cost_price: number;
  sale_price: number;
  stock_cost_value: number;
  stock_sale_value: number;
};

export type SaleRow = {
  id: string;
  created_at: string;
  record_type: "sale" | "lead";
  general_status: string;
  payment_status: string;
  delivery_status: string;
  total_amount: number;
  total_profit: number;
  customer_name: string;
  location_code: string;
};

export type Customer = {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  total_spent: number;
  purchase_count: number;
  last_purchase_at: string | null;
};

export type Movement = {
  id: string;
  created_at: string;
  movement_type: string;
  quantity_delta: number;
  product_name: string;
  location_code: string;
  notes: string | null;
};

export type DashboardData = {
  totalProducts: number;
  totalUnits: number;
  stockCostValue: number;
  stockSaleValue: number;
  receivable: number;
  lowStockCount: number;
  recentSales: SaleRow[];
  lowStock: StockRow[];
};
