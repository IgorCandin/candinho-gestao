import { isSupabaseConfigured } from "./config";
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
  CustomerOption,
  DashboardData,
  LeadDetails,
  LeadRow,
  Movement,
  PanelCSData,
  PanelPeriod,
  PendingOrderRow,
  ProductCatalogRow,
  ProductDetails,
  ProductOption,
  SaleStockOption,
  LocationOption,
  PartnerOption,
  ReplenishmentRow,
  SaleDetails,
  SaleRow,
  StockRow,
  SupplierOption,
  PurchaseProductOption,
  SupplierOrderSummary,
  SupplierOrderDetails,
  SupplierOrderItem,
  SupplierWaitingSale,
} from "./types";

const number = (value: unknown) => Number(value ?? 0);
const text = (value: unknown, fallback = "—") => (typeof value === "string" && value.trim() ? value : fallback);

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
    active: Boolean(row.active),
    sale_price: number(row.sale_price),
    installment_price: number(row.installment_price),
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
    .from("product_catalog")
    .select("*")
    .order("active", { ascending: false })
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
    incoming_quantity: number(data.incoming_quantity),
    awaiting_sales_quantity: number(data.awaiting_sales_quantity),
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
    return { id: lead.id, customer_id: lead.customer_id, customer_name: lead.customer_name, lead_at: lead.lead_at, lead_status: lead.lead_status, general_status: lead.general_status, reference: lead.reference, city: lead.city, phone: lead.phone, notes: lead.notes, product_id: lead.primary_product_id, product_name: lead.product_summary, product_image_url: lead.primary_image_url, category: null, brand: null };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("sales").select(`id,customer_id,lead_status,general_status,quoted_at,reference,city,phone,notes,customer:customers(id,name,city,phone,reference),items:sale_items(id,product_id,product:products(id,name,image_url,category,brand))`).eq("id", leadId).eq("record_type", "lead").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>; const customer = oneRelation(row.customer); const itemRows = Array.isArray(row.items) ? row.items as Record<string, unknown>[] : []; const firstItem = itemRows[0] ?? null; const product = firstItem ? oneRelation(firstItem.product) : null;
  return { id: String(row.id), customer_id: typeof row.customer_id === "string" ? row.customer_id : null, customer_name: text(customer?.name, "Cliente não informado"), lead_at: String(row.quoted_at ?? ""), lead_status: typeof row.lead_status === "string" ? row.lead_status : null, general_status: text(row.general_status, "pending"), reference: typeof row.reference === "string" ? row.reference : typeof customer?.reference === "string" ? customer.reference : null, city: typeof row.city === "string" ? row.city : typeof customer?.city === "string" ? customer.city : null, phone: typeof row.phone === "string" ? row.phone : typeof customer?.phone === "string" ? customer.phone : null, notes: typeof row.notes === "string" ? row.notes : null, product_id: firstItem && typeof firstItem.product_id === "string" ? firstItem.product_id : null, product_name: typeof product?.name === "string" ? product.name : null, product_image_url: typeof product?.image_url === "string" ? product.image_url : null, category: typeof product?.category === "string" ? product.category : null, brand: typeof product?.brand === "string" ? product.brand : null };
}

export async function getCustomers(): Promise<Customer[]> {
  if (!isSupabaseConfigured) return demoCustomers;
  const supabase = await createClient();
  const { data, error } = await supabase.from("customer_details").select("id,name,city,phone,total_spent,purchase_count,last_purchase_at,lead_count,pending_sales_count").order("last_purchase_at", { ascending: false, nullsFirst: false }).order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), name: text(row.name, "Cliente sem nome"), city: typeof row.city === "string" ? row.city : null, phone: typeof row.phone === "string" ? row.phone : null, total_spent: number(row.total_spent), purchase_count: number(row.purchase_count), last_purchase_at: typeof row.last_purchase_at === "string" ? row.last_purchase_at : null, lead_count: number(row.lead_count), pending_sales_count: number(row.pending_sales_count) }));
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
  if (!isSupabaseConfigured) { const customer = demoCustomers.find((row) => row.id === customerId); if (!customer) return null; return { ...customer, reference: null, email: null, notes: null, sensitive_to_caffeine: false, anxiety_or_insomnia: false, prohibited_products: null, approach_preferences: null, active: true }; }
  const supabase = await createClient(); const { data, error } = await supabase.from("customer_details").select("*").eq("id", customerId).maybeSingle(); if (error) throw error; if (!data) return null;
  return { id: String(data.id), name: text(data.name, "Cliente sem nome"), city: typeof data.city === "string" ? data.city : null, phone: typeof data.phone === "string" ? data.phone : null, reference: typeof data.reference === "string" ? data.reference : null, email: typeof data.email === "string" ? data.email : null, notes: typeof data.notes === "string" ? data.notes : null, sensitive_to_caffeine: Boolean(data.sensitive_to_caffeine), anxiety_or_insomnia: Boolean(data.anxiety_or_insomnia), prohibited_products: typeof data.prohibited_products === "string" ? data.prohibited_products : null, approach_preferences: typeof data.approach_preferences === "string" ? data.approach_preferences : null, active: Boolean(data.active), total_spent: number(data.total_spent), purchase_count: number(data.purchase_count), last_purchase_at: typeof data.last_purchase_at === "string" ? data.last_purchase_at : null, lead_count: number(data.lead_count), pending_sales_count: number(data.pending_sales_count) };
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
  const { data, error } = await supabase
    .from("sales")
    .select(`
      id,customer_id,location_id,reference,city,phone,general_status,payment_status,delivery_status,
      payment_method,payment_condition,payment_due_at,price_condition,partner_id,quoted_at,paid_at,delivered_at,total_amount,total_cost,total_profit,notes,
      customer:customers(id,name,city,phone),
      location:locations(id,code,name),
      partner:partners(id,name),
      items:sale_items(id,product_id,quantity,unit_cost,unit_price,price_condition,product:products(id,name,image_url,category,brand),reservations:stock_reservations(quantity_requested,quantity_reserved,status))
    `)
    .eq("id", saleId)
    .eq("record_type", "sale")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const customer = oneRelation(row.customer);
  const location = oneRelation(row.location);
  const partner = oneRelation(row.partner);
  const itemRows = Array.isArray(row.items) ? row.items as Record<string, unknown>[] : [];

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
    notes: typeof row.notes === "string" ? row.notes : null,
    items: itemRows.map((item) => {
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
    }),
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

  return {
    period,
    periodLabel: period === "current" ? "Mês atual" : period === "previous" ? "Mês anterior" : "Visão geral",
    grossRevenue,
    profit,
    saleCount,
    receivable: summary.receivable_total,
    pendingOrdersCount: pendingOrders.length,
    averageTicket: saleCount > 0 ? grossRevenue / saleCount : 0,
    sales,
  };
}

export async function getDashboard(): Promise<DashboardData> {
  const [products, summary, pendingOrders, recentSales, lowStock] = await Promise.all([
    getProductCatalog(),
    getCommercialDashboardSummary(),
    getPendingOrders(),
    getSalesHistory(30),
    getReplenishment(),
  ]);

  return {
    totalProducts: products.filter((product) => product.active).length,
    totalUnits: summary.operational_units,
    stockCostValue: summary.stock_cost_value,
    stockSaleValue: summary.stock_sale_value,
    receivable: summary.receivable_total,
    pendingOrdersCount: pendingOrders.length,
    pendingDeliveryCount: pendingOrders.filter((sale) => sale.delivery_status === "to_deliver").length,
    pendingPaymentCount: pendingOrders.filter((sale) => sale.payment_status === "receivable").length,
    pendingOrdersValue: pendingOrders.reduce((sum, sale) => sum + sale.total_amount, 0),
    currentMonthRevenue: summary.current_month_revenue,
    currentMonthSalesCount: summary.current_month_sales,
    recentSales: recentSales.filter(isCommercialSale).slice(0, 8),
    lowStock: lowStock.slice(0, 8),
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
