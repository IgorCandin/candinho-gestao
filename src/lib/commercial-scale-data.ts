import { createClient } from "@/lib/supabase/server";
import type { LeadRow, SaleRow } from "@/lib/types";

const number = (value: unknown) => Number(value ?? 0);
const text = (value: unknown, fallback = "—") =>
  typeof value === "string" && value.trim() ? value : fallback;

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
    id: String(row.id),
    item_id: null,
    item_quantity: 1,
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: text(row.customer_name, "Cliente não informado"),
    location_id: String(row.location_id ?? ""),
    location_code: text(row.location_code),
    location_name: text(row.location_name),
    lead_at: String(row.lead_at ?? ""),
    lead_date: String(row.lead_date ?? ""),
    lead_month: String(row.lead_month ?? ""),
    lead_status: typeof row.lead_status === "string" ? row.lead_status : null,
    general_status: text(row.general_status, "pending"),
    reference: typeof row.reference === "string" ? row.reference : null,
    city: typeof row.city === "string" ? row.city : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    product_summary: typeof row.product_summary === "string" ? row.product_summary : null,
    total_items: number(row.total_items),
    primary_product_id: typeof row.primary_product_id === "string" ? row.primary_product_id : null,
    primary_image_url: typeof row.primary_image_url === "string" ? row.primary_image_url : null,
  };
}

function oneRelation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return (value[0] as Record<string, unknown> | undefined) ?? null;
  }
  return value && typeof value === "object"
    ? value as Record<string, unknown>
    : null;
}

export type PagedResult<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function cleanPage(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function cleanPageSize(value: number) {
  const size = Number.isFinite(value) ? Math.floor(value) : 30;
  return Math.min(Math.max(size, 10), 100);
}

function safeSearch(value: string) {
  return value.replace(/[%(),]/g, " ").trim();
}

export async function getSalesPage({
  page = 1,
  pageSize = 30,
  search = "",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResult<SaleRow>> {
  const supabase = await createClient();
  const currentPage = cleanPage(page);
  const size = cleanPageSize(pageSize);
  const from = (currentPage - 1) * size;
  const to = from + size - 1;
  const q = safeSearch(search);

  let query = supabase
    .from("sales_history")
    .select("*", { count: "exact" });

  if (q) {
    query = query.or(
      `customer_name.ilike.%${q}%,product_summary.ilike.%${q}%,location_name.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query
    .order("business_date", { ascending: false })
    .order("quoted_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const total = count ?? 0;
  return {
    rows: (data ?? []).map((row) => normalizeSale(row as Record<string, unknown>)),
    page: currentPage,
    pageSize: size,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
  };
}

export async function getLeadsPage({
  page = 1,
  pageSize = 30,
  search = "",
  month = "",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  month?: string;
}): Promise<PagedResult<LeadRow> & { availableMonths: string[] }> {
  const supabase = await createClient();
  const currentPage = cleanPage(page);
  const size = cleanPageSize(pageSize);
  const from = (currentPage - 1) * size;
  const to = from + size - 1;
  const q = safeSearch(search);
  const normalizedMonth = /^\d{4}-\d{2}/.test(month) ? month.slice(0, 7) : "";

  let query = supabase
    .from("leads_history")
    .select("*", { count: "exact" });

  if (q) {
    query = query.or(
      `customer_name.ilike.%${q}%,product_summary.ilike.%${q}%,city.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }

  if (normalizedMonth) {
    query = query.eq("lead_month", normalizedMonth);
  }

  const [
    { data, error, count },
    { data: monthRows, error: monthError },
  ] = await Promise.all([
    query
      .order("lead_month", { ascending: false })
      .order("lead_date", { ascending: false })
      .range(from, to),
    supabase
      .from("leads_history")
      .select("lead_month")
      .not("lead_month", "is", null)
      .order("lead_month", { ascending: false }),
  ]);

  if (error) throw error;
  if (monthError) throw monthError;

  const baseLeads = (data ?? []).map((row) =>
    normalizeLead(row as Record<string, unknown>),
  );

  let expandedLeads = baseLeads;

  if (baseLeads.length > 0) {
    const { data: itemData, error: itemError } = await supabase
      .from("sale_items")
      .select("id,sale_id,product_id,quantity,product:products(id,name,image_url)")
      .in("sale_id", baseLeads.map((lead) => lead.id));

    if (itemError) throw itemError;

    const itemsByLead = new Map<string, Record<string, unknown>[]>();

    for (const item of itemData ?? []) {
      const row = item as Record<string, unknown>;
      const saleId = String(row.sale_id ?? "");
      if (!saleId) continue;
      const list = itemsByLead.get(saleId) ?? [];
      list.push(row);
      itemsByLead.set(saleId, list);
    }

    expandedLeads = baseLeads.flatMap((lead) => {
      const items = itemsByLead.get(lead.id) ?? [];
      if (items.length === 0) return [lead];

      return items.map((item) => {
        const product = oneRelation(item.product);
        const quantity = Math.max(number(item.quantity), 1);
        const productName = text(product?.name, "Produto");

        return {
          ...lead,
          item_id: String(item.id ?? `${lead.id}:${item.product_id ?? productName}`),
          item_quantity: quantity,
          product_summary: `${productName} ×${quantity}`,
          total_items: quantity,
          primary_product_id:
            typeof item.product_id === "string"
              ? item.product_id
              : typeof product?.id === "string"
                ? product.id
                : null,
          primary_image_url:
            typeof product?.image_url === "string"
              ? product.image_url
              : null,
        };
      });
    });
  }

  const availableMonths = [
    ...new Set(
      (monthRows ?? [])
        .map((row) => String(row.lead_month ?? "").slice(0, 7))
        .filter(Boolean),
    ),
  ];

  const total = count ?? 0;

  return {
    rows: expandedLeads,
    page: currentPage,
    pageSize: size,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
    availableMonths,
  };
}
