import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";

export type FeatureFlags = Record<string, boolean>;

export type CompanyHomeSummary = {
  user: { id: string; name: string; role: string; is_partner: boolean };
  navigation: Array<{ key: string; href: string; badge?: number; visible: boolean }>;
  central: { unread: number; open_conversations: number };
  supplements: Record<string, unknown> | null;
  fitness: Record<string, unknown> | null;
  bank: Record<string, unknown> | null;
  partner: Record<string, unknown> | null;
};

export type AppBootstrapSnapshot = {
  profile: {
    id: string;
    name: string;
    email: string | null;
    username: string | null;
    role: string;
    can_access_supplements: boolean;
    can_write_supplements: boolean;
    can_access_fitness: boolean;
    can_write_fitness: boolean;
    can_access_bank: boolean;
    can_write_bank: boolean;
    can_manage_users: boolean;
  };
  feature_flags: FeatureFlags;
  home: CompanyHomeSummary;
  partner_portal: PartnerPortalDashboard | null;
};

export type CentralDashboardSnapshot = {
  unread: number;
  open_conversations: number;
  pending_conversations: number;
  contacts: number;
  media_assets: number;
  active_ai_insights: number;
  integrations: Array<{
    provider: string;
    scope: string;
    account_name: string | null;
    status: string;
  }>;
};

export type CentralInboxItem = {
  conversation_id: string;
  operation_scope: string;
  provider: string;
  account_external_id: string;
  account_name: string | null;
  contact_id: string | null;
  contact_name: string;
  phone: string | null;
  instagram_username: string | null;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  last_message_at: string | null;
  unread_count: number;
  last_message_id: string | null;
  last_message_direction: string | null;
  last_message_type: string | null;
  last_message_body: string | null;
  last_message_delivery_status: string | null;
};

export type CentralMessage = {
  id: string;
  direction: string;
  message_type: string;
  body: string | null;
  media_external_url: string | null;
  delivery_status: string | null;
  sent_at: string;
  created_at: string;
};

export type CentralContact = {
  id: string;
  display_name: string;
  phone: string | null;
  instagram_username: string | null;
  preferred_channel: string | null;
  notes: string | null;
  supplements_customer_id: string | null;
  fitness_customer_id: string | null;
};

export type CentralConversationDetails = {
  conversation: CentralInboxItem | null;
  contact: CentralContact | null;
  messages: CentralMessage[];
};

export type CentralIntegrationHealth = {
  provider: string;
  operation_scope: string;
  account_name: string | null;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  health_status?: string | null;
  processed_events?: number | null;
  pending_events?: number | null;
  failed_events?: number | null;
  last_event_at?: string | null;
};

export type CentralMediaAsset = {
  id: string;
  operation_scope: string;
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  description_ai: string | null;
  search_text: string | null;
  ai_metadata: Record<string, unknown> | null;
  tags: string[];
  created_at: string;
  signed_url: string | null;
};

export type CentralAiInsight = {
  id: string;
  operation_scope: string;
  contact_id: string | null;
  conversation_id: string | null;
  insight_type: string;
  title: string;
  content: string;
  status: string;
  model_name: string | null;
  generated_at: string;
};

export type PartnerPortalProfile = {
  partner_id: string;
  partner_name: string;
  contact_name: string | null;
  city: string | null;
  partner_type: string;
  status: string;
  partnership_model: string | null;
  settlement_rule: string | null;
  commission_pct: number;
  partnership_percent: number;
  reward_type: string | null;
  reward_value: number;
  reward_description: string | null;
  settlement_frequency: string | null;
  settlement_day: number | null;
  coupon_code: string | null;
  linked_location_id: string | null;
  linked_location_name: string | null;
  active: boolean;
};

export type PartnerPortalSummary = {
  partner_id: string;
  sales_count: number;
  units_sold: number;
  gross_sales: number;
  delivered_sales_count: number;
  delivered_gross_sales: number;
  partnership_percent: number;
  reward_type: string | null;
  reward_value: number;
  reward_description: string | null;
  target_sales: number | null;
  qualifying_sales_count: number;
  progress_percent: number | null;
};

export type PartnerPortalStock = {
  product_id: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  sale_price: number;
  installment_price: number;
  image_url: string | null;
  quantity: number;
  updated_at: string | null;
};

export type PartnerPortalSale = {
  sale_id: string;
  sold_at: string;
  general_status: string;
  payment_status: string;
  delivery_status: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type PartnerPortalMonthlyHistory = {
  month_start: string;
  sales_count: number;
  units_sold: number;
  gross_sales: number;
  delivered_sales_count: number;
  delivered_gross_sales: number;
  partnership_percent: number;
  estimated_partner_share: number;
};

export type PartnerPortalDashboard = {
  profile: PartnerPortalProfile | null;
  summary: PartnerPortalSummary | null;
  stock: PartnerPortalStock[];
  recent_sales: PartnerPortalSale[];
};

export type PartnerPortalAdminRow = {
  partner_id: string;
  partner_name: string;
  contact_name: string | null;
  city: string | null;
  partner_type: string;
  status: string;
  partnership_percent: number;
  reward_type: string | null;
  reward_description: string | null;
  linked_location_name: string | null;
  profile_id: string | null;
  portal_user_name: string | null;
  portal_user_email: string | null;
  portal_username: string | null;
  portal_access_active: boolean | null;
};

export type PartnerPortalAdminSnapshot = {
  partners: PartnerPortalAdminRow[];
  without_portal_count: number;
  active_portals: number;
};

export type InventoryWorkspaceLocation = {
  location_id: string;
  location_code: string;
  location_name: string;
  city: string | null;
  location_type: string | null;
  counts_for_replenishment: boolean;
  products_with_stock: number;
  physical_units: number;
  reserved_units: number;
  available_units: number;
  incoming_units: number;
  stock_cost_value: number;
  stock_sale_value: number;
  last_movement_at: string | null;
};

export type InventoryWorkspaceAttention = {
  attention_type: "product" | "location" | string;
  entity_id: string;
  title: string;
  status: string;
  details: Record<string, unknown>;
};

export type InventoryWorkspaceSnapshot = {
  summary: {
    active_products: number;
    products_with_stock: number;
    physical_units: number;
    reserved_units: number;
    available_units: number;
    incoming_units: number;
    stock_cost_value: number;
    stock_sale_value: number;
    attention_products: number;
  } | null;
  locations: InventoryWorkspaceLocation[];
  attention: InventoryWorkspaceAttention[];
};

function asObject<T>(value: unknown, fallback: T): T {
  return value && typeof value === "object" ? value as T : fallback;
}

export async function getAppBootstrapSnapshot(): Promise<AppBootstrapSnapshot | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("app_bootstrap_snapshot");
  if (error) return null;
  return asObject<AppBootstrapSnapshot>(data, null as unknown as AppBootstrapSnapshot);
}

export async function getCentralDashboardSnapshot(): Promise<CentralDashboardSnapshot> {
  if (!isSupabaseConfigured) return { unread: 0, open_conversations: 0, pending_conversations: 0, contacts: 0, media_assets: 0, active_ai_insights: 0, integrations: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("central_dashboard_snapshot");
  if (error) throw error;
  return asObject<CentralDashboardSnapshot>(data, { unread: 0, open_conversations: 0, pending_conversations: 0, contacts: 0, media_assets: 0, active_ai_insights: 0, integrations: [] });
}

export async function getCentralInboxSnapshot(provider?: string | null, status?: string | null, limit = 100): Promise<CentralInboxItem[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("central_inbox_snapshot", {
    p_provider: provider || null,
    p_status: status || null,
    p_limit: limit,
  });
  if (error) throw error;
  const payload = asObject<{ items?: CentralInboxItem[] }>(data, {});
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function getCentralConversationDetails(conversationId: string): Promise<CentralConversationDetails> {
  if (!isSupabaseConfigured) return { conversation: null, contact: null, messages: [] };
  const supabase = await createClient();
  const [conversationResult, messagesResult] = await Promise.all([
    supabase.from("central_inbox_overview").select("*").eq("conversation_id", conversationId).maybeSingle(),
    supabase.from("central_messages").select("id,direction,message_type,body,media_external_url,delivery_status,sent_at,created_at").eq("conversation_id", conversationId).order("sent_at", { ascending: true }).limit(200),
  ]);
  if (conversationResult.error) throw conversationResult.error;
  if (messagesResult.error) throw messagesResult.error;
  const conversation = conversationResult.data as CentralInboxItem | null;
  let contact: CentralContact | null = null;
  if (conversation?.contact_id) {
    const contactResult = await supabase.from("central_contacts").select("id,display_name,phone,instagram_username,preferred_channel,notes,supplements_customer_id,fitness_customer_id").eq("id", conversation.contact_id).maybeSingle();
    if (contactResult.error) throw contactResult.error;
    contact = contactResult.data as CentralContact | null;
  }
  return { conversation, contact, messages: (messagesResult.data ?? []) as CentralMessage[] };
}

export async function getCentralIntegrationHealth(): Promise<CentralIntegrationHealth[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("central_integration_health_snapshot");
  if (error) throw error;
  return Array.isArray(data) ? data as CentralIntegrationHealth[] : [];
}

export async function getCentralMediaAssets(query = "", scope: string | null = null): Promise<CentralMediaAsset[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("central_media_search", { p_query: query || null, p_scope: scope, p_limit: 120 });
  if (error) throw error;
  const rows = (data ?? []) as Omit<CentralMediaAsset, "signed_url">[];
  const paths = rows.map((row) => row.storage_path).filter((path): path is string => Boolean(path));
  const signedByPath = new Map<string, string>();
  if (paths.length) {
    const signed = await supabase.storage.from("central-media").createSignedUrls(paths, 3600);
    if (!signed.error) {
      signed.data?.forEach((item, index) => {
        const path = paths[index];
        if (path && item.signedUrl) signedByPath.set(path, item.signedUrl);
      });
    }
  }
  return rows.map((row) => ({ ...row, signed_url: row.storage_path ? signedByPath.get(row.storage_path) ?? null : null }));
}

export async function getCentralAiInsights(limit = 50): Promise<CentralAiInsight[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("central_ai_insights").select("id,operation_scope,contact_id,conversation_id,insight_type,title,content,status,model_name,generated_at").order("generated_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as CentralAiInsight[];
}

export async function getPartnerPortalDashboard(): Promise<PartnerPortalDashboard | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("partner_portal_dashboard", { p_from: null, p_to: null });
  if (error) return null;
  return asObject<PartnerPortalDashboard>(data, null as unknown as PartnerPortalDashboard);
}

export async function getPartnerMonthlyHistory(months = 12): Promise<PartnerPortalMonthlyHistory[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("partner_portal_get_monthly_history", { p_months: months });
  if (error) throw error;
  return (data ?? []) as PartnerPortalMonthlyHistory[];
}

export async function getPartnerPortalAdminSnapshot(): Promise<PartnerPortalAdminSnapshot> {
  if (!isSupabaseConfigured) return { partners: [], without_portal_count: 0, active_portals: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("partner_portal_admin_snapshot");
  if (error) throw error;
  return asObject<PartnerPortalAdminSnapshot>(data, { partners: [], without_portal_count: 0, active_portals: 0 });
}

export async function getInventoryWorkspaceSnapshot(): Promise<InventoryWorkspaceSnapshot> {
  if (!isSupabaseConfigured) return { summary: null, locations: [], attention: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("inventory_workspace_snapshot");
  if (error) throw error;
  return asObject<InventoryWorkspaceSnapshot>(data, { summary: null, locations: [], attention: [] });
}

export async function getCentralContacts(limit = 200): Promise<CentralContact[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("central_contacts")
    .select("id,display_name,phone,instagram_username,preferred_channel,notes,supplements_customer_id,fitness_customer_id")
    .order("display_name")
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CentralContact[];
}
