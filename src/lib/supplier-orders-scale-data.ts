import { createClient } from "@/lib/supabase/server";
import type { SupplierOrderSummary } from "@/lib/types";

export type SupplierOrdersScaleSnapshot = {
  orders: SupplierOrderSummary[];
  tab: "pending" | "history";
  sort: "date" | "supplier" | "pending";
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pendingCount: number;
  historyCount: number;
  receivedCount: number;
  pendingUnits: number;
  pendingValue: number;
  waitingSales: number;
};

function n(value: unknown) {
  return Number(value ?? 0);
}

function normalize(row: Record<string, unknown>): SupplierOrderSummary {
  return {
    id: String(row.id),
    supplier_id: String(row.supplier_id ?? ""),
    supplier_name: String(row.supplier_name ?? "Fornecedor"),
    ordered_on: String(row.ordered_on ?? ""),
    destination_location_id: String(row.destination_location_id ?? ""),
    destination_code: String(row.destination_code ?? "—"),
    destination_name: String(row.destination_name ?? "—"),
    status: String(row.status ?? "pending"),
    notes: typeof row.notes === "string" ? row.notes : null,
    legacy_supplier_order_id:
      typeof row.legacy_supplier_order_id === "string"
        ? row.legacy_supplier_order_id
        : null,
    item_count: n(row.item_count),
    ordered_units: n(row.ordered_units),
    received_units: n(row.received_units),
    pending_units: n(row.pending_units),
    order_total: n(row.order_total),
    product_summary:
      typeof row.product_summary === "string"
        ? row.product_summary
        : null,
    waiting_sales_count: n(row.waiting_sales_count),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function getSupplierOrdersScaleSnapshot({
  tab = "pending",
  sort = "date",
  page = 1,
  pageSize = 30,
}: {
  tab?: "pending" | "history";
  sort?: "date" | "supplier" | "pending";
  page?: number;
  pageSize?: number;
}): Promise<SupplierOrdersScaleSnapshot> {
  const supabase = await createClient();
  const currentPage =
    Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const size = Math.min(Math.max(pageSize, 10), 100);
  const from = (currentPage - 1) * size;
  const to = from + size - 1;

  const pendingStatuses = ["pending", "partial"];
  const historyStatuses = ["received", "cancelled"];

  const [
    pendingResult,
    historyCountResult,
    receivedCountResult,
  ] = await Promise.all([
    supabase
      .from("supplier_order_summary")
      .select("pending_units,order_total,waiting_sales_count,status")
      .in("status", pendingStatuses),
    supabase
      .from("supplier_order_summary")
      .select("id", { count: "exact", head: true })
      .in("status", historyStatuses),
    supabase
      .from("supplier_order_summary")
      .select("id", { count: "exact", head: true })
      .eq("status", "received"),
  ]);

  if (pendingResult.error) throw pendingResult.error;
  if (historyCountResult.error) throw historyCountResult.error;
  if (receivedCountResult.error) throw receivedCountResult.error;

  let query = supabase
    .from("supplier_order_summary")
    .select("*", { count: "exact" })
    .in(
      "status",
      tab === "pending" ? pendingStatuses : historyStatuses,
    );

  if (sort === "supplier") {
    query = query
      .order("supplier_name", { ascending: true })
      .order("ordered_on", { ascending: false });
  } else if (sort === "pending") {
    query = query
      .order("pending_units", { ascending: false })
      .order("ordered_on", { ascending: false });
  } else {
    query = query.order("ordered_on", { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const pendingRows = pendingResult.data ?? [];
  const pendingCount = pendingRows.length;
  const historyCount = historyCountResult.count ?? 0;
  const total = count ?? 0;

  return {
    orders: (data ?? []).map((row) =>
      normalize(row as Record<string, unknown>),
    ),
    tab,
    sort,
    page: currentPage,
    pageSize: size,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
    pendingCount,
    historyCount,
    receivedCount: receivedCountResult.count ?? 0,
    pendingUnits: pendingRows.reduce(
      (sum, row) => sum + n(row.pending_units),
      0,
    ),
    pendingValue: pendingRows.reduce(
      (sum, row) => sum + n(row.order_total),
      0,
    ),
    waitingSales: pendingRows.reduce(
      (sum, row) => sum + n(row.waiting_sales_count),
      0,
    ),
  };
}
