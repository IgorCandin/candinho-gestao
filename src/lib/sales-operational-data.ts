import { createClient } from "@/lib/supabase/server";
import type { SaleRow } from "@/lib/types";

export type SalesOperationalView =
  | "pending"
  | "finalized"
  | "all";

export type SalesOperationalProduct = {
  id: string;
  name: string;
  image_url: string | null;
  quantity: number;
};

export type SalesOperationalRow =
  SaleRow & {
    city: string | null;
    products: SalesOperationalProduct[];
  };

export type SalesOperationalPage = {
  rows: SalesOperationalRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const number = (value: unknown) =>
  Number(value ?? 0);

const text = (
  value: unknown,
  fallback = "—",
) =>
  typeof value === "string" &&
  value.trim()
    ? value
    : fallback;

function oneRelation(
  value: unknown,
): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object"
      ? (first as Record<string, unknown>)
      : null;
  }

  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeSale(
  row: Record<string, unknown>,
): SalesOperationalRow {
  return {
    id: String(row.id),
    customer_id:
      typeof row.customer_id === "string"
        ? row.customer_id
        : null,
    customer_name: text(
      row.customer_name,
      "Cliente não informado",
    ),
    location_id: String(
      row.location_id ?? "",
    ),
    location_code: text(
      row.location_code,
    ),
    location_name: text(
      row.location_name,
    ),
    business_at: String(
      row.business_at ?? "",
    ),
    business_date: String(
      row.business_date ?? "",
    ),
    quoted_at: String(
      row.quoted_at ?? "",
    ),
    delivered_at:
      typeof row.delivered_at === "string"
        ? row.delivered_at
        : null,
    general_status: text(
      row.general_status,
      "pending",
    ),
    payment_status: text(
      row.payment_status,
      "not_applicable",
    ),
    delivery_status: text(
      row.delivery_status,
      "not_applicable",
    ),
    payment_method:
      typeof row.payment_method ===
      "string"
        ? row.payment_method
        : null,
    payment_condition:
      typeof row.payment_condition ===
      "string"
        ? row.payment_condition
        : null,
    total_amount: number(
      row.total_amount,
    ),
    total_profit: number(
      row.total_profit,
    ),
    notes:
      typeof row.notes === "string"
        ? row.notes
        : null,
    product_summary:
      typeof row.product_summary ===
      "string"
        ? row.product_summary
        : null,
    total_items: number(
      row.total_items,
    ),
    paid_at:
      typeof row.paid_at === "string"
        ? row.paid_at
        : null,
    payment_due_at:
      typeof row.payment_due_at ===
      "string"
        ? row.payment_due_at
        : null,
    price_condition:
      typeof row.price_condition ===
      "string"
        ? row.price_condition
        : null,
    partner_id:
      typeof row.partner_id === "string"
        ? row.partner_id
        : null,
    partner_name:
      typeof row.partner_name ===
      "string"
        ? row.partner_name
        : null,
    primary_product_id:
      typeof row.primary_product_id ===
      "string"
        ? row.primary_product_id
        : null,
    primary_image_url:
      typeof row.primary_image_url ===
      "string"
        ? row.primary_image_url
        : null,
    reservation_status:
      typeof row.reservation_status ===
      "string"
        ? row.reservation_status
        : null,
    city:
      typeof row.city === "string" &&
      row.city.trim()
        ? row.city
        : null,
    products: [],
  };
}

function safeSearch(value: string) {
  return value
    .replace(/[%(),]/g, " ")
    .trim();
}

function monthRange(
  value: string,
): {
  start: string;
  end: string;
} | null {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month] = value
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  const nextMonth =
    month === 12 ? 1 : month + 1;
  const nextYear =
    month === 12 ? year + 1 : year;

  return {
    start: `${year}-${String(
      month,
    ).padStart(2, "0")}-01`,
    end: `${nextYear}-${String(
      nextMonth,
    ).padStart(2, "0")}-01`,
  };
}

export async function getSalesOperationalPage({
  page = 1,
  pageSize = 30,
  search = "",
  view = "pending",
  city = "",
  month = "",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  view?: SalesOperationalView;
  city?: string;
  month?: string;
}): Promise<SalesOperationalPage> {
  const supabase =
    await createClient();

  const currentPage =
    Number.isFinite(page) && page > 0
      ? Math.floor(page)
      : 1;

  const size = Math.min(
    Math.max(
      Number.isFinite(pageSize)
        ? Math.floor(pageSize)
        : 30,
      10,
    ),
    100,
  );

  const from =
    (currentPage - 1) * size;
  const to = from + size - 1;
  const q = safeSearch(search);
  const cityFilter = city.trim();
  const range = monthRange(
    month.trim(),
  );

  let query = supabase
    .from("sales_history_v2")
    .select("*", { count: "exact" });

  if (view === "pending") {
    query = query
      .neq(
        "general_status",
        "cancelled",
      )
      .or(
        "payment_status.neq.received,delivery_status.neq.delivered",
      );
  } else if (
    view === "finalized"
  ) {
    query = query.eq(
      "general_status",
      "finalized",
    );
  }

  if (q) {
    query = query.or(
      `customer_name.ilike.%${q}%,product_summary.ilike.%${q}%,location_name.ilike.%${q}%,city.ilike.%${q}%`,
    );
  }

  if (cityFilter) {
    query = query.eq(
      "city",
      cityFilter,
    );
  }

  if (range) {
    query = query
      .gte(
        "business_date",
        range.start,
      )
      .lt(
        "business_date",
        range.end,
      );
  }

  const {
    data,
    error,
    count,
  } = await query
    .order("business_date", {
      ascending: false,
    })
    .order("quoted_at", {
      ascending: false,
    })
    .range(from, to);

  if (error) throw error;

  const rows = (data ?? []).map(
    (row) =>
      normalizeSale(
        row as Record<
          string,
          unknown
        >,
      ),
  );

  if (rows.length > 0) {
    const {
      data: itemData,
      error: itemError,
    } = await supabase
      .from("sale_items")
      .select(
        "id,sale_id,product_id,quantity,product:products(id,name,image_url)",
      )
      .in(
        "sale_id",
        rows.map((sale) => sale.id),
      );

    if (itemError) throw itemError;

    const productsBySale = new Map<
      string,
      Map<string, SalesOperationalProduct>
    >();

    for (const item of itemData ?? []) {
      const itemRow =
        item as Record<string, unknown>;
      const saleId = String(
        itemRow.sale_id ?? "",
      );
      const product = oneRelation(
        itemRow.product,
      );
      const productId = String(
        itemRow.product_id ??
          product?.id ??
          "",
      );

      if (!saleId || !productId) continue;

      const saleProducts =
        productsBySale.get(saleId) ??
        new Map<
          string,
          SalesOperationalProduct
        >();
      const current =
        saleProducts.get(productId);
      const quantity = Math.max(
        number(itemRow.quantity),
        1,
      );

      saleProducts.set(productId, {
        id: productId,
        name: text(
          product?.name,
          "Produto",
        ),
        image_url:
          typeof product?.image_url ===
          "string"
            ? product.image_url
            : null,
        quantity:
          (current?.quantity ?? 0) +
          quantity,
      });
      productsBySale.set(
        saleId,
        saleProducts,
      );
    }

    for (const sale of rows) {
      const products = Array.from(
        productsBySale
          .get(sale.id)
          ?.values() ?? [],
      );

      sale.products =
        products.length > 0
          ? products
          : sale.primary_product_id
            ? [
                {
                  id: sale.primary_product_id,
                  name:
                    sale.product_summary ??
                    "Produto",
                  image_url:
                    sale.primary_image_url,
                  quantity: Math.max(
                    sale.total_items,
                    1,
                  ),
                },
              ]
            : [];
    }
  }

  const total = count ?? 0;

  return {
    rows,
    page: currentPage,
    pageSize: size,
    total,
    totalPages: Math.max(
      1,
      Math.ceil(total / size),
    ),
  };
}
