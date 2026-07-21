import { isSupabaseConfigured } from "./config";
import {
  getCustomerLeads as getCustomerLeadsLegacy,
  getCustomerPendingOrders as getCustomerPendingOrdersLegacy,
  getCustomerSales as getCustomerSalesLegacy,
  getEntitySwipeNavigation as getEntitySwipeNavigationLegacy,
} from "./data";
import { createClient } from "./supabase/server";
import type {
  LeadRow,
  PendingOrderRow,
  SaleRow,
  SwipeNavigation,
} from "./types";

const number = (value: unknown) => Number(value ?? 0);

const text = (
  value: unknown,
  fallback = "—",
) =>
  typeof value === "string" && value.trim()
    ? value
    : fallback;

function oneRelation(
  value: unknown,
): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return (
      (value[0] as
        | Record<string, unknown>
        | undefined) ?? null
    );
  }

  return value &&
    typeof value === "object"
    ? (value as Record<
        string,
        unknown
      >)
    : null;
}

function normalizeSale(
  row: Record<string, unknown>,
): SaleRow {
  return {
    id: String(row.id),
    customer_id:
      typeof row.customer_id ===
      "string"
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
      typeof row.delivered_at ===
      "string"
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
      typeof row.partner_id ===
      "string"
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
  };
}

function normalizeLead(
  row: Record<string, unknown>,
): LeadRow {
  return {
    id: String(row.id),
    item_id: null,
    item_quantity: 1,
    customer_id:
      typeof row.customer_id ===
      "string"
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
    lead_at: String(
      row.lead_at ?? "",
    ),
    lead_date: String(
      row.lead_date ?? "",
    ),
    lead_month: String(
      row.lead_month ?? "",
    ),
    lead_status:
      typeof row.lead_status ===
      "string"
        ? row.lead_status
        : null,
    general_status: text(
      row.general_status,
      "pending",
    ),
    reference:
      typeof row.reference ===
      "string"
        ? row.reference
        : null,
    city:
      typeof row.city === "string"
        ? row.city
        : null,
    phone:
      typeof row.phone === "string"
        ? row.phone
        : null,
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
  };
}

function normalizePendingOrder(
  row: Record<string, unknown>,
): PendingOrderRow {
  return {
    id: String(row.id),
    customer_id:
      typeof row.customer_id ===
      "string"
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
    order_at: String(
      row.order_at ?? "",
    ),
    paid_at:
      typeof row.paid_at === "string"
        ? row.paid_at
        : null,
    delivered_at:
      typeof row.delivered_at ===
      "string"
        ? row.delivered_at
        : null,
    general_status: text(
      row.general_status,
      "active",
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
    product_summary:
      typeof row.product_summary ===
      "string"
        ? row.product_summary
        : null,
    total_items: number(
      row.total_items,
    ),
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
      typeof row.partner_id ===
      "string"
        ? row.partner_id
        : null,
    partner_name:
      typeof row.partner_name ===
      "string"
        ? row.partner_name
        : null,
    reservation_status:
      typeof row.reservation_status ===
      "string"
        ? row.reservation_status
        : null,
  };
}

/**
 * Antes, a ficha do cliente chamava getSalesHistory(),
 * carregava até 500 vendas da empresa e só depois filtrava
 * pelo customer_id em memória.
 *
 * Agora o filtro acontece diretamente no Postgres/PostgREST.
 */
export async function getCustomerSales(
  customerId: string,
): Promise<SaleRow[]> {
  if (!isSupabaseConfigured) {
    return getCustomerSalesLegacy(
      customerId,
    );
  }

  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("sales_history")
      .select("*")
      .eq(
        "customer_id",
        customerId,
      )
      .order("business_date", {
        ascending: false,
      })
      .order("quoted_at", {
        ascending: false,
      });

  if (error) throw error;

  return (data ?? []).map(
    (row) =>
      normalizeSale(
        row as Record<
          string,
          unknown
        >,
      ),
  );
}

/**
 * Busca somente os leads do cliente.
 * Os itens são carregados apenas para os IDs retornados,
 * preservando a visualização por produto já usada no ERP.
 */
export async function getCustomerLeads(
  customerId: string,
): Promise<LeadRow[]> {
  if (!isSupabaseConfigured) {
    return getCustomerLeadsLegacy(
      customerId,
    );
  }

  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("leads_history")
      .select("*")
      .eq(
        "customer_id",
        customerId,
      )
      .order("lead_month", {
        ascending: false,
      })
      .order("lead_date", {
        ascending: false,
      });

  if (error) throw error;

  const baseLeads = (
    data ?? []
  ).map((row) =>
    normalizeLead(
      row as Record<
        string,
        unknown
      >,
    ),
  );

  if (
    baseLeads.length === 0
  ) {
    return [];
  }

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
      baseLeads.map(
        (lead) => lead.id,
      ),
    );

  if (itemError) {
    throw itemError;
  }

  const itemsByLead =
    new Map<
      string,
      Record<
        string,
        unknown
      >[]
    >();

  for (
    const item of
    itemData ?? []
  ) {
    const row =
      item as Record<
        string,
        unknown
      >;

    const saleId = String(
      row.sale_id ?? "",
    );

    if (!saleId) continue;

    const list =
      itemsByLead.get(
        saleId,
      ) ?? [];

    list.push(row);

    itemsByLead.set(
      saleId,
      list,
    );
  }

  return baseLeads.flatMap(
    (lead) => {
      const items =
        itemsByLead.get(
          lead.id,
        ) ?? [];

      if (
        items.length === 0
      ) {
        return [lead];
      }

      return items.map(
        (item) => {
          const product =
            oneRelation(
              item.product,
            );

          const quantity =
            Math.max(
              number(
                item.quantity,
              ),
              1,
            );

          const productName =
            text(
              product?.name,
              "Produto",
            );

          return {
            ...lead,
            item_id: String(
              item.id ??
                `${lead.id}:${item.product_id ?? productName}`,
            ),
            item_quantity:
              quantity,
            product_summary:
              `${productName} ×${quantity}`,
            total_items:
              quantity,
            primary_product_id:
              typeof item.product_id ===
              "string"
                ? item.product_id
                : typeof product?.id ===
                    "string"
                  ? product.id
                  : null,
            primary_image_url:
              typeof product?.image_url ===
              "string"
                ? product.image_url
                : null,
          };
        },
      );
    },
  );
}

/**
 * Antes, todos os pedidos pendentes eram carregados
 * e filtrados no servidor Next.
 *
 * Agora somente os pedidos do cliente atravessam a rede.
 */
export async function getCustomerPendingOrders(
  customerId: string,
): Promise<
  PendingOrderRow[]
> {
  if (!isSupabaseConfigured) {
    return getCustomerPendingOrdersLegacy(
      customerId,
    );
  }

  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("pending_orders")
      .select("*")
      .eq(
        "customer_id",
        customerId,
      )
      .order("business_date", {
        ascending: false,
      });

  if (error) throw error;

  return (data ?? []).map(
    (row) =>
      normalizePendingOrder(
        row as Record<
          string,
          unknown
        >,
      ),
  );
}

type SwipeKind =
  | "product"
  | "customer"
  | "sale"
  | "quote"
  | "partner"
  | "fitness_product"
  | "fitness_customer"
  | "fitness_sale";

const BASE_BY_KIND: Record<
  SwipeKind,
  string
> = {
  product: "/produtos",
  customer: "/clientes",
  sale: "/vendas",
  quote: "/orcamentos",
  partner: "/parceiros",
  fitness_product:
    "/fitness/produtos",
  fitness_customer:
    "/fitness/clientes",
  fitness_sale:
    "/fitness/vendas",
};

/**
 * A implementação antiga carregava uma lista inteira de IDs
 * em cada abertura de ficha apenas para descobrir o vizinho.
 *
 * O RPC usa window functions no Postgres e devolve somente
 * previous_id + next_id.
 */
export async function getEntitySwipeNavigation(
  kind: SwipeKind,
  currentId: string,
): Promise<SwipeNavigation> {
  if (!isSupabaseConfigured) {
    return getEntitySwipeNavigationLegacy(
      kind,
      currentId,
    );
  }

  const supabase =
    await createClient();

  const { data, error } =
    await supabase.rpc(
      "erp_entity_swipe_navigation",
      {
        p_kind: kind,
        p_current_id:
          currentId,
      },
    );

  if (error) {
    // Fallback mantém a navegação disponível caso
    // exista drift de migration em um ambiente local.
    return getEntitySwipeNavigationLegacy(
      kind,
      currentId,
    );
  }

  const row =
    data &&
    typeof data === "object"
      ? (data as Record<
          string,
          unknown
        >)
      : {};

  const previousId =
    typeof row.previous_id ===
    "string"
      ? row.previous_id
      : null;

  const nextId =
    typeof row.next_id ===
    "string"
      ? row.next_id
      : null;

  const base =
    BASE_BY_KIND[kind];

  return {
    previous:
      previousId
        ? {
            href: `${base}/${previousId}`,
          }
        : null,
    next:
      nextId
        ? {
            href: `${base}/${nextId}`,
          }
        : null,
  };
}
