import { cache } from "react";
import { isSupabaseConfigured } from "./config";
import { getFallbackUserAccess, normalizeUserAccess, type UserAccess, type UserPermissionRow } from "./access";
import {
  demoCustomers,
  demoLeads,
  demoMovements,
  demoPendingOrders,
  demoProductDetails,
  demoProducts,
  demoReplenishment,
  demoSales,
  demoStock,
} from "./demo-data";
import { createClient } from "./supabase/server";
import type {
  CommercialDashboardSummary,
  Customer,
  CustomerDetails,
  CustomerInteraction,
  CustomerCRMSummary,
  CustomerOption,
  DashboardData,
  DashboardOperationalSummary,
  DashboardPriorityItem,
  LeadDetails,
  LeadRow,
  Movement,
  PanelCSData,
  PanelPeriod,
  PendingOrderRow,
  ProductCatalogRow,
  ProductDetails,
  ProductManagementDetails,
  ProductOption,
  QuoteDraft,
  QuoteRow,
  QuoteDetails,
  SaleStockOption,
  LocationOption,
  PartnerOption,
  ReplenishmentRow,
  SaleDetails,
  SaleRow,
  StockRow,
  InventoryOverviewRow,
  InventorySummary,
  InventoryLocationRow,
  InventoryProductDetails,
  SupplierOption,
  PurchaseProductOption,
  SupplierOrderSummary,
  SupplierOrderDetails,
  SupplierOrderItem,
  SupplierWaitingSale,
  PartnerOverview,
  PartnerDetails,
  PartnerSale,
  PartnerSettlement,
  UnassignedPartnershipSale,
  FitnessDashboardSummary,
  FitnessStockRow,
  FitnessProductRow,
  FitnessSaleRow,
  FitnessSaleDetails,
  FitnessSaleItem,
  FitnessPurchaseOrderSummary,
  FitnessPurchaseOrderDetails,
  FitnessPurchaseOrderItem,
  FitnessCustomerRow,
  FitnessSupplierRow,
  FitnessInventoryMovementRow,
  AgendaEvent,
  AgendaSummary,
  AgendaUserOption,
  AgendaSaleOption,
  AgendaPurchaseOrderOption,
  TestLabOperation,
  TestLabDashboardSummary,
  TestLabStockRow,
  TestLabCustomer,
  TestLabSupplier,
  TestLabSaleRow,
  TestLabSaleDetails,
  TestLabSaleItem,
  TestLabPurchaseOrderRow,
  TestLabPurchaseOrderDetails,
  TestLabPurchaseOrderItem,
} from "./types";

const number = (value: unknown) => Number(value ?? 0);
const text = (value: unknown, fallback = "—") => (typeof value === "string" && value.trim() ? value : fallback);

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function getBrazilYearMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

function formatIsoMonthStart(year: number, monthIndex: number) {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function monthBounds(offset: number) {
  const { year, month } = getBrazilYearMonth();
  return {
    start: formatIsoMonthStart(year, month - 1 + offset),
    end: formatIsoMonthStart(year, month + offset),
  };
}

function dateInPeriod(value: string | null, period: PanelPeriod) {
  if (period === "all") return true;
  if (!value) return false;
  const date = value.slice(0, 10);
  const bounds = monthBounds(period === "previous" ? -1 : 0);
  return date >= bounds.start && date < bounds.end;
}

function isCommercialSale(sale: SaleRow) {
  const customer = sale.customer_name.trim().toLocaleLowerCase("pt-BR");
  return (
    sale.general_status !== "cancelled" &&
    !customer.startsWith("igor candinho") &&
    !customer.startsWith("brinde")
  );
}

function normalizeProduct(row: Record<string, unknown>): ProductCatalogRow {
  return {
    id: String(row.id),
    name: text(row.name, "Produto sem nome"),
    category: text(row.category, "Sem categoria"),
    brand: typeof row.brand === "string" ? row.brand : null,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    thumbnail_url: typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
    active: Boolean(row.active),
    sale_price: number(row.sale_price),
    installment_price: number(row.installment_price),
    physical_quantity: number(row.physical_quantity),
    reserved_quantity: number(row.reserved_quantity),
    available_quantity: number(row.available_quantity),
    incoming_quantity: number(row.incoming_quantity),
    awaiting_sales_quantity: number(row.awaiting_sales_quantity),
    stock_status: text(row.stock_status, Boolean(row.active) ? "out_of_stock" : "inactive"),
  };
}

function normalizeSale(row: Record<string, unknown>): SaleRow {
  return {
    id: String(row.id),
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: text(row.customer_name, "Cliente não informado"),
    location_id: String(row.location_id ?? ""),
    location_code: text(row.location_code),
    location_name: text(row.location_name),
    business_at: String(row.business_at ?? ""),
    business_date: String(row.business_date ?? ""),
    quoted_at: String(row.quoted_at ?? ""),
    delivered_at: typeof row.delivered_at === "string" ? row.delivered_at : null,
    general_status: text(row.general_status, "pending"),
    payment_status: text(row.payment_status, "not_applicable"),
    delivery_status: text(row.delivery_status, "not_applicable"),
    payment_method: typeof row.payment_method === "string" ? row.payment_method : null,
    payment_condition: typeof row.payment_condition === "string" ? row.payment_condition : null,
    total_amount: number(row.total_amount),
    total_profit: number(row.total_profit),
    notes: typeof row.notes === "string" ? row.notes : null,
    product_summary: typeof row.product_summary === "string" ? row.product_summary : null,
    total_items: number(row.total_items),
    paid_at: typeof row.paid_at === "string" ? row.paid_at : null,
    payment_due_at: typeof row.payment_due_at === "string" ? row.payment_due_at : null,
    price_condition: typeof row.price_condition === "string" ? row.price_condition : null,
    partner_id: typeof row.partner_id === "string" ? row.partner_id : null,
    partner_name: typeof row.partner_name === "string" ? row.partner_name : null,
    primary_product_id: typeof row.primary_product_id === "string" ? row.primary_product_id : null,
    primary_image_url: typeof row.primary_image_url === "string" ? row.primary_image_url : null,
    reservation_status: typeof row.reservation_status === "string" ? row.reservation_status : null,
  };
}

function normalizeLead(row: Record<string, unknown>): LeadRow {
  return {
    id: String(row.id), customer_id: typeof row.customer_id === "string" ? row.customer_id : null, customer_name: text(row.customer_name, "Cliente não informado"),
    location_id: String(row.location_id ?? ""), location_code: text(row.location_code), location_name: text(row.location_name),
    lead_at: String(row.lead_at ?? ""), lead_date: String(row.lead_date ?? ""), lead_month: String(row.lead_month ?? ""),
    lead_status: typeof row.lead_status === "string" ? row.lead_status : null, general_status: text(row.general_status, "pending"),
    reference: typeof row.reference === "string" ? row.reference : null, city: typeof row.city === "string" ? row.city : null,
    phone: typeof row.phone === "string" ? row.phone : null, notes: typeof row.notes === "string" ? row.notes : null,
    product_summary: typeof row.product_summary === "string" ? row.product_summary : null, total_items: number(row.total_items),
    primary_product_id: typeof row.primary_product_id === "string" ? row.primary_product_id : null,
    primary_image_url: typeof row.primary_image_url === "string" ? row.primary_image_url : null,
  };
}

export async function getProductCatalog(): Promise<ProductCatalogRow[]> {
  if (!isSupabaseConfigured) return demoProducts;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_catalog_commercial_sort")
    .select("*")
    .order("flagship_rank", { ascending: true })
    .order("availability_rank", { ascending: true })
    .order("category_rank", { ascending: true })
    .order("total_sold", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeProduct(row as Record<string, unknown>));
}

export async function getProductDetails(productId: string): Promise<ProductDetails | null> {
  if (!isSupabaseConfigured) return productId === demoProductDetails.id ? demoProductDetails : null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_details")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const base = normalizeProduct(data as Record<string, unknown>);
  return {
    ...base,
    description: typeof data.description === "string" ? data.description : null,
    objective: typeof data.objective === "string" ? data.objective : null,
    ideal_profile: typeof data.ideal_profile === "string" ? data.ideal_profile : null,
    duration_days: data.duration_days == null ? null : number(data.duration_days),
    information: typeof data.information === "string" ? data.information : null,
    quick_message: typeof data.quick_message === "string" ? data.quick_message : null,
    keywords: typeof data.keywords === "string" ? data.keywords : null,
    level: typeof data.level === "string" ? data.level : null,
    sales_category: typeof data.sales_category === "string" ? data.sales_category : null,
    secondary_image_url: typeof data.secondary_image_url === "string" ? data.secondary_image_url : null,
    secondary_thumbnail_url: typeof data.secondary_thumbnail_url === "string" ? data.secondary_thumbnail_url : null,
  };
}

export async function getProductManagementDetails(productId: string): Promise<ProductManagementDetails | null> {
  if (!isSupabaseConfigured) {
    const details = productId === demoProductDetails.id ? demoProductDetails : null;
    return details ? {
      ...details,
      sku: null,
      cost_price: 29.9,
      min_stock: 10,
      ideal_stock: 30,
      restricted: false,
      default_supplier_id: null,
      default_supplier_name: null,
      updated_at: new Date().toISOString(),
    } : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_management_details").select("*").eq("id", productId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const details = await getProductDetails(productId);
  if (!details) return null;
  return {
    ...details,
    sku: typeof data.sku === "string" ? data.sku : null,
    cost_price: number(data.cost_price),
    min_stock: number(data.min_stock),
    ideal_stock: number(data.ideal_stock),
    restricted: Boolean(data.restricted),
    default_supplier_id: typeof data.default_supplier_id === "string" ? data.default_supplier_id : null,
    default_supplier_name: typeof data.default_supplier_name === "string" ? data.default_supplier_name : null,
    updated_at: String(data.updated_at ?? ""),
  };
}

export async function getProductCategories(): Promise<string[]> {
  const products = await getProductCatalog();
  return [...new Set(products.map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}


function normalizeInventoryOverview(row: Record<string, unknown>): InventoryOverviewRow {
  return {
    product_id: String(row.product_id),
    product_name: text(row.product_name, "Produto sem nome"),
    category: text(row.category, "Sem categoria"),
    brand: typeof row.brand === "string" ? row.brand : null,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    min_stock: number(row.min_stock),
    ideal_stock: number(row.ideal_stock),
    cost_price: number(row.cost_price),
    sale_price: number(row.sale_price),
    physical_quantity: number(row.physical_quantity),
    reserved_quantity: number(row.reserved_quantity),
    available_quantity: number(row.available_quantity),
    incoming_quantity: number(row.incoming_quantity),
    stock_cost_value: number(row.stock_cost_value),
    stock_sale_value: number(row.stock_sale_value),
    stock_status: text(row.stock_status, "healthy"),
  };
}

export async function getInventoryOverview(): Promise<InventoryOverviewRow[]> {
  if (!isSupabaseConfigured) {
    const grouped = new Map<string, InventoryOverviewRow>();
    demoStock.forEach((row) => {
      const current = grouped.get(row.product_id);
      if (current) {
        current.physical_quantity += row.quantity;
        current.available_quantity += row.quantity;
        current.stock_cost_value += row.stock_cost_value;
        current.stock_sale_value += row.stock_sale_value;
      } else {
        grouped.set(row.product_id, {
          product_id: row.product_id, product_name: row.product_name, category: row.category, brand: null, image_url: null,
          min_stock: row.min_stock, ideal_stock: row.min_stock, cost_price: row.cost_price, sale_price: row.sale_price,
          physical_quantity: row.quantity, reserved_quantity: 0, available_quantity: row.quantity, incoming_quantity: 0,
          stock_cost_value: row.stock_cost_value, stock_sale_value: row.stock_sale_value,
          stock_status: row.quantity === 0 ? "out_of_stock" : row.quantity <= row.min_stock ? "below_minimum" : "healthy",
        });
      }
    });
    return [...grouped.values()].sort((a, b) => a.product_name.localeCompare(b.product_name, "pt-BR"));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_control_overview").select("*").order("product_name");
  if (error) throw error;
  return (data ?? []).map((row) => normalizeInventoryOverview(row as Record<string, unknown>));
}

export async function getInventoryLocationOverview(): Promise<InventoryLocationRow[]> {
  if (!isSupabaseConfigured) {
    return demoStock.map((row) => ({
      product_id: row.product_id, product_name: row.product_name, location_id: row.location_id, location_code: row.location_code,
      location_name: row.location_name, location_city: null, physical_quantity: row.quantity, reserved_quantity: 0,
      available_quantity: row.quantity, incoming_quantity: 0, stock_cost_value: row.stock_cost_value, stock_sale_value: row.stock_sale_value,
    }));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_location_overview").select("*").order("product_name").order("location_code");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    product_id: String(row.product_id), product_name: text(row.product_name), location_id: String(row.location_id),
    location_code: text(row.location_code), location_name: text(row.location_name), location_city: typeof row.location_city === "string" ? row.location_city : null,
    physical_quantity: number(row.physical_quantity), reserved_quantity: number(row.reserved_quantity), available_quantity: number(row.available_quantity),
    incoming_quantity: number(row.incoming_quantity), stock_cost_value: number(row.stock_cost_value), stock_sale_value: number(row.stock_sale_value),
  }));
}

export async function getInventorySummary(): Promise<InventorySummary> {
  if (!isSupabaseConfigured) {
    const rows = await getInventoryOverview();
    return {
      active_products: rows.length, products_with_stock: rows.filter((row) => row.physical_quantity > 0).length,
      physical_units: rows.reduce((sum, row) => sum + row.physical_quantity, 0), reserved_units: 0,
      available_units: rows.reduce((sum, row) => sum + row.available_quantity, 0), incoming_units: 0,
      stock_cost_value: rows.reduce((sum, row) => sum + row.stock_cost_value, 0),
      stock_sale_value: rows.reduce((sum, row) => sum + row.stock_sale_value, 0),
      attention_products: rows.filter((row) => row.stock_status !== "healthy").length,
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_control_summary").select("*").single();
  if (error) throw error;
  return {
    active_products: number(data.active_products), products_with_stock: number(data.products_with_stock),
    physical_units: number(data.physical_units), reserved_units: number(data.reserved_units),
    available_units: number(data.available_units), incoming_units: number(data.incoming_units),
    stock_cost_value: number(data.stock_cost_value), stock_sale_value: number(data.stock_sale_value),
    attention_products: number(data.attention_products),
  };
}

export async function getInventoryProductDetails(productId: string): Promise<InventoryProductDetails | null> {
  if (!isSupabaseConfigured) {
    const overview = (await getInventoryOverview()).find((row) => row.product_id === productId);
    if (!overview) return null;
    const locations: InventoryLocationRow[] = demoStock.filter((row) => row.product_id === productId).map((row) => ({
      product_id: row.product_id, product_name: row.product_name, location_id: row.location_id, location_code: row.location_code,
      location_name: row.location_name, location_city: null, physical_quantity: row.quantity, reserved_quantity: 0,
      available_quantity: row.quantity, incoming_quantity: 0, stock_cost_value: row.stock_cost_value, stock_sale_value: row.stock_sale_value,
    }));
    return { overview, locations, reservations: [], movements: [] };
  }
  const supabase = await createClient();
  const [overviewResult, locationsResult, reservationsResult, movementsResult] = await Promise.all([
    supabase.from("inventory_control_overview").select("*").eq("product_id", productId).maybeSingle(),
    supabase.from("inventory_location_overview").select("*").eq("product_id", productId).order("location_code"),
    supabase.from("inventory_product_reservations").select("*").eq("product_id", productId).in("status", ["reserved", "partial", "awaiting_stock"]).order("sale_date"),
    supabase.from("inventory_movement_history").select("*").eq("product_id", productId).order("occurred_at", { ascending: false }).limit(100),
  ]);
  if (overviewResult.error) throw overviewResult.error;
  if (locationsResult.error) throw locationsResult.error;
  if (reservationsResult.error) throw reservationsResult.error;
  if (movementsResult.error) throw movementsResult.error;
  if (!overviewResult.data) return null;
  return {
    overview: normalizeInventoryOverview(overviewResult.data as Record<string, unknown>),
    locations: (locationsResult.data ?? []).map((row) => ({
      product_id: String(row.product_id), product_name: text(row.product_name), location_id: String(row.location_id),
      location_code: text(row.location_code), location_name: text(row.location_name), location_city: typeof row.location_city === "string" ? row.location_city : null,
      physical_quantity: number(row.physical_quantity), reserved_quantity: number(row.reserved_quantity), available_quantity: number(row.available_quantity),
      incoming_quantity: number(row.incoming_quantity), stock_cost_value: number(row.stock_cost_value), stock_sale_value: number(row.stock_sale_value),
    })),
    reservations: (reservationsResult.data ?? []).map((row) => ({
      id: String(row.id), product_id: String(row.product_id), location_id: String(row.location_id), location_code: text(row.location_code),
      location_name: text(row.location_name), sale_id: String(row.sale_id), customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
      customer_name: text(row.customer_name, "Cliente não informado"), sale_date: String(row.sale_date ?? ""),
      quantity_requested: number(row.quantity_requested), quantity_reserved: number(row.quantity_reserved), quantity_missing: number(row.quantity_missing),
      status: text(row.status), reserved_at: typeof row.reserved_at === "string" ? row.reserved_at : null,
      fulfilled_at: typeof row.fulfilled_at === "string" ? row.fulfilled_at : null, notes: typeof row.notes === "string" ? row.notes : null,
    })),
    movements: (movementsResult.data ?? []).map((row) => ({
      id: String(row.id), product_id: String(row.product_id), product_name: text(row.product_name), location_id: String(row.location_id),
      location_code: text(row.location_code), location_name: text(row.location_name), movement_type: text(row.movement_type),
      quantity_delta: number(row.quantity_delta), sale_id: typeof row.sale_id === "string" ? row.sale_id : null,
      customer_id: typeof row.customer_id === "string" ? row.customer_id : null, customer_name: typeof row.customer_name === "string" ? row.customer_name : null,
      transfer_group_id: typeof row.transfer_group_id === "string" ? row.transfer_group_id : null,
      counterpart_location_code: typeof row.counterpart_location_code === "string" ? row.counterpart_location_code : null,
      counterpart_location_name: typeof row.counterpart_location_name === "string" ? row.counterpart_location_name : null,
      notes: typeof row.notes === "string" ? row.notes : null, occurred_at: String(row.occurred_at ?? ""),
    })),
  };
}

export async function getStock(): Promise<StockRow[]> {
  if (!isSupabaseConfigured) return demoStock;
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_overview").select("*").order("quantity", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    quantity: number(row.quantity),
    min_stock: number(row.min_stock),
    cost_price: number(row.cost_price),
    sale_price: number(row.sale_price),
    stock_cost_value: number(row.stock_cost_value),
    stock_sale_value: number(row.stock_sale_value),
  })) as StockRow[];
}

export async function getSalesHistory(limit = 500): Promise<SaleRow[]> {
  if (!isSupabaseConfigured) return demoSales;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_history")
    .select("*")
    .order("business_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => normalizeSale(row as Record<string, unknown>));
}

export async function getLeadsHistory(): Promise<LeadRow[]> {
  if (!isSupabaseConfigured) return demoLeads;
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads_history").select("*").order("lead_month", { ascending: false }).order("lead_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeLead(row as Record<string, unknown>));
}

export async function getLeadDetails(leadId: string): Promise<LeadDetails | null> {
  if (!isSupabaseConfigured) {
    const lead = demoLeads.find((row) => row.id === leadId);
    if (!lead) return null;
    return {
      id: lead.id,
      customer_id: lead.customer_id,
      customer_name: lead.customer_name,
      lead_at: lead.lead_at,
      lead_status: lead.lead_status,
      general_status: lead.general_status,
      reference: lead.reference,
      city: lead.city,
      phone: lead.phone,
      notes: lead.notes,
      product_id: lead.primary_product_id,
      product_name: lead.product_summary,
      product_image_url: lead.primary_image_url,
      category: null,
      brand: null,
      quote_id: null,
      quote_number: null,
      quote_status: null,
      quote_total_amount: null,
      quote_sale_id: null,
    };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: quoteData, error: quoteError }] = await Promise.all([
    supabase.from("sales").select(`id,customer_id,lead_status,general_status,quoted_at,reference,city,phone,notes,customer:customers(id,name,city,phone,reference),items:sale_items(id,product_id,product:products(id,name,image_url,category,brand))`).eq("id", leadId).eq("record_type", "lead").maybeSingle(),
    supabase.from("sales_quotes").select("id,quote_number,status,total_amount,sale_id").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (error) throw error;
  if (quoteError) throw quoteError;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const quote = quoteData as Record<string, unknown> | null;
  const customer = oneRelation(row.customer);
  const itemRows = Array.isArray(row.items) ? row.items as Record<string, unknown>[] : [];
  const firstItem = itemRows[0] ?? null;
  const product = firstItem ? oneRelation(firstItem.product) : null;
  return {
    id: String(row.id),
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: text(customer?.name, "Cliente não informado"),
    lead_at: String(row.quoted_at ?? ""),
    lead_status: typeof row.lead_status === "string" ? row.lead_status : null,
    general_status: text(row.general_status, "pending"),
    reference: typeof row.reference === "string" ? row.reference : typeof customer?.reference === "string" ? customer.reference : null,
    city: typeof row.city === "string" ? row.city : typeof customer?.city === "string" ? customer.city : null,
    phone: typeof row.phone === "string" ? row.phone : typeof customer?.phone === "string" ? customer.phone : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    product_id: firstItem && typeof firstItem.product_id === "string" ? firstItem.product_id : null,
    product_name: typeof product?.name === "string" ? product.name : null,
    product_image_url: typeof product?.image_url === "string" ? product.image_url : null,
    category: typeof product?.category === "string" ? product.category : null,
    brand: typeof product?.brand === "string" ? product.brand : null,
    quote_id: quote && typeof quote.id === "string" ? quote.id : null,
    quote_number: quote?.quote_number == null ? null : number(quote.quote_number),
    quote_status: quote && typeof quote.status === "string" ? quote.status : null,
    quote_total_amount: quote?.total_amount == null ? null : number(quote.total_amount),
    quote_sale_id: quote && typeof quote.sale_id === "string" ? quote.sale_id : null,
  };
}

export async function getQuoteDraft(quoteId: string): Promise<QuoteDraft | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_quotes")
    .select(`id,quote_number,customer_id,location_id,status,quoted_on,valid_until,discount_amount,gift_product_id,gift_quantity,payment_mode,payment_method,paid_on,payment_due_on,delivered,delivered_on,delivery_due_on,schedule_post_sale,post_sale_due_on,partner_id,notes,items:sales_quote_items(product_id,quantity,unit_price,product:products(name))`)
    .eq("id", quoteId)
    .eq("status", "quoted")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const itemRows = Array.isArray(row.items) ? row.items as Record<string, unknown>[] : [];
  return {
    id: String(row.id),
    quote_number: number(row.quote_number),
    customer_id: String(row.customer_id),
    location_id: String(row.location_id),
    quoted_on: String(row.quoted_on),
    valid_until: String(row.valid_until),
    discount_amount: number(row.discount_amount),
    gift_product_id: typeof row.gift_product_id === "string" ? row.gift_product_id : null,
    gift_quantity: number(row.gift_quantity),
    payment_mode: ["paid", "combined"].includes(String(row.payment_mode)) ? String(row.payment_mode) as "paid" | "combined" : "receivable",
    payment_method: typeof row.payment_method === "string" ? row.payment_method : null,
    paid_on: typeof row.paid_on === "string" ? row.paid_on : null,
    payment_due_on: typeof row.payment_due_on === "string" ? row.payment_due_on : null,
    delivered: Boolean(row.delivered),
    delivered_on: typeof row.delivered_on === "string" ? row.delivered_on : null,
    delivery_due_on: typeof row.delivery_due_on === "string" ? row.delivery_due_on : null,
    schedule_post_sale: Boolean(row.schedule_post_sale),
    post_sale_due_on: typeof row.post_sale_due_on === "string" ? row.post_sale_due_on : null,
    partner_id: typeof row.partner_id === "string" ? row.partner_id : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    items: itemRows.map((item) => ({
      product_id: String(item.product_id),
      product_name: text(oneRelation(item.product)?.name, "Produto"),
      quantity: number(item.quantity),
      unit_price: number(item.unit_price),
    })),
  };
}


function quoteEffectiveStatus(status: string, validUntil: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return status === "quoted" && validUntil < today ? "expired" : status;
}

function normalizeQuoteRow(row: Record<string, unknown>): QuoteRow {
  const customer = oneRelation(row.customer);
  const location = oneRelation(row.location);
  const gift = oneRelation(row.gift);
  const itemRows = Array.isArray(row.items) ? row.items as Record<string, unknown>[] : [];
  const productNames = itemRows.map((item) => {
    const product = oneRelation(item.product);
    const name = text(product?.name, "Produto");
    const quantity = number(item.quantity);
    return `${name} ×${quantity}`;
  });
  const status = text(row.status, "quoted");
  const validUntil = String(row.valid_until ?? "");
  return {
    id: String(row.id),
    quote_number: number(row.quote_number),
    customer_id: String(row.customer_id),
    customer_name: text(customer?.name, "Cliente não informado"),
    location_id: String(row.location_id),
    location_code: text(location?.code, "—"),
    lead_id: typeof row.lead_id === "string" ? row.lead_id : null,
    sale_id: typeof row.sale_id === "string" ? row.sale_id : null,
    status,
    effective_status: quoteEffectiveStatus(status, validUntil),
    quoted_on: String(row.quoted_on ?? ""),
    valid_until: validUntil,
    gross_amount: number(row.gross_amount),
    discount_amount: number(row.discount_amount),
    total_amount: number(row.total_amount),
    gift_product_id: typeof row.gift_product_id === "string" ? row.gift_product_id : null,
    gift_product_name: typeof gift?.name === "string" ? gift.name : null,
    gift_quantity: number(row.gift_quantity),
    product_summary: productNames.join(", "),
    total_items: itemRows.reduce((sum, item) => sum + number(item.quantity), 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

const quoteSelect = `
  id,quote_number,customer_id,location_id,lead_id,sale_id,status,quoted_on,valid_until,gross_amount,discount_amount,total_amount,
  gift_product_id,gift_quantity,payment_mode,payment_method,paid_on,payment_due_on,delivered,delivered_on,delivery_due_on,
  schedule_post_sale,post_sale_due_on,partner_id,notes,created_at,updated_at,
  customer:customers(id,name),location:locations(id,code,name),gift:products!sales_quotes_gift_product_id_fkey(id,name),
  partner:partners(id,name),items:sales_quote_items(product_id,quantity,unit_price,product:products(id,name))
`;

export async function getQuotesHistory(): Promise<QuoteRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("sales_quotes").select(quoteSelect).order("quoted_on", { ascending: false }).order("quote_number", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeQuoteRow(row as unknown as Record<string, unknown>));
}

export async function getQuoteDetails(quoteId: string): Promise<QuoteDetails | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("sales_quotes").select(quoteSelect).eq("id", quoteId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  const base = normalizeQuoteRow(row);
  const partner = oneRelation(row.partner);
  const itemRows = Array.isArray(row.items) ? row.items as Record<string, unknown>[] : [];
  return {
    ...base,
    payment_mode: ["paid", "combined"].includes(String(row.payment_mode)) ? String(row.payment_mode) as "paid" | "combined" : "receivable",
    payment_method: typeof row.payment_method === "string" ? row.payment_method : null,
    paid_on: typeof row.paid_on === "string" ? row.paid_on : null,
    payment_due_on: typeof row.payment_due_on === "string" ? row.payment_due_on : null,
    delivered: Boolean(row.delivered),
    delivered_on: typeof row.delivered_on === "string" ? row.delivered_on : null,
    delivery_due_on: typeof row.delivery_due_on === "string" ? row.delivery_due_on : null,
    schedule_post_sale: Boolean(row.schedule_post_sale),
    post_sale_due_on: typeof row.post_sale_due_on === "string" ? row.post_sale_due_on : null,
    partner_id: typeof row.partner_id === "string" ? row.partner_id : null,
    partner_name: typeof partner?.name === "string" ? partner.name : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    items: itemRows.map((item) => ({
      product_id: String(item.product_id),
      product_name: text(oneRelation(item.product)?.name, "Produto"),
      quantity: number(item.quantity),
      unit_price: number(item.unit_price),
    })),
  };
}

function normalizeCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    name: text(row.name, "Cliente sem nome"),
    city: typeof row.city === "string" ? row.city : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    total_spent: number(row.total_spent),
    purchase_count: number(row.purchase_count),
    last_purchase_at: typeof row.last_purchase_at === "string" ? row.last_purchase_at : null,
    lead_count: number(row.lead_count),
    pending_sales_count: number(row.pending_sales_count),
    crm_status: text(row.crm_status, "active"),
    next_contact_at: typeof row.next_contact_at === "string" ? row.next_contact_at : null,
    last_contact_at: typeof row.last_contact_at === "string" ? row.last_contact_at : null,
    last_contact_outcome: typeof row.last_contact_outcome === "string" ? row.last_contact_outcome : null,
    contact_lost: Boolean(row.contact_lost),
    tags: typeof row.tags === "string" ? row.tags : null,
    next_followup_id: typeof row.next_followup_id === "string" ? row.next_followup_id : null,
    next_followup_at: typeof row.next_followup_at === "string" ? row.next_followup_at : null,
    next_followup_notes: typeof row.next_followup_notes === "string" ? row.next_followup_notes : null,
    interaction_count: number(row.interaction_count),
    pending_followup_count: number(row.pending_followup_count),
    days_since_last_purchase: row.days_since_last_purchase == null ? null : number(row.days_since_last_purchase),
    days_since_last_contact: row.days_since_last_contact == null ? null : number(row.days_since_last_contact),
    care_alert: Boolean(row.care_alert),
    radar_status: text(row.radar_status, "active"),
    radar_rank: number(row.radar_rank),
    next_action_label: text(row.next_action_label, "Relacionamento ativo"),
  };
}

export async function getCustomers(): Promise<Customer[]> {
  if (!isSupabaseConfigured) return demoCustomers;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_crm_overview")
    .select("*")
    .order("radar_rank", { ascending: true })
    .order("next_followup_at", { ascending: true, nullsFirst: false })
    .order("last_purchase_at", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeCustomer(row as Record<string, unknown>));
}

export async function getCustomerCRMSummary(): Promise<CustomerCRMSummary> {
  if (!isSupabaseConfigured) {
    return {
      total_active_customers: demoCustomers.length,
      followups_today: demoCustomers.filter((row) => row.radar_status === "due_today").length,
      overdue_followups: demoCustomers.filter((row) => row.radar_status === "overdue_followup").length,
      inactive_customers: demoCustomers.filter((row) => row.radar_status === "inactive").length,
      lead_only_customers: demoCustomers.filter((row) => row.radar_status === "lead_only").length,
      care_customers: demoCustomers.filter((row) => row.care_alert).length,
      customers_with_pending_orders: demoCustomers.filter((row) => row.pending_sales_count > 0).length,
      total_customer_value: demoCustomers.reduce((sum, row) => sum + row.total_spent, 0),
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("customer_crm_summary").select("*").single();
  if (error) throw error;
  return {
    total_active_customers: number(data.total_active_customers),
    followups_today: number(data.followups_today),
    overdue_followups: number(data.overdue_followups),
    inactive_customers: number(data.inactive_customers),
    lead_only_customers: number(data.lead_only_customers),
    care_customers: number(data.care_customers),
    customers_with_pending_orders: number(data.customers_with_pending_orders),
    total_customer_value: number(data.total_customer_value),
  };
}
export async function getCustomerOptions(): Promise<CustomerOption[]> {
  if (!isSupabaseConfigured) return demoCustomers.map(({ id, name, city, phone }) => ({ id, name, city, phone }));
  const supabase = await createClient(); const { data, error } = await supabase.from("customers").select("id,name,city,phone").eq("active", true).order("name", { ascending: true }); if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), name: text(row.name, "Cliente sem nome"), city: typeof row.city === "string" ? row.city : null, phone: typeof row.phone === "string" ? row.phone : null }));
}
export async function getProductOptions(): Promise<ProductOption[]> { const products = await getProductCatalog(); return products.filter((product) => product.active).map(({ id, name, category, brand, image_url }) => ({ id, name, category, brand, image_url })); }
export async function getSaleStockOptions(): Promise<SaleStockOption[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sale_stock_availability")
    .select("*")
    .order("product_name", { ascending: true })
    .order("location_code", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    product_id: String(row.product_id),
    product_name: text(row.product_name, "Produto sem nome"),
    category: text(row.category, "Sem categoria"),
    brand: typeof row.brand === "string" ? row.brand : null,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    cost_price: number(row.cost_price),
    sale_price: number(row.sale_price),
    location_id: String(row.location_id),
    location_code: text(row.location_code),
    location_name: text(row.location_name),
    physical_quantity: number(row.physical_quantity),
    reserved_quantity: number(row.reserved_quantity),
    available_quantity: number(row.available_quantity),
  }));
}

export async function getSaleLocations(): Promise<LocationOption[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id,code,name,city")
    .eq("active", true)
    .eq("tracks_inventory", true)
    .order("code");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), code: text(row.code), name: text(row.name), city: typeof row.city === "string" ? row.city : null }));
}

export async function getSalePartners(): Promise<PartnerOption[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("sale_partner_options").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id), name: text(row.name), partner_type: text(row.partner_type),
    city: typeof row.city === "string" ? row.city : null,
    partnership_model: typeof row.partnership_model === "string" ? row.partnership_model : null,
    settlement_rule: typeof row.settlement_rule === "string" ? row.settlement_rule : null,
    commission_pct: number(row.commission_pct),
  }));
}
export async function getCustomerDetails(customerId: string): Promise<CustomerDetails | null> {
  if (!isSupabaseConfigured) {
    const customer = demoCustomers.find((row) => row.id === customerId);
    if (!customer) return null;
    return { ...customer, reference: null, email: null, notes: null, sensitive_to_caffeine: false, anxiety_or_insomnia: false, prohibited_products: null, approach_preferences: null, active: true };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("customer_crm_overview").select("*").eq("id", customerId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const base = normalizeCustomer(data as Record<string, unknown>);
  return {
    ...base,
    reference: typeof data.reference === "string" ? data.reference : null,
    email: typeof data.email === "string" ? data.email : null,
    notes: typeof data.notes === "string" ? data.notes : null,
    sensitive_to_caffeine: Boolean(data.sensitive_to_caffeine),
    anxiety_or_insomnia: Boolean(data.anxiety_or_insomnia),
    prohibited_products: typeof data.prohibited_products === "string" ? data.prohibited_products : null,
    approach_preferences: typeof data.approach_preferences === "string" ? data.approach_preferences : null,
    active: Boolean(data.active),
  };
}

export async function getCustomerInteractions(customerId: string): Promise<CustomerInteraction[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_interaction_history")
    .select("*")
    .eq("customer_id", customerId)
    .order("status", { ascending: false })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    customer_id: String(row.customer_id),
    sale_id: typeof row.sale_id === "string" ? row.sale_id : null,
    interaction_type: text(row.interaction_type),
    status: text(row.status),
    channel: typeof row.channel === "string" ? row.channel : null,
    occurred_at: typeof row.occurred_at === "string" ? row.occurred_at : null,
    due_at: typeof row.due_at === "string" ? row.due_at : null,
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
    outcome: typeof row.outcome === "string" ? row.outcome : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: String(row.created_at ?? ""),
    created_by_name: typeof row.created_by_name === "string" ? row.created_by_name : null,
    sale_total: row.sale_total == null ? null : number(row.sale_total),
    sale_product_summary: typeof row.sale_product_summary === "string" ? row.sale_product_summary : null,
  }));
}
export async function getCustomerSales(customerId: string): Promise<SaleRow[]> { return (await getSalesHistory()).filter((sale) => sale.customer_id === customerId); }
export async function getCustomerLeads(customerId: string): Promise<LeadRow[]> { return (await getLeadsHistory()).filter((lead) => lead.customer_id === customerId); }
export async function getCustomerPendingOrders(customerId: string): Promise<PendingOrderRow[]> { return (await getPendingOrders()).filter((order) => order.customer_id === customerId); }

export async function getMovements(): Promise<Movement[]> {
  if (!isSupabaseConfigured) return demoMovements;
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_movements").select("id,created_at,movement_type,quantity_delta,notes,product:products(name),location:locations(code)").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const product = row.product as { name?: string } | null;
    const location = row.location as { code?: string } | null;
    return {
      id: String(row.id),
      created_at: String(row.created_at),
      movement_type: String(row.movement_type),
      quantity_delta: number(row.quantity_delta),
      notes: typeof row.notes === "string" ? row.notes : null,
      product_name: product?.name ?? "—",
      location_code: location?.code ?? "—",
    };
  });
}

export async function getPendingOrders(): Promise<PendingOrderRow[]> {
  if (!isSupabaseConfigured) return demoPendingOrders;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pending_orders")
    .select("*")
    .order("business_date", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: text(row.customer_name, "Cliente não informado"),
    location_id: String(row.location_id ?? ""),
    location_code: text(row.location_code),
    location_name: text(row.location_name),
    business_at: String(row.business_at ?? ""),
    business_date: String(row.business_date ?? ""),
    order_at: String(row.order_at ?? ""),
    paid_at: typeof row.paid_at === "string" ? row.paid_at : null,
    delivered_at: typeof row.delivered_at === "string" ? row.delivered_at : null,
    general_status: text(row.general_status, "active"),
    payment_status: text(row.payment_status, "not_applicable"),
    delivery_status: text(row.delivery_status, "not_applicable"),
    payment_method: typeof row.payment_method === "string" ? row.payment_method : null,
    payment_condition: typeof row.payment_condition === "string" ? row.payment_condition : null,
    total_amount: number(row.total_amount),
    total_profit: number(row.total_profit),
    product_summary: typeof row.product_summary === "string" ? row.product_summary : null,
    total_items: number(row.total_items),
    primary_product_id: typeof row.primary_product_id === "string" ? row.primary_product_id : null,
    primary_image_url: typeof row.primary_image_url === "string" ? row.primary_image_url : null,
    payment_due_at: typeof row.payment_due_at === "string" ? row.payment_due_at : null,
    price_condition: typeof row.price_condition === "string" ? row.price_condition : null,
    partner_id: typeof row.partner_id === "string" ? row.partner_id : null,
    partner_name: typeof row.partner_name === "string" ? row.partner_name : null,
    reservation_status: typeof row.reservation_status === "string" ? row.reservation_status : null,
  }));
}

function oneRelation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown> | undefined) ?? null;
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

export async function getSaleDetails(saleId: string): Promise<SaleDetails | null> {
  if (!isSupabaseConfigured) {
    const order = demoPendingOrders.find((row) => row.id === saleId);
    if (!order) return null;
    return {
      id: order.id,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      reference: null,
      city: null,
      phone: null,
      location_id: order.location_id,
      location_code: order.location_code,
      location_name: order.location_name,
      order_at: order.order_at,
      paid_at: order.paid_at,
      delivered_at: order.delivered_at,
      general_status: order.general_status,
      payment_status: order.payment_status,
      delivery_status: order.delivery_status,
      payment_method: order.payment_method,
      payment_condition: order.payment_condition,
      payment_due_at: order.payment_due_at,
      price_condition: order.price_condition,
      partner_id: order.partner_id,
      partner_name: order.partner_name,
      total_amount: order.total_amount,
      total_cost: 0,
      total_profit: order.total_profit,
      gross_amount: order.total_amount,
      discount_amount: 0,
      gift_product_id: null,
      gift_product_name: null,
      gift_quantity: 0,
      quote_id: null,
      quote_number: null,
      notes: null,
      items: [{
        id: "demo-item",
        product_id: order.primary_product_id ?? "p1",
        product_name: order.product_summary ?? "Produto",
        product_image_url: order.primary_image_url,
        category: "Saúde",
        brand: null,
        quantity: order.total_items || 1,
        unit_cost: 0,
        unit_price: order.total_amount / Math.max(order.total_items, 1),
        price_condition: order.price_condition,
        quantity_requested: order.total_items || 1,
        quantity_reserved: null,
        reservation_status: order.reservation_status,
      }],
    };
  }

  const supabase = await createClient();
  const [{ data, error }, { data: quoteData, error: quoteError }] = await Promise.all([
    supabase
      .from("sales")
      .select(`
        id,customer_id,location_id,reference,city,phone,general_status,payment_status,delivery_status,
        payment_method,payment_condition,payment_due_at,price_condition,partner_id,quoted_at,paid_at,delivered_at,
        total_amount,total_cost,total_profit,discount_amount,gift_product_id,gift_quantity,notes,
        customer:customers(id,name,city,phone),
        location:locations(id,code,name),
        partner:partners(id,name),
        items:sale_items(id,product_id,quantity,unit_cost,unit_price,price_condition,product:products(id,name,image_url,category,brand),reservations:stock_reservations(quantity_requested,quantity_reserved,status))
      `)
      .eq("id", saleId)
      .eq("record_type", "sale")
      .maybeSingle(),
    supabase.from("sales_quotes").select("id,quote_number,gift_product_id,gift_quantity,gift:products!sales_quotes_gift_product_id_fkey(id,name)").eq("sale_id", saleId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (error) throw error;
  if (quoteError) throw quoteError;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const quote = quoteData as Record<string, unknown> | null;
  const customer = oneRelation(row.customer);
  const location = oneRelation(row.location);
  const partner = oneRelation(row.partner);
  const gift = quote ? oneRelation(quote.gift) : null;
  const itemRows = Array.isArray(row.items) ? row.items as Record<string, unknown>[] : [];
  const items = itemRows.map((item) => {
    const product = oneRelation(item.product);
    const reservation = oneRelation(item.reservations);
    return {
      id: String(item.id),
      product_id: String(item.product_id),
      product_name: text(product?.name, "Produto sem nome"),
      product_image_url: typeof product?.image_url === "string" ? product.image_url : null,
      category: typeof product?.category === "string" ? product.category : null,
      brand: typeof product?.brand === "string" ? product.brand : null,
      quantity: number(item.quantity),
      unit_cost: number(item.unit_cost),
      unit_price: number(item.unit_price),
      price_condition: typeof item.price_condition === "string" ? item.price_condition : null,
      quantity_requested: reservation?.quantity_requested == null ? null : number(reservation.quantity_requested),
      quantity_reserved: reservation?.quantity_reserved == null ? null : number(reservation.quantity_reserved),
      reservation_status: typeof reservation?.status === "string" ? reservation.status : null,
    };
  });
  const grossAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  return {
    id: String(row.id),
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: text(customer?.name, "Cliente não informado"),
    reference: typeof row.reference === "string" ? row.reference : null,
    city: typeof row.city === "string" ? row.city : typeof customer?.city === "string" ? customer.city : null,
    phone: typeof row.phone === "string" ? row.phone : typeof customer?.phone === "string" ? customer.phone : null,
    location_id: String(row.location_id ?? ""),
    location_code: text(location?.code),
    location_name: text(location?.name),
    order_at: String(row.quoted_at ?? ""),
    paid_at: typeof row.paid_at === "string" ? row.paid_at : null,
    delivered_at: typeof row.delivered_at === "string" ? row.delivered_at : null,
    general_status: text(row.general_status, "active"),
    payment_status: text(row.payment_status, "receivable"),
    delivery_status: text(row.delivery_status, "to_deliver"),
    payment_method: typeof row.payment_method === "string" ? row.payment_method : null,
    payment_condition: typeof row.payment_condition === "string" ? row.payment_condition : null,
    payment_due_at: typeof row.payment_due_at === "string" ? row.payment_due_at : null,
    price_condition: typeof row.price_condition === "string" ? row.price_condition : null,
    partner_id: typeof row.partner_id === "string" ? row.partner_id : null,
    partner_name: typeof partner?.name === "string" ? partner.name : null,
    total_amount: number(row.total_amount),
    total_cost: number(row.total_cost),
    total_profit: number(row.total_profit),
    gross_amount: grossAmount,
    discount_amount: number(row.discount_amount),
    gift_product_id: typeof row.gift_product_id === "string" ? row.gift_product_id : quote && typeof quote.gift_product_id === "string" ? quote.gift_product_id : null,
    gift_product_name: typeof gift?.name === "string" ? gift.name : null,
    gift_quantity: number(row.gift_quantity ?? quote?.gift_quantity),
    quote_id: quote && typeof quote.id === "string" ? quote.id : null,
    quote_number: quote?.quote_number == null ? null : number(quote.quote_number),
    notes: typeof row.notes === "string" ? row.notes : null,
    items,
  };
}

export async function getReplenishment(): Promise<ReplenishmentRow[]> {
  if (!isSupabaseConfigured) return demoReplenishment;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("replenishment_overview")
    .select("*")
    .eq("needs_replenishment", true)
    .order("company_quantity", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    product_id: String(row.product_id),
    product_name: text(row.product_name, "Produto sem nome"),
    category: text(row.category, "Sem categoria"),
    company_quantity: number(row.company_quantity),
    min_stock: number(row.min_stock),
    ideal_stock: number(row.ideal_stock),
    needs_replenishment: Boolean(row.needs_replenishment),
    suggested_order_quantity: number(row.suggested_order_quantity),
    stock_status: text(row.stock_status, "below_minimum"),
  }));
}

export async function getCommercialDashboardSummary(): Promise<CommercialDashboardSummary> {
  if (!isSupabaseConfigured) {
    const revenue = demoSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const profit = demoSales.reduce((sum, sale) => sum + sale.total_profit, 0);
    return {
      total_sales: demoSales.length,
      total_revenue: revenue,
      total_profit: profit,
      receivable_total: demoPendingOrders.reduce((sum, order) => sum + order.total_amount, 0),
      receivable_sales: demoPendingOrders.length,
      current_month_sales: demoSales.length,
      current_month_revenue: revenue,
      current_month_profit: profit,
      previous_month_sales: 0,
      previous_month_revenue: 0,
      previous_month_profit: 0,
      operational_units: demoStock.reduce((sum, row) => sum + row.quantity, 0),
      all_units: demoStock.reduce((sum, row) => sum + row.quantity, 0),
      stock_cost_value: demoStock.reduce((sum, row) => sum + row.stock_cost_value, 0),
      stock_sale_value: demoStock.reduce((sum, row) => sum + row.stock_sale_value, 0),
      stock_potential_profit: demoStock.reduce((sum, row) => sum + row.stock_sale_value - row.stock_cost_value, 0),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("commercial_dashboard_summary").select("*").single();
  if (error) throw error;
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, number(value)])) as CommercialDashboardSummary;
}

export async function getDashboardOperationalSummary(): Promise<DashboardOperationalSummary> {
  if (!isSupabaseConfigured) {
    const summary = await getCommercialDashboardSummary();
    return {
      today: new Date().toISOString().slice(0, 10),
      pending_orders_count: demoPendingOrders.length,
      pending_delivery_count: demoPendingOrders.filter((sale) => sale.delivery_status === "to_deliver").length,
      pending_payment_count: demoPendingOrders.filter((sale) => sale.payment_status === "receivable").length,
      overdue_payment_count: 0,
      overdue_payment_total: 0,
      payment_due_today_count: 0,
      payment_due_today_total: 0,
      open_leads_count: demoLeads.length,
      stale_leads_count: demoLeads.length,
      supplier_orders_open_count: 0,
      incoming_units: 0,
      stock_attention_products: demoReplenishment.length,
      out_of_stock_products: demoReplenishment.filter((row) => row.company_quantity === 0).length,
      physical_units: summary.operational_units,
      reserved_units: 0,
      available_units: summary.operational_units,
      current_month_sales: summary.current_month_sales,
      current_month_revenue: summary.current_month_revenue,
      current_month_profit: summary.current_month_profit,
      previous_month_sales: summary.previous_month_sales,
      previous_month_revenue: summary.previous_month_revenue,
      previous_month_profit: summary.previous_month_profit,
      receivable_total: summary.receivable_total,
      stock_cost_value: summary.stock_cost_value,
      stock_sale_value: summary.stock_sale_value,
      stock_potential_profit: summary.stock_potential_profit,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("dashboard_operational_summary").select("*").single();
  if (error) throw error;

  return {
    today: String(data.today ?? ""),
    pending_orders_count: number(data.pending_orders_count),
    pending_delivery_count: number(data.pending_delivery_count),
    pending_payment_count: number(data.pending_payment_count),
    overdue_payment_count: number(data.overdue_payment_count),
    overdue_payment_total: number(data.overdue_payment_total),
    payment_due_today_count: number(data.payment_due_today_count),
    payment_due_today_total: number(data.payment_due_today_total),
    open_leads_count: number(data.open_leads_count),
    stale_leads_count: number(data.stale_leads_count),
    supplier_orders_open_count: number(data.supplier_orders_open_count),
    incoming_units: number(data.incoming_units),
    stock_attention_products: number(data.stock_attention_products),
    out_of_stock_products: number(data.out_of_stock_products),
    physical_units: number(data.physical_units),
    reserved_units: number(data.reserved_units),
    available_units: number(data.available_units),
    current_month_sales: number(data.current_month_sales),
    current_month_revenue: number(data.current_month_revenue),
    current_month_profit: number(data.current_month_profit),
    previous_month_sales: number(data.previous_month_sales),
    previous_month_revenue: number(data.previous_month_revenue),
    previous_month_profit: number(data.previous_month_profit),
    receivable_total: number(data.receivable_total),
    stock_cost_value: number(data.stock_cost_value),
    stock_sale_value: number(data.stock_sale_value),
    stock_potential_profit: number(data.stock_potential_profit),
  };
}

export async function getDashboardPriorityItems(limit = 15): Promise<DashboardPriorityItem[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const [{ data, error }, { data: preferences, error: preferencesError }] = await Promise.all([
    supabase
      .from("dashboard_priority_items")
      .select("*")
      .in("item_type", ["payment", "stock", "lead"])
      .order("priority_rank", { ascending: true })
      .order("reference_date", { ascending: true })
      .limit(120),
    supabase
      .from("dashboard_priority_preferences")
      .select("item_type,entity_id,hidden_until,permanently_hidden"),
  ]);
  if (error) throw error;
  if (preferencesError) throw preferencesError;

  const now = Date.now();
  const hidden = new Set(
    (preferences ?? [])
      .filter((row) => Boolean(row.permanently_hidden) || (typeof row.hidden_until === "string" && new Date(row.hidden_until).getTime() > now))
      .map((row) => `${String(row.item_type)}:${String(row.entity_id)}`),
  );

  const rows = (data ?? [])
    .map((row) => ({
      item_type: row.item_type as DashboardPriorityItem["item_type"],
      priority_rank: number(row.priority_rank),
      entity_id: String(row.entity_id),
      customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
      product_id: typeof row.product_id === "string" ? row.product_id : null,
      title: text(row.title, "Item sem título"),
      subtitle: text(row.subtitle, "Sem detalhes"),
      reference_date: String(row.reference_date ?? ""),
      amount: row.amount == null ? null : number(row.amount),
      quantity: number(row.quantity),
      href: text(row.href, "/suplementos"),
    }))
    .filter((item) => !hidden.has(`${item.item_type}:${item.entity_id}`));

  const typeOrder: DashboardPriorityItem["item_type"][] = ["payment", "stock", "lead"];
  const perType = Math.max(1, Math.ceil(limit / typeOrder.length));
  const selected = typeOrder.flatMap((type) =>
    rows
      .filter((row) => row.item_type === type)
      .sort((a, b) => a.priority_rank - b.priority_rank || a.reference_date.localeCompare(b.reference_date))
      .slice(0, perType),
  );

  return selected.slice(0, limit);
}

function normalizeAgendaEvent(row: Record<string, unknown>): AgendaEvent {
  return {
    event_key: String(row.event_key ?? ""),
    source_type: row.source_type as AgendaEvent["source_type"],
    source_id: String(row.source_id ?? ""),
    category: row.category as AgendaEvent["category"],
    title: text(row.title, "Compromisso"),
    subtitle: text(row.subtitle, "Sem detalhes"),
    due_at: String(row.due_at ?? ""),
    due_date: String(row.due_date ?? ""),
    status: row.status as AgendaEvent["status"],
    priority: row.priority as AgendaEvent["priority"],
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: typeof row.customer_name === "string" ? row.customer_name : null,
    customer_phone: typeof row.customer_phone === "string" ? row.customer_phone : null,
    sale_id: typeof row.sale_id === "string" ? row.sale_id : null,
    purchase_order_id: typeof row.purchase_order_id === "string" ? row.purchase_order_id : null,
    assigned_to: typeof row.assigned_to === "string" ? row.assigned_to : null,
    assigned_name: typeof row.assigned_name === "string" ? row.assigned_name : null,
    href: text(row.href, "/agenda"),
    notes: typeof row.notes === "string" ? row.notes : null,
    amount: row.amount == null ? null : number(row.amount),
    created_at: String(row.created_at ?? ""),
  };
}

export async function getAgendaEvents(): Promise<AgendaEvent[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operational_calendar_events")
    .select("*")
    .order("due_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeAgendaEvent(row as Record<string, unknown>));
}

export async function getAgendaSummary(): Promise<AgendaSummary> {
  if (!isSupabaseConfigured) return { today_count: 0, overdue_count: 0, next_seven_days_count: 0, completed_month_count: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase.from("operational_agenda_summary").select("*").single();
  if (error) throw error;
  return {
    today_count: number(data.today_count),
    overdue_count: number(data.overdue_count),
    next_seven_days_count: number(data.next_seven_days_count),
    completed_month_count: number(data.completed_month_count),
  };
}

export async function getAgendaTodayEvents(limit = 6): Promise<AgendaEvent[]> {
  if (!isSupabaseConfigured) return [];
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operational_calendar_events")
    .select("*")
    .eq("status", "planned")
    .lte("due_date", today)
    .order("due_date", { ascending: true })
    .order("due_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => normalizeAgendaEvent(row as Record<string, unknown>));
}

export async function getAgendaUsers(): Promise<AgendaUserOption[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,email")
    .eq("active", true)
    .eq("can_access_supplements", true)
    .order("full_name");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), name: text(row.full_name, text(row.email, "Usuário")), email: typeof row.email === "string" ? row.email : null }));
}

export async function getAgendaSaleOptions(): Promise<AgendaSaleOption[]> {
  const sales = await getSalesHistory();
  return sales
    .filter((sale) => sale.general_status !== "cancelled" && (sale.delivery_status !== "delivered" || sale.payment_status !== "received"))
    .slice(0, 120)
    .map((sale) => ({
      id: sale.id,
      customer_id: sale.customer_id,
      label: `${sale.customer_name} · ${sale.product_summary ?? "Venda"} · ${sale.business_date}`,
    }));
}

export async function getAgendaPurchaseOrderOptions(): Promise<AgendaPurchaseOrderOption[]> {
  const orders = await getSupplierOrderSummaries();
  return orders
    .filter((order) => order.status === "pending" || order.status === "partial")
    .map((order) => ({ id: order.id, label: `${order.supplier_name} · ${order.product_summary ?? `${order.pending_units} unidade(s)`}` }));
}

export async function getPanelCS(period: PanelPeriod = "current"): Promise<PanelCSData> {
  const [summary, pendingOrders, allSales] = await Promise.all([
    getCommercialDashboardSummary(),
    getPendingOrders(),
    getSalesHistory(),
  ]);

  const sales = allSales.filter((sale) => isCommercialSale(sale) && dateInPeriod(sale.delivered_at, period));
  const grossRevenue = period === "current"
    ? summary.current_month_revenue
    : period === "previous"
      ? summary.previous_month_revenue
      : summary.total_revenue;
  const profit = period === "current"
    ? summary.current_month_profit
    : period === "previous"
      ? summary.previous_month_profit
      : summary.total_profit;
  const saleCount = period === "current"
    ? summary.current_month_sales
    : period === "previous"
      ? summary.previous_month_sales
      : summary.total_sales;
  const comparisonRevenue = period === "current" ? summary.previous_month_revenue : 0;
  const comparisonProfit = period === "current" ? summary.previous_month_profit : 0;
  const comparisonSales = period === "current" ? summary.previous_month_sales : 0;

  return {
    period,
    periodLabel: period === "current" ? "Mês atual" : period === "previous" ? "Mês anterior" : "Visão geral",
    grossRevenue,
    profit,
    saleCount,
    receivable: summary.receivable_total,
    pendingOrdersCount: pendingOrders.length,
    averageTicket: saleCount > 0 ? grossRevenue / saleCount : 0,
    marginPercent: grossRevenue > 0 ? (profit / grossRevenue) * 100 : 0,
    comparisonRevenue,
    comparisonProfit,
    comparisonSales,
    revenueChange: period === "current" ? percentChange(grossRevenue, comparisonRevenue) : null,
    profitChange: period === "current" ? percentChange(profit, comparisonProfit) : null,
    salesChange: period === "current" ? percentChange(saleCount, comparisonSales) : null,
    sales,
  };
}

async function getDashboardLightweightTotals(): Promise<{
  total_revenue: number;
  active_products_count: number;
  pending_orders_value: number;
}> {
  if (!isSupabaseConfigured) {
    return {
      total_revenue: demoSales.reduce((sum, sale) => sum + sale.total_amount, 0),
      active_products_count: demoProducts.filter((product) => product.active).length,
      pending_orders_value: demoPendingOrders.reduce((sum, sale) => sum + sale.total_amount, 0),
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("dashboard_lightweight_totals").select("*").single();
  if (error) throw error;
  return {
    total_revenue: number(data.total_revenue),
    active_products_count: number(data.active_products_count),
    pending_orders_value: number(data.pending_orders_value),
  };
}

async function getDashboardReplenishment(limit = 32): Promise<ReplenishmentRow[]> {
  if (!isSupabaseConfigured) return demoReplenishment.slice(0, limit);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("replenishment_overview")
    .select("*")
    .eq("needs_replenishment", true)
    .order("company_quantity", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    product_id: String(row.product_id),
    product_name: text(row.product_name, "Produto sem nome"),
    category: text(row.category, "Sem categoria"),
    company_quantity: number(row.company_quantity),
    min_stock: number(row.min_stock),
    ideal_stock: number(row.ideal_stock),
    needs_replenishment: Boolean(row.needs_replenishment),
    suggested_order_quantity: number(row.suggested_order_quantity),
    stock_status: text(row.stock_status, "below_minimum"),
  }));
}

export async function getDashboard(): Promise<DashboardData> {
  const [totals, operational, priorities, recentSales, lowStock, agendaToday, agendaSummary] = await Promise.all([
    getDashboardLightweightTotals(),
    getDashboardOperationalSummary(),
    getDashboardPriorityItems(),
    getSalesHistory(30),
    getDashboardReplenishment(),
    getAgendaTodayEvents(),
    getAgendaSummary(),
  ]);

  return {
    totalProducts: totals.active_products_count,
    totalUnits: operational.available_units,
    stockCostValue: operational.stock_cost_value,
    stockSaleValue: operational.stock_sale_value,
    totalRevenue: totals.total_revenue,
    receivable: operational.receivable_total,
    pendingOrdersCount: operational.pending_orders_count,
    pendingDeliveryCount: operational.pending_delivery_count,
    pendingPaymentCount: operational.pending_payment_count,
    pendingOrdersValue: totals.pending_orders_value,
    currentMonthRevenue: operational.current_month_revenue,
    currentMonthProfit: operational.current_month_profit,
    currentMonthSalesCount: operational.current_month_sales,
    previousMonthRevenue: operational.previous_month_revenue,
    previousMonthProfit: operational.previous_month_profit,
    previousMonthSalesCount: operational.previous_month_sales,
    revenueChange: percentChange(operational.current_month_revenue, operational.previous_month_revenue),
    profitChange: percentChange(operational.current_month_profit, operational.previous_month_profit),
    salesChange: percentChange(operational.current_month_sales, operational.previous_month_sales),
    operational,
    priorities,
    recentSales: recentSales.filter(isCommercialSale).slice(0, 8),
    agendaToday,
    agendaSummary,
    lowStock: lowStock
      .filter((row) => {
        const value = `${row.product_name} ${row.category}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR");
        return !value.includes("combo");
      })
      .slice(0, 8),
  };
}


function normalizeSupplierOrderSummary(row: Record<string, unknown>): SupplierOrderSummary {
  return {
    id: String(row.id),
    supplier_id: String(row.supplier_id),
    supplier_name: text(row.supplier_name, "Fornecedor não informado"),
    ordered_on: String(row.ordered_on ?? ""),
    destination_location_id: String(row.destination_location_id),
    destination_code: text(row.destination_code),
    destination_name: text(row.destination_name),
    status: text(row.status, "pending"),
    notes: typeof row.notes === "string" ? row.notes : null,
    legacy_supplier_order_id: typeof row.legacy_supplier_order_id === "string" ? row.legacy_supplier_order_id : null,
    item_count: number(row.item_count),
    ordered_units: number(row.ordered_units),
    received_units: number(row.received_units),
    pending_units: number(row.pending_units),
    order_total: number(row.order_total),
    product_summary: typeof row.product_summary === "string" ? row.product_summary : null,
    waiting_sales_count: number(row.waiting_sales_count),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function getSupplierOptions(): Promise<SupplierOption[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").select("id,name,notes").eq("active", true).order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: text(row.name, "Fornecedor sem nome"),
    notes: typeof row.notes === "string" ? row.notes : null,
  }));
}

export async function getPurchaseProductOptions(): Promise<PurchaseProductOption[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const [{ data: products, error: productsError }, { data: incoming, error: incomingError }] = await Promise.all([
    supabase.from("products").select("id,name,category,brand,image_url,cost_price,sale_price").eq("active", true).order("name"),
    supabase.from("product_incoming_stock").select("product_id,incoming_quantity"),
  ]);
  if (productsError) throw productsError;
  if (incomingError) throw incomingError;
  const incomingByProduct = new Map((incoming ?? []).map((row) => [String(row.product_id), number(row.incoming_quantity)]));
  return (products ?? []).map((row) => ({
    id: String(row.id),
    name: text(row.name, "Produto sem nome"),
    category: text(row.category, "Sem categoria"),
    brand: typeof row.brand === "string" ? row.brand : null,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    cost_price: number(row.cost_price),
    sale_price: number(row.sale_price),
    incoming_quantity: incomingByProduct.get(String(row.id)) ?? 0,
  }));
}

export async function getSupplierOrderSummaries(): Promise<SupplierOrderSummary[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("supplier_order_summary").select("*").order("ordered_on", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeSupplierOrderSummary(row as Record<string, unknown>));
}

export async function getSupplierOrderDetails(orderId: string): Promise<SupplierOrderDetails | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const [{ data: summary, error: summaryError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("supplier_order_summary").select("*").eq("id", orderId).maybeSingle(),
    supabase.from("supplier_order_items_overview").select("*").eq("purchase_order_id", orderId).order("product_name"),
  ]);
  if (summaryError) throw summaryError;
  if (itemsError) throw itemsError;
  if (!summary) return null;
  const itemIds = (items ?? []).map((item) => String(item.id));
  let waitingRows: Record<string, unknown>[] = [];
  if (itemIds.length > 0) {
    const { data, error } = await supabase.from("supplier_waiting_sales").select("*").in("purchase_order_item_id", itemIds).order("sale_date");
    if (error) throw error;
    waitingRows = (data ?? []) as Record<string, unknown>[];
  }
  const waitingByItem = new Map<string, SupplierWaitingSale[]>();
  for (const row of waitingRows) {
    const key = String(row.purchase_order_item_id);
    const current = waitingByItem.get(key) ?? [];
    current.push({
      purchase_order_item_id: key,
      sale_id: String(row.sale_id),
      customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
      customer_name: text(row.customer_name, "Cliente não informado"),
      sale_date: String(row.sale_date ?? ""),
      quantity_requested: number(row.quantity_requested),
      quantity_reserved: number(row.quantity_reserved),
      quantity_missing: number(row.quantity_missing),
      reservation_status: text(row.reservation_status),
    });
    waitingByItem.set(key, current);
  }
  const normalizedItems: SupplierOrderItem[] = (items ?? []).map((row) => {
    const id = String(row.id);
    return {
      id,
      purchase_order_id: String(row.purchase_order_id),
      product_id: String(row.product_id),
      product_name: text(row.product_name, "Produto sem nome"),
      product_image_url: typeof row.product_image_url === "string" ? row.product_image_url : null,
      category: text(row.category, "Sem categoria"),
      brand: typeof row.brand === "string" ? row.brand : null,
      quantity_ordered: number(row.quantity_ordered),
      quantity_received: number(row.quantity_received),
      quantity_pending: number(row.quantity_pending),
      unit_cost: number(row.unit_cost),
      total_cost: number(row.total_cost),
      item_status: text(row.item_status, "pending"),
      notes: typeof row.notes === "string" ? row.notes : null,
      destination_location_id: String(row.destination_location_id),
      destination_code: text(row.destination_code),
      destination_name: text(row.destination_name),
      waiting_sales_units: number(row.waiting_sales_units),
      waiting_sales_count: number(row.waiting_sales_count),
      waiting_sales: waitingByItem.get(id) ?? [],
    };
  });
  return { ...normalizeSupplierOrderSummary(summary as Record<string, unknown>), items: normalizedItems };
}

function normalizePartnerOverview(row: Record<string, unknown>): PartnerOverview {
  return {
    id: String(row.id),
    name: text(row.name, "Parceiro sem nome"),
    partner_type: text(row.partner_type, "Parceiro"),
    city: typeof row.city === "string" ? row.city : null,
    reference: typeof row.reference === "string" ? row.reference : null,
    contact_name: typeof row.contact_name === "string" ? row.contact_name : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    status: text(row.status, "Ativo"),
    start_date: typeof row.start_date === "string" ? row.start_date : null,
    end_date: typeof row.end_date === "string" ? row.end_date : null,
    partnership_model: typeof row.partnership_model === "string" ? row.partnership_model : null,
    settlement_rule: typeof row.settlement_rule === "string" ? row.settlement_rule : null,
    commission_pct: number(row.commission_pct),
    active: Boolean(row.active),
    can_hold_stock: Boolean(row.can_hold_stock),
    can_pickup: Boolean(row.can_pickup),
    can_sell: Boolean(row.can_sell),
    can_deliver: Boolean(row.can_deliver),
    notes: typeof row.notes === "string" ? row.notes : null,
    linked_location_id: typeof row.linked_location_id === "string" ? row.linked_location_id : null,
    linked_location_code: typeof row.linked_location_code === "string" ? row.linked_location_code : null,
    linked_location_name: typeof row.linked_location_name === "string" ? row.linked_location_name : null,
    reward_type: text(row.reward_type, "manual"),
    target_sales: row.target_sales === null || row.target_sales === undefined ? null : number(row.target_sales),
    reward_value: number(row.reward_value),
    reward_description: typeof row.reward_description === "string" ? row.reward_description : null,
    settlement_frequency: text(row.settlement_frequency, "manual"),
    settlement_day: row.settlement_day === null || row.settlement_day === undefined ? null : number(row.settlement_day),
    coupon_code: typeof row.coupon_code === "string" ? row.coupon_code : null,
    counts_only_delivered: Boolean(row.counts_only_delivered),
    updated_at: String(row.updated_at ?? ""),
    all_time_sales_count: number(row.all_time_sales_count),
    all_time_revenue: number(row.all_time_revenue),
    all_time_profit: number(row.all_time_profit),
    last_sale_on: typeof row.last_sale_on === "string" ? row.last_sale_on : null,
    cycle_start: String(row.cycle_start ?? ""),
    current_cycle_sales_count: number(row.current_cycle_sales_count),
    current_cycle_revenue: number(row.current_cycle_revenue),
    current_cycle_profit: number(row.current_cycle_profit),
    reward_units_due: number(row.reward_units_due),
    progress_sales: number(row.progress_sales),
    progress_pct: number(row.progress_pct),
    estimated_reward_amount: number(row.estimated_reward_amount),
    last_settlement_on: typeof row.last_settlement_on === "string" ? row.last_settlement_on : null,
    last_settlement_period_end: typeof row.last_settlement_period_end === "string" ? row.last_settlement_period_end : null,
    linked_location_units: number(row.linked_location_units),
    settlement_pending: Boolean(row.settlement_pending),
  };
}

function normalizePartnerSale(row: Record<string, unknown>): PartnerSale {
  return {
    id: String(row.id),
    partner_id: String(row.partner_id),
    partner_name: text(row.partner_name, "Parceiro"),
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: text(row.customer_name, "Cliente não informado"),
    sale_date: String(row.sale_date ?? ""),
    quoted_at: String(row.quoted_at ?? ""),
    delivered_at: typeof row.delivered_at === "string" ? row.delivered_at : null,
    payment_status: text(row.payment_status),
    delivery_status: text(row.delivery_status),
    general_status: text(row.general_status),
    total_amount: number(row.total_amount),
    total_profit: number(row.total_profit),
    location_code: text(row.location_code),
    location_name: text(row.location_name),
    product_summary: typeof row.product_summary === "string" ? row.product_summary : null,
    total_items: number(row.total_items),
  };
}

function normalizePartnerSettlement(row: Record<string, unknown>): PartnerSettlement {
  return {
    id: String(row.id),
    partner_id: String(row.partner_id),
    settled_on: String(row.settled_on ?? ""),
    period_start: String(row.period_start ?? ""),
    period_end: String(row.period_end ?? ""),
    sale_count: number(row.sale_count),
    gross_sales: number(row.gross_sales),
    gross_profit: number(row.gross_profit),
    reward_units: number(row.reward_units),
    reward_amount: number(row.reward_amount),
    reward_description: typeof row.reward_description === "string" ? row.reward_description : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: String(row.created_at ?? ""),
  };
}

function normalizeUnassignedPartnershipSale(row: Record<string, unknown>): UnassignedPartnershipSale {
  return {
    id: String(row.id),
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: text(row.customer_name, "Cliente não informado"),
    sale_date: String(row.sale_date ?? ""),
    total_amount: number(row.total_amount),
    delivery_status: text(row.delivery_status),
    payment_status: text(row.payment_status),
    location_id: String(row.location_id ?? ""),
    location_code: text(row.location_code),
    location_name: text(row.location_name),
    product_summary: typeof row.product_summary === "string" ? row.product_summary : null,
    total_items: number(row.total_items),
    suggested_partner_id: typeof row.suggested_partner_id === "string" ? row.suggested_partner_id : null,
    suggested_partner_name: typeof row.suggested_partner_name === "string" ? row.suggested_partner_name : null,
  };
}

export async function getPartnersOverview(): Promise<PartnerOverview[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("partner_management_overview").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map((row) => normalizePartnerOverview(row as Record<string, unknown>));
}

export async function getPartnerDetails(partnerId: string): Promise<PartnerDetails | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const [overviewResult, salesResult, settlementsResult, unassignedResult] = await Promise.all([
    supabase.from("partner_management_overview").select("*").eq("id", partnerId).maybeSingle(),
    supabase.from("partner_sales_history").select("*").eq("partner_id", partnerId).order("sale_date", { ascending: false }).limit(300),
    supabase.from("partnership_settlements").select("*").eq("partner_id", partnerId).order("period_end", { ascending: false }),
    supabase.from("unassigned_partnership_sales").select("*").or(`suggested_partner_id.eq.${partnerId},suggested_partner_id.is.null`).order("sale_date", { ascending: false }).limit(100),
  ]);
  if (overviewResult.error) throw overviewResult.error;
  if (salesResult.error) throw salesResult.error;
  if (settlementsResult.error) throw settlementsResult.error;
  if (unassignedResult.error) throw unassignedResult.error;
  if (!overviewResult.data) return null;
  return {
    overview: normalizePartnerOverview(overviewResult.data as Record<string, unknown>),
    sales: (salesResult.data ?? []).map((row) => normalizePartnerSale(row as Record<string, unknown>)),
    settlements: (settlementsResult.data ?? []).map((row) => normalizePartnerSettlement(row as Record<string, unknown>)),
    unassignedSales: (unassignedResult.data ?? []).map((row) => normalizeUnassignedPartnershipSale(row as Record<string, unknown>)),
  };
}

export async function getUnassignedPartnershipSales(): Promise<UnassignedPartnershipSale[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("unassigned_partnership_sales").select("*").order("sale_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeUnassignedPartnershipSale(row as Record<string, unknown>));
}


export const getCurrentUserAccess = cache(async (): Promise<UserAccess> => {
  if (!isSupabaseConfigured) return getFallbackUserAccess("igorcandinho2002@hotmail.com");
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email ?? null;
  const { data, error } = await supabase.rpc("get_my_access");
  if (error) return getFallbackUserAccess(email);
  const row = Array.isArray(data) ? data[0] : data;
  return normalizeUserAccess((row ?? null) as Record<string, unknown> | null, email);
});

export async function getUserPermissions(): Promise<UserPermissionRow[]> {
  if (!isSupabaseConfigured) {
    return [
      { id: "demo-admin", email: "igorcandinho2002@hotmail.com", full_name: "Igor Candinho", role: "admin", active: true, can_access_supplements: true, can_access_fitness: true, can_access_bank: true, can_manage_users: true, last_sign_in_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "demo-fitness", email: "giuliafaria1@gmail.com", full_name: "Giulia", role: "operator", active: true, can_access_supplements: false, can_access_fitness: true, can_access_bank: false, can_manage_users: false, last_sign_in_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_user_permissions");
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    email: String(row.email ?? ""),
    full_name: String(row.full_name ?? "Usuário"),
    role: (["admin", "operator", "partner"].includes(String(row.role)) ? String(row.role) : "partner") as UserPermissionRow["role"],
    active: Boolean(row.active),
    can_access_supplements: Boolean(row.can_access_supplements),
    can_access_fitness: Boolean(row.can_access_fitness),
    can_access_bank: Boolean(row.can_access_bank),
    can_manage_users: Boolean(row.can_manage_users),
    last_sign_in_at: typeof row.last_sign_in_at === "string" ? row.last_sign_in_at : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  }));
}

function normalizeFitnessStock(row: Record<string, unknown>): FitnessStockRow {
  return {
    variant_id: String(row.variant_id),
    product_id: String(row.product_id),
    product_name: text(row.product_name, "Produto sem nome"),
    category: text(row.category, "Vestuário"),
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    product_active: Boolean(row.product_active),
    size: text(row.size, "Único"),
    color: text(row.color, "Sem cor"),
    sku: typeof row.sku === "string" ? row.sku : null,
    cost_price: number(row.cost_price),
    sale_price: number(row.sale_price),
    variant_active: Boolean(row.variant_active),
    physical_quantity: number(row.physical_quantity),
    reserved_quantity: number(row.reserved_quantity),
    available_quantity: number(row.available_quantity),
    incoming_quantity: number(row.incoming_quantity),
    stock_cost_value: number(row.stock_cost_value),
    stock_sale_value: number(row.stock_sale_value),
    stock_status: text(row.stock_status, "out_of_stock"),
    minimum_stock: number(row.minimum_stock),
    reorder_target: number(row.reorder_target),
    default_supplier_id: typeof row.default_supplier_id === "string" ? row.default_supplier_id : null,
    default_supplier_name: typeof row.default_supplier_name === "string" ? row.default_supplier_name : null,
    quantity_below_minimum: number(row.quantity_below_minimum),
    suggested_reorder_quantity: number(row.suggested_reorder_quantity),
    operational_status: text(row.operational_status, "out_of_stock"),
  };
}

function normalizeFitnessProduct(row: Record<string, unknown>): FitnessProductRow {
  return {
    id: String(row.id),
    name: text(row.name, "Produto sem nome"),
    category: text(row.category, "Vestuário"),
    description: typeof row.description === "string" ? row.description : null,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    active: Boolean(row.active),
    variant_count: number(row.variant_count),
    physical_quantity: number(row.physical_quantity),
    reserved_quantity: number(row.reserved_quantity),
    available_quantity: number(row.available_quantity),
    incoming_quantity: number(row.incoming_quantity),
    min_sale_price: number(row.min_sale_price),
    max_sale_price: number(row.max_sale_price),
    attention_variants: number(row.attention_variants),
    updated_at: String(row.updated_at ?? ""),
  };
}

function normalizeFitnessSale(row: Record<string, unknown>): FitnessSaleRow {
  return {
    id: String(row.id),
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: text(row.customer_name, "Cliente não informado"),
    customer_phone: typeof row.customer_phone === "string" ? row.customer_phone : null,
    city: typeof row.city === "string" ? row.city : null,
    quoted_on: String(row.quoted_on ?? ""),
    general_status: text(row.general_status, "active"),
    payment_status: text(row.payment_status, "receivable"),
    delivery_status: text(row.delivery_status, "to_deliver"),
    payment_method: typeof row.payment_method === "string" ? row.payment_method : null,
    payment_due_on: typeof row.payment_due_on === "string" ? row.payment_due_on : null,
    paid_on: typeof row.paid_on === "string" ? row.paid_on : null,
    delivered_on: typeof row.delivered_on === "string" ? row.delivered_on : null,
    total_cost: number(row.total_cost),
    total_amount: number(row.total_amount),
    total_profit: number(row.total_profit),
    notes: typeof row.notes === "string" ? row.notes : null,
    responsible: typeof row.responsible === "string" ? row.responsible : null,
    status_label: text(row.status_label, "Pedido Feito"),
    created_at: String(row.created_at ?? ""),
    product_summary: text(row.product_summary),
    total_items: number(row.total_items),
    reservation_status: text(row.reservation_status, "none"),
  };
}

function normalizeFitnessPurchaseOrder(row: Record<string, unknown>): FitnessPurchaseOrderSummary {
  return {
    id: String(row.id),
    supplier_id: String(row.supplier_id),
    supplier_name: text(row.supplier_name, "Fornecedor"),
    ordered_on: String(row.ordered_on ?? ""),
    status: text(row.status, "pending"),
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    item_count: number(row.item_count),
    ordered_units: number(row.ordered_units),
    received_units: number(row.received_units),
    pending_units: number(row.pending_units),
    order_total: number(row.order_total),
    freight: number(row.freight),
    grand_total: number(row.grand_total ?? row.order_total),
    expected_on: typeof row.expected_on === "string" ? row.expected_on : null,
    received_on: typeof row.received_on === "string" ? row.received_on : null,
    responsible: typeof row.responsible === "string" ? row.responsible : null,
    supplier_contact: typeof row.supplier_contact === "string" ? row.supplier_contact : null,
    supplier_phone: typeof row.supplier_phone === "string" ? row.supplier_phone : null,
    supplier_email: typeof row.supplier_email === "string" ? row.supplier_email : null,
    product_summary: text(row.product_summary),
  };
}

export async function getFitnessDashboard(): Promise<FitnessDashboardSummary> {
  const empty = { month_sales:0,month_revenue:0,month_profit:0,pending_delivery:0,pending_payment:0,receivable_total:0,variants_with_stock:0,physical_units:0,reserved_units:0,available_units:0,incoming_units:0,stock_cost_value:0,stock_sale_value:0,attention_variants:0,open_orders:0,active_customers:0,low_stock_variants:0,out_of_stock_variants:0 };
  if (!isSupabaseConfigured) return empty;
  const supabase = await createClient();
  const { data, error } = await supabase.from("fitness_dashboard_summary_v2").select("*").single();
  if (error) throw error;
  return {
    month_sales:number(data.month_sales),month_revenue:number(data.month_revenue),month_profit:number(data.month_profit),pending_delivery:number(data.pending_delivery),pending_payment:number(data.pending_payment),receivable_total:number(data.receivable_total),variants_with_stock:number(data.variants_with_stock),physical_units:number(data.physical_units),reserved_units:number(data.reserved_units),available_units:number(data.available_units),incoming_units:number(data.incoming_units),stock_cost_value:number(data.stock_cost_value),stock_sale_value:number(data.stock_sale_value),attention_variants:number(data.attention_variants),open_orders:number(data.open_orders),active_customers:number(data.active_customers),low_stock_variants:number(data.low_stock_variants),out_of_stock_variants:number(data.out_of_stock_variants),
  };
}

export async function getFitnessStock(): Promise<FitnessStockRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("fitness_stock_operational").select("*").order("product_name").order("size").order("color");
  if (error) throw error;
  return (data ?? []).map((row) => normalizeFitnessStock(row as Record<string, unknown>));
}

export async function getFitnessProducts(): Promise<FitnessProductRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("fitness_product_catalog_v2").select("*").order("active", { ascending:false }).order("name");
  if (error) throw error;
  return (data ?? []).map((row) => normalizeFitnessProduct(row as Record<string, unknown>));
}

export async function getFitnessProduct(productId: string): Promise<{ product: FitnessProductRow; variants: FitnessStockRow[] } | null> {
  const [products, stock] = await Promise.all([getFitnessProducts(), getFitnessStock()]);
  const product = products.find((row) => row.id === productId);
  if (!product) return null;
  return { product, variants: stock.filter((row) => row.product_id === productId) };
}

export async function getFitnessCustomers(): Promise<FitnessCustomerRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("fitness_customer_overview").select("*").order("active", { ascending:false }).order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id:String(row.id),name:text(row.name,"Cliente"),phone:typeof row.phone==="string"?row.phone:null,instagram:typeof row.instagram==="string"?row.instagram:null,
    city:typeof row.city==="string"?row.city:null,source:typeof row.source==="string"?row.source:null,notes:typeof row.notes==="string"?row.notes:null,
    active:Boolean(row.active),created_at:String(row.created_at??""),updated_at:String(row.updated_at??""),total_purchases:number(row.total_purchases),
    total_spent:number(row.total_spent),last_purchase_on:typeof row.last_purchase_on==="string"?row.last_purchase_on:null,
    days_without_purchase:row.days_without_purchase===null||row.days_without_purchase===undefined?null:number(row.days_without_purchase),classification:text(row.classification,"Bronze"),
  }));
}

export async function getFitnessCustomer(customerId: string): Promise<FitnessCustomerRow | null> {
  return (await getFitnessCustomers()).find((row)=>row.id===customerId) ?? null;
}

export async function getFitnessSuppliers(): Promise<FitnessSupplierRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("fitness_supplier_overview").select("*").order("active",{ascending:false}).order("name");
  if (error) throw error;
  return (data ?? []).map((row)=>({
    id:String(row.id),name:text(row.name,"Fornecedor"),contact_name:typeof row.contact_name==="string"?row.contact_name:null,phone:typeof row.phone==="string"?row.phone:null,
    email:typeof row.email==="string"?row.email:null,website:typeof row.website==="string"?row.website:null,image_url:typeof row.image_url==="string"?row.image_url:null,
    notes:typeof row.notes==="string"?row.notes:null,active:Boolean(row.active),created_at:String(row.created_at??""),updated_at:String(row.updated_at??""),
    order_count:number(row.order_count),open_orders:number(row.open_orders),last_order_on:typeof row.last_order_on==="string"?row.last_order_on:null,incoming_units:number(row.incoming_units),
  }));
}

export async function getFitnessSupplier(supplierId: string): Promise<FitnessSupplierRow | null> {
  return (await getFitnessSuppliers()).find((row)=>row.id===supplierId) ?? null;
}

export async function getFitnessSales(): Promise<FitnessSaleRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("fitness_sales_operational").select("*").order("quoted_on", { ascending:false }).order("created_at", { ascending:false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeFitnessSale(row as Record<string, unknown>));
}
export async function getFitnessDashboardPendingSales(limit = 8): Promise<FitnessSaleRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fitness_sales_operational")
    .select("*")
    .neq("general_status", "cancelled")
    .or("payment_status.neq.received,delivery_status.neq.delivered")
    .order("quoted_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => normalizeFitnessSale(row as Record<string, unknown>));
}


export async function getFitnessSaleDetails(saleId: string): Promise<FitnessSaleDetails | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const [saleResult, itemsResult] = await Promise.all([
    supabase.from("fitness_sales_operational").select("*").eq("id",saleId).maybeSingle(),
    supabase.from("fitness_sale_items").select("id,variant_id,quantity,unit_cost,unit_price,fitness_variants!inner(id,product_id,size,color,sku,fitness_products!inner(id,name,image_url)),fitness_stock_reservations(status,quantity_reserved)").eq("sale_id",saleId),
  ]);
  if (saleResult.error) throw saleResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (!saleResult.data) return null;
  const items: FitnessSaleItem[] = (itemsResult.data ?? []).map((row: Record<string, unknown>) => {
    const variant = row.fitness_variants as Record<string, unknown>;
    const product = variant.fitness_products as Record<string, unknown>;
    const reservations = Array.isArray(row.fitness_stock_reservations) ? row.fitness_stock_reservations as Record<string, unknown>[] : [];
    const reservation = reservations[0];
    return { id:String(row.id),variant_id:String(row.variant_id),product_id:String(variant.product_id),product_name:text(product.name),image_url:typeof product.image_url==="string"?product.image_url:null,size:text(variant.size),color:text(variant.color),sku:typeof variant.sku==="string"?variant.sku:null,quantity:number(row.quantity),unit_cost:number(row.unit_cost),unit_price:number(row.unit_price),reservation_status:reservation?text(reservation.status):null,quantity_reserved:reservation?number(reservation.quantity_reserved):0 };
  });
  return { ...normalizeFitnessSale(saleResult.data as Record<string, unknown>), items };
}

export async function getFitnessPurchaseOrders(): Promise<FitnessPurchaseOrderSummary[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("fitness_purchase_order_operational").select("*").order("ordered_on", { ascending:false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeFitnessPurchaseOrder(row as Record<string, unknown>));
}
export async function getFitnessDashboardRecentOrders(limit = 5): Promise<FitnessPurchaseOrderSummary[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fitness_purchase_order_operational")
    .select("*")
    .order("ordered_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => normalizeFitnessPurchaseOrder(row as Record<string, unknown>));
}


export async function getFitnessPurchaseOrderDetails(orderId: string): Promise<FitnessPurchaseOrderDetails | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const [summaryResult, itemsResult] = await Promise.all([
    supabase.from("fitness_purchase_order_operational").select("*").eq("id",orderId).maybeSingle(),
    supabase.from("fitness_purchase_order_items_overview").select("*").eq("purchase_order_id",orderId).order("product_name"),
  ]);
  if (summaryResult.error) throw summaryResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (!summaryResult.data) return null;
  const items: FitnessPurchaseOrderItem[] = (itemsResult.data ?? []).map((row) => ({ id:String(row.id),purchase_order_id:String(row.purchase_order_id),variant_id:String(row.variant_id),product_id:String(row.product_id),product_name:text(row.product_name),image_url:typeof row.image_url==="string"?row.image_url:null,size:text(row.size),color:text(row.color),sku:typeof row.sku==="string"?row.sku:null,quantity_ordered:number(row.quantity_ordered),quantity_received:number(row.quantity_received),quantity_pending:number(row.quantity_pending),unit_cost:number(row.unit_cost),total_cost:number(row.total_cost),notes:typeof row.notes==="string"?row.notes:null,item_status:text(row.item_status) }));
  return { ...normalizeFitnessPurchaseOrder(summaryResult.data as Record<string, unknown>), items };
}

export async function getFitnessMovements(): Promise<FitnessInventoryMovementRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data,error }=await supabase.from("fitness_inventory_movement_overview").select("*").order("created_at",{ascending:false}).limit(500);
  if(error)throw error;
  return (data??[]).map((row)=>({
    id:String(row.id),variant_id:String(row.variant_id),movement_type:text(row.movement_type),movement_label:text(row.movement_label),
    quantity_delta:number(row.quantity_delta),sale_id:typeof row.sale_id==="string"?row.sale_id:null,purchase_order_item_id:typeof row.purchase_order_item_id==="string"?row.purchase_order_item_id:null,
    transfer_group_id:typeof row.transfer_group_id==="string"?row.transfer_group_id:null,notes:typeof row.notes==="string"?row.notes:null,created_at:String(row.created_at??""),
    product_id:String(row.product_id),product_name:text(row.product_name),image_url:typeof row.image_url==="string"?row.image_url:null,size:text(row.size),color:text(row.color),sku:typeof row.sku==="string"?row.sku:null,
  }));
}

export async function getTestLabDashboard(operation: TestLabOperation): Promise<TestLabDashboardSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("test_lab_dashboard_summary").select("*").eq("operation", operation).single();
  if (error) throw error;
  return {
    operation,
    product_count: number(data.product_count),
    physical_units: number(data.physical_units),
    reserved_units: number(data.reserved_units),
    available_units: number(data.available_units),
    incoming_units: number(data.incoming_units),
    sales_count: number(data.sales_count),
    pending_payment_count: number(data.pending_payment_count),
    pending_delivery_count: number(data.pending_delivery_count),
    revenue: number(data.revenue),
    profit: number(data.profit),
    open_orders: number(data.open_orders),
  };
}

export async function getTestLabStock(operation: TestLabOperation): Promise<TestLabStockRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("test_lab_stock_overview").select("*").eq("operation", operation).order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    product_id: String(row.product_id), operation, name: text(row.name), category: typeof row.category === "string" ? row.category : null,
    variant_label: typeof row.variant_label === "string" ? row.variant_label : null, cost_price: number(row.cost_price), sale_price: number(row.sale_price),
    active: Boolean(row.active), physical_quantity: number(row.physical_quantity), reserved_quantity: number(row.reserved_quantity),
    available_quantity: number(row.available_quantity), incoming_quantity: number(row.incoming_quantity),
  }));
}

export async function getTestLabCustomers(operation: TestLabOperation): Promise<TestLabCustomer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("test_lab_customers").select("id,operation,name,phone").eq("operation", operation).order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), operation, name: text(row.name), phone: typeof row.phone === "string" ? row.phone : null }));
}

export async function getTestLabSuppliers(operation: TestLabOperation): Promise<TestLabSupplier[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("test_lab_suppliers").select("id,operation,name").eq("operation", operation).order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), operation, name: text(row.name) }));
}

function normalizeTestLabSale(row: Record<string, unknown>): TestLabSaleRow {
  return {
    id: String(row.id), operation: String(row.operation) as TestLabOperation, customer_id: String(row.customer_id), customer_name: text(row.customer_name),
    quoted_on: String(row.quoted_on ?? ""), general_status: text(row.general_status), payment_status: text(row.payment_status), delivery_status: text(row.delivery_status),
    total_cost: number(row.total_cost), total_amount: number(row.total_amount), total_profit: number(row.total_profit), notes: typeof row.notes === "string" ? row.notes : null,
    created_at: String(row.created_at ?? ""), updated_at: String(row.updated_at ?? ""), product_summary: text(row.product_summary, ""), total_items: number(row.total_items),
    reservation_status: typeof row.reservation_status === "string" ? row.reservation_status : null,
  };
}

export async function getTestLabSales(operation: TestLabOperation): Promise<TestLabSaleRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("test_lab_sales_overview").select("*").eq("operation", operation).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeTestLabSale(row as Record<string, unknown>));
}

export async function getTestLabSaleDetails(saleId: string): Promise<TestLabSaleDetails | null> {
  const supabase = await createClient();
  const [saleResult, itemsResult] = await Promise.all([
    supabase.from("test_lab_sales_overview").select("*").eq("id", saleId).maybeSingle(),
    supabase.from("test_lab_sale_items").select("id,product_id,quantity,unit_cost,unit_price,test_lab_products!inner(name,variant_label),test_lab_reservations(status,quantity_reserved)").eq("sale_id", saleId),
  ]);
  if (saleResult.error) throw saleResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (!saleResult.data) return null;
  const items: TestLabSaleItem[] = (itemsResult.data ?? []).map((row: Record<string, unknown>) => {
    const product = row.test_lab_products as Record<string, unknown>;
    const reservations = Array.isArray(row.test_lab_reservations) ? row.test_lab_reservations as Record<string, unknown>[] : [];
    const reservation = reservations[0];
    return {
      id: String(row.id), product_id: String(row.product_id), product_name: text(product.name), variant_label: typeof product.variant_label === "string" ? product.variant_label : null,
      quantity: number(row.quantity), unit_cost: number(row.unit_cost), unit_price: number(row.unit_price), reservation_status: reservation ? text(reservation.status) : null,
      quantity_reserved: reservation ? number(reservation.quantity_reserved) : 0,
    };
  });
  return { ...normalizeTestLabSale(saleResult.data as Record<string, unknown>), items };
}

function normalizeTestLabPurchaseOrder(row: Record<string, unknown>): TestLabPurchaseOrderRow {
  return {
    id: String(row.id), operation: String(row.operation) as TestLabOperation, supplier_id: String(row.supplier_id), supplier_name: text(row.supplier_name),
    ordered_on: String(row.ordered_on ?? ""), status: text(row.status), item_count: number(row.item_count), ordered_units: number(row.ordered_units),
    received_units: number(row.received_units), pending_units: number(row.pending_units), order_total: number(row.order_total), product_summary: text(row.product_summary, ""),
  };
}

export async function getTestLabPurchaseOrders(operation: TestLabOperation): Promise<TestLabPurchaseOrderRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("test_lab_purchase_orders_overview").select("*").eq("operation", operation).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeTestLabPurchaseOrder(row as Record<string, unknown>));
}

export async function getTestLabPurchaseOrderDetails(orderId: string): Promise<TestLabPurchaseOrderDetails | null> {
  const supabase = await createClient();
  const [orderResult, itemsResult] = await Promise.all([
    supabase.from("test_lab_purchase_orders_overview").select("*").eq("id", orderId).maybeSingle(),
    supabase.from("test_lab_purchase_order_items").select("id,purchase_order_id,product_id,quantity_ordered,quantity_received,unit_cost,test_lab_products!inner(name)").eq("purchase_order_id", orderId),
  ]);
  if (orderResult.error) throw orderResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (!orderResult.data) return null;
  const items: TestLabPurchaseOrderItem[] = (itemsResult.data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id), purchase_order_id: String(row.purchase_order_id), product_id: String(row.product_id),
    product_name: text((row.test_lab_products as Record<string, unknown>).name), quantity_ordered: number(row.quantity_ordered),
    quantity_received: number(row.quantity_received), quantity_pending: number(row.quantity_ordered) - number(row.quantity_received), unit_cost: number(row.unit_cost),
  }));
  return { ...normalizeTestLabPurchaseOrder(orderResult.data as Record<string, unknown>), items };
}
