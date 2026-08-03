import { createClient } from "@/lib/supabase/server";

export type CommercialInboxStatus =
  | "new"
  | "in_service"
  | "waiting_customer"
  | "ready_to_close"
  | "converted"
  | "closed";

export type CommercialInboxKind =
  | "purchase_intent"
  | "human_handoff"
  | "interest";

export type CommercialInboxItem = {
  catalogLeadId: string;
  salesLeadId: string | null;
  customerId: string | null;
  customerName: string;
  phone: string | null;
  city: string | null;
  productId: string | null;
  productName: string | null;
  productImageUrl: string | null;
  salePrice: number | null;
  source: string;
  inboxKind: CommercialInboxKind;
  inboxStatus: CommercialInboxStatus;
  contextSummary: string | null;
  createdAt: string;
  updatedAt: string;
  lastActionAt: string | null;
  contactedAt: string | null;
  leadStatus: string | null;
  quoteId: string | null;
  quoteStatus: string | null;
  convertedSaleId: string | null;
};

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getCommercialInboxItems(): Promise<CommercialInboxItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("commercial_inbox_overview_v1")
    .select("*")
    .in("inbox_status", [
      "new",
      "in_service",
      "waiting_customer",
      "ready_to_close",
    ])
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    console.warn("[Commercial Inbox]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    catalogLeadId: String(row.catalog_lead_id),
    salesLeadId: text(row.sales_lead_id),
    customerId: text(row.customer_id),
    customerName: String(row.customer_name ?? "Contato da vitrine"),
    phone: text(row.phone),
    city: text(row.city),
    productId: text(row.product_id),
    productName: text(row.product_name),
    productImageUrl: text(row.product_image_url),
    salePrice: number(row.sale_price),
    source: String(row.source ?? "catalog"),
    inboxKind:
      row.inbox_kind === "human_handoff"
        ? "human_handoff"
        : row.inbox_kind === "interest"
          ? "interest"
          : "purchase_intent",
    inboxStatus:
      row.inbox_status === "in_service" ||
      row.inbox_status === "waiting_customer" ||
      row.inbox_status === "ready_to_close" ||
      row.inbox_status === "converted" ||
      row.inbox_status === "closed"
        ? row.inbox_status
        : "new",
    contextSummary: text(row.context_summary),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    lastActionAt: text(row.last_action_at),
    contactedAt: text(row.contacted_at),
    leadStatus: text(row.lead_status),
    quoteId: text(row.quote_id),
    quoteStatus: text(row.quote_status),
    convertedSaleId: text(row.converted_sale_id),
  }));
}
