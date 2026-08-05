import { createClient } from "@/lib/supabase/server";

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type DemandGapSummary = {
  normalized_name: string;
  product_name: string;
  operation_scope: "supplements" | "fitness" | "both";
  category: string | null;
  brand: string | null;
  image_url: string | null;
  requests_count: number;
  active_requests_count: number;
  last_requested_on: string;
  priority_rank: number;
  cities: string[];
};

export type DemandGapRecord = {
  id: string;
  product_id: string | null;
  product_name: string;
  operation_scope: "supplements" | "fitness" | "both";
  category: string | null;
  brand: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  city: string | null;
  requested_on: string;
  priority: "low" | "medium" | "high" | "extreme";
  status:
    | "open"
    | "evaluating"
    | "planned_purchase"
    | "ordered"
    | "stocked"
    | "dismissed";
  source: string;
  image_url: string | null;
  image_source_url: string | null;
  notes: string | null;
  created_at: string;
};

export async function getDemandGapCenter() {
  const supabase = await createClient();

  const [summaryResult, recentResult] = await Promise.all([
    supabase
      .from("central_demand_gap_summary")
      .select("*")
      .order("requests_count", { ascending: false })
      .order("last_requested_on", { ascending: false })
      .limit(40),

    supabase
      .from("central_demand_gaps")
      .select("*")
      .order("requested_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (summaryResult.error) {
    throw new Error(
      `Falha ao carregar resumo de rupturas: ${summaryResult.error.message}`,
    );
  }

  if (recentResult.error) {
    throw new Error(
      `Falha ao carregar demandas: ${recentResult.error.message}`,
    );
  }

  const summary: DemandGapSummary[] = (
    summaryResult.data ?? []
  ).map((row) => ({
    normalized_name: String(row.normalized_name),
    product_name: String(row.product_name ?? ""),
    operation_scope: String(
      row.operation_scope ?? "supplements",
    ) as DemandGapSummary["operation_scope"],
    category: row.category ? String(row.category) : null,
    brand: row.brand ? String(row.brand) : null,
    image_url: row.image_url ? String(row.image_url) : null,
    requests_count: numberValue(row.requests_count),
    active_requests_count: numberValue(
      row.active_requests_count,
    ),
    last_requested_on: String(row.last_requested_on ?? ""),
    priority_rank: numberValue(row.priority_rank),
    cities: Array.isArray(row.cities)
      ? row.cities.map(String)
      : [],
  }));

  const recent: DemandGapRecord[] = (
    recentResult.data ?? []
  ).map((row) => ({
    id: String(row.id),
    product_id: row.product_id ? String(row.product_id) : null,
    product_name: String(row.product_name ?? ""),
    operation_scope: String(
      row.operation_scope ?? "supplements",
    ) as DemandGapRecord["operation_scope"],
    category: row.category ? String(row.category) : null,
    brand: row.brand ? String(row.brand) : null,
    customer_name: row.customer_name
      ? String(row.customer_name)
      : null,
    customer_phone: row.customer_phone
      ? String(row.customer_phone)
      : null,
    city: row.city ? String(row.city) : null,
    requested_on: String(row.requested_on ?? ""),
    priority: String(
      row.priority ?? "medium",
    ) as DemandGapRecord["priority"],
    status: String(
      row.status ?? "open",
    ) as DemandGapRecord["status"],
    source: String(row.source ?? "manual"),
    image_url: row.image_url ? String(row.image_url) : null,
    image_source_url: row.image_source_url
      ? String(row.image_source_url)
      : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at ?? ""),
  }));

  return { summary, recent };
}
