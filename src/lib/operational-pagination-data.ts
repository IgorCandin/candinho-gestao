import { createClient } from "@/lib/supabase/server";

export type InventoryMovementScaleRow = {
  id: string;
  created_at: string;
  movement_type: string;
  quantity_delta: number;
  notes: string | null;
  product_name: string;
  location_code: string;
  location_name: string;
};

export type FitnessMovementScaleRow = {
  id: string;
  created_at: string;
  movement_type: string;
  movement_label: string;
  quantity_delta: number;
  notes: string | null;
  product_name: string;
  size: string | null;
  color: string | null;
  sku: string | null;
};

export type PagedOperationalResult<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function cleanPage(value: number) {
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 1;
}

function cleanPageSize(value: number) {
  const size = Number.isFinite(value)
    ? Math.floor(value)
    : 50;

  return Math.min(Math.max(size, 20), 100);
}

function safeSearch(value: string) {
  return value.replace(/[%(),]/g, " ").trim();
}

export async function getInventoryMovementsPage({
  page = 1,
  pageSize = 50,
  search = "",
  movementType = "",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  movementType?: string;
}): Promise<PagedOperationalResult<InventoryMovementScaleRow>> {
  const supabase = await createClient();
  const currentPage = cleanPage(page);
  const size = cleanPageSize(pageSize);
  const from = (currentPage - 1) * size;
  const to = from + size - 1;
  const q = safeSearch(search);

  let query = supabase
    .from("erp_inventory_movements_overview")
    .select("*", { count: "exact" });

  if (movementType) {
    query = query.eq("movement_type", movementType);
  }

  if (q) {
    query = query.or(
      `product_name.ilike.%${q}%,location_code.ilike.%${q}%,location_name.ilike.%${q}%,notes.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const total = count ?? 0;

  return {
    rows: (data ?? []).map((row) => ({
      id: String(row.id),
      created_at: String(row.created_at),
      movement_type: String(row.movement_type),
      quantity_delta: Number(row.quantity_delta ?? 0),
      notes: typeof row.notes === "string" ? row.notes : null,
      product_name: String(row.product_name ?? "Produto"),
      location_code: String(row.location_code ?? "—"),
      location_name: String(row.location_name ?? "—"),
    })),
    page: currentPage,
    pageSize: size,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
  };
}

export async function getFitnessMovementsPage({
  page = 1,
  pageSize = 50,
  search = "",
  movementType = "",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  movementType?: string;
}): Promise<PagedOperationalResult<FitnessMovementScaleRow>> {
  const supabase = await createClient();
  const currentPage = cleanPage(page);
  const size = cleanPageSize(pageSize);
  const from = (currentPage - 1) * size;
  const to = from + size - 1;
  const q = safeSearch(search);

  let query = supabase
    .from("erp_fitness_inventory_movements_overview")
    .select("*", { count: "exact" });

  if (movementType === "conversion") {
    query = query.in("movement_type", ["conversion_in", "conversion_out"]);
  } else if (movementType === "outflow") {
    query = query.in("movement_type", ["internal_use", "loss_damage"]);
  } else if (movementType) {
    query = query.eq("movement_type", movementType);
  }

  if (q) {
    query = query.or(
      `product_name.ilike.%${q}%,sku.ilike.%${q}%,size.ilike.%${q}%,color.ilike.%${q}%,notes.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const total = count ?? 0;

  return {
    rows: (data ?? []).map((row) => ({
      id: String(row.id),
      created_at: String(row.created_at),
      movement_type: String(row.movement_type),
      movement_label: String(row.movement_label ?? row.movement_type),
      quantity_delta: Number(row.quantity_delta ?? 0),
      notes: typeof row.notes === "string" ? row.notes : null,
      product_name: String(row.product_name ?? "Produto"),
      size: typeof row.size === "string" ? row.size : null,
      color: typeof row.color === "string" ? row.color : null,
      sku: typeof row.sku === "string" ? row.sku : null,
    })),
    page: currentPage,
    pageSize: size,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
  };
}
