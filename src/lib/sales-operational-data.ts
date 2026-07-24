import { createClient } from "@/lib/supabase/server";
import type { SaleRow } from "@/lib/types";

export type SalesOperationalView = "pending" | "finalized" | "all";

export type SalesOperationalPage = {
  rows: SaleRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const number = (value: unknown) => Number(value ?? 0);
const text = (value: unknown, fallback = "—") =>
  typeof value === "string" && value.trim() ? value : fallback;

function normalizeSale(row: Record<string, unknown>): SaleRow {
  return {
    id: String(row.id),
    customer_id:
      typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: text(row.customer_name, "Cliente não informado"),
    location_id: String(row.location_id ?? ""),
    location_code: text(row.location_code),
    location_name: text(row.location_name),
    business_at: String(row.business_at ?? ""),
    business_date: String(row.business_date ?? ""),
    quoted_at: String(row.quoted_at ?? ""),
    delivered_at:
      typeof row.delivered_at === "string" ? row.delivered_at : null,
    general_status: text(row.general_status, "pending"),
    payment_status: text(row.payment_status, "not_applicable"),
    delivery_status: text(row.delivery_status, "not_applicable"),
    payment_method:
      typeof row.payment_method === "string" ? row.payment_method : null,
    payment_condition:
      typeof row.payment_condition === "string"
        ? row.payment_condition
        : null,
    total_amount: number(row.total_amount),
    total_profit: number(row.total_profit),
    notes: typeof row.notes === "string" ? row.notes : null,
    product_summary:
      typeof row.product_summary === "string"
        ? row.product_summary
        : null,
    total_items: number(row.total_items),
    paid_at: typeof row.paid_at === "string" ? row.paid_at : null,
    payment_due_at:
      typeof row.payment_due_at === "string"
        ? row.payment_due_at
        : null,
    price_condition:
      typeof row.price_condition === "string"
        ? row.price_condition
        : null,
    partner_id:
      typeof row.partner_id === "string" ? row.partner_id : null,
    partner_name:
      typeof row.partner_name === "string" ? row.partner_name : null,
    primary_product_id:
      typeof row.primary_product_id === "string"
        ? row.primary_product_id
        : null,
    primary_image_url:
      typeof row.primary_image_url === "string"
        ? row.primary_image_url
        : null,
    reservation_status:
      typeof row.reservation_status === "string"
        ? row.reservation_status
        : null,
  };
}

function safeSearch(value: string) {
  return value.replace(/[%(),]/g, " ").trim();
}

export async function getSalesOperationalPage({
  page = 1,
  pageSize = 30,
  search = "",
  view = "pending",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  view?: SalesOperationalView;
}): Promise<SalesOperationalPage> {
  const supabase = await createClient();
  const currentPage =
    Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const size = Math.min(
    Math.max(
      Number.isFinite(pageSize) ? Math.floor(pageSize) : 30,
      10,
    ),
    100,
  );
  const from = (currentPage - 1) * size;
  const to = from + size - 1;
  const q = safeSearch(search);

  let query = supabase
    .from("sales_history")
    .select("*", { count: "exact" });

  if (view === "pending") {
    query = query
      .neq("general_status", "cancelled")
      .or(
        "payment_status.neq.received,delivery_status.neq.delivered",
      );
  } else if (view === "finalized") {
    query = query.eq("general_status", "finalized");
  }

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
    rows: (data ?? []).map((row) =>
      normalizeSale(row as Record<string, unknown>),
    ),
    page: currentPage,
    pageSize: size,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
  };
}
