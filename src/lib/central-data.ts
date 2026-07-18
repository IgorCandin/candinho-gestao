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
  marketing: Record<string, unknown> | null;
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
    can_access_marketing: boolean;
    can_write_marketing: boolean;
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
  operation_scope: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  instagram_username: string | null;
  preferred_channel: string | null;
  notes: string | null;
  supplements_customer_id: string | null;
  fitness_customer_id: string | null;
};

export type CentralContactIdentity = {
  id: string;
  provider: string;
  account_external_id: string;
  external_id: string;
  username: string | null;
  display_name: string | null;
};

export type CentralContactDetails = {
  contact: CentralContact | null;
  identities: CentralContactIdentity[];
  conversations: CentralInboxItem[];
};

export type CentralConversationDetails = {
  conversation: CentralInboxItem | null;
  contact: CentralContact | null;
  messages: CentralMessage[];
};


export type CentralTeamMember = { id: string; full_name: string | null; email: string | null; role: string };

export type CentralQuickReply = {
  id: string;
  operation_scope: string;
  title: string;
  body: string;
  active: boolean;
  sort_order: number;
};

export type CentralDailyPriorityTask = {
  id: string; title: string; category: string; due_at: string; priority: string; status: string; operation_scope: string; central_contact_id: string | null; contact_name: string | null; assigned_name: string | null; sort_rank: number;
};
export type CentralDailyPriorityConversation = {
  conversation_id: string; operation_scope: string; provider: string; contact_name: string; status: string; assigned_to_name: string | null; last_message_at: string | null; unread_count: number; last_message_body: string | null;
};
export type CentralDailyPriorityRadar = {
  customer_id: string; customer_name: string; phone: string | null; city: string | null; last_product_name: string | null; days_to_repurchase: number | null; opportunity_priority: string; opportunity_label: string; recommended_action: string | null; priority_source: string; opportunity_score: number;
};
export type CentralDailyPriorityInventory = { attention_type: string; entity_id: string; title: string; status: string; details: Record<string, unknown> | null };
export type CentralDailyPrioritiesSnapshot = {
  generated_at: string | null;
  summary: { tasks: number; conversations: number; radar: number; inventory: number; partner_attention: number; integration_attention: number; total: number };
  tasks: CentralDailyPriorityTask[];
  conversations: CentralDailyPriorityConversation[];
  radar: CentralDailyPriorityRadar[];
  inventory: CentralDailyPriorityInventory[];
  partners: PartnerPortalHealthSnapshot;
  integrations: CentralIntegrationHealth[];
};

export type CentralIntegrationHealth = {
  id?: string;
  provider: string;
  operation_scope: string;
  account_external_id?: string | null;
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



export type CentralGovernanceAuditEvent = {
  id: number;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
};

export type CentralGovernanceSnapshot = {
  audit: CentralGovernanceAuditEvent[];
  integrations: CentralIntegrationHealth[];
};

export type CentralFeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

export type CentralGovernanceSnapshotV2 = CentralGovernanceSnapshot & {
  feature_flags: CentralFeatureFlag[];
  users: { total: number; active: number; admins: number; operators: number; sales: number; partners: number; marketing_access: number };
  partner_portal: { eligible: number; active_portals: number; without_portal: number };
};

export type CentralSearchResult = {
  result_type: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
  href: string;
  operation_scope: string;
  score: number;
};

export type CentralAlertItem = {
  key: string;
  severity: "critical" | "attention" | "info" | string;
  category: string;
  title: string;
  description: string;
  count: number;
  href: string;
};

export type CentralAlertsSnapshot = {
  summary: { total: number; critical: number; attention: number; info: number };
  items: CentralAlertItem[];
};

export type CentralIntegrationReadiness = {
  meta: {
    webhook_url: string;
    verify_token_configured: boolean;
    app_secret_configured: boolean;
    graph_api_version_configured?: boolean;
    receive_ready?: boolean;
    send_ready?: boolean;
    send?: { whatsapp: boolean; instagram: boolean; facebook: boolean };
    ready: boolean;
  };
  openai: {
    api_key_configured: boolean;
    media_model: string;
    nexus_model: string;
    ready: boolean;
  };
  functions: {
    meta_webhook: string;
    meta_send?: string;
    media_classifier: string;
    nexus_suggest: string;
    partner_portal_invite: string;
  };
};

export type CentralMediaAsset = {
  id: string;
  operation_scope: string;
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  source: string | null;
  source_url: string | null;
  description_ai: string | null;
  search_text: string | null;
  ai_metadata: Record<string, unknown> | null;
  tags: string[];
  contact_id: string | null;
  contact_name: string | null;
  conversation_id: string | null;
  created_at: string;
  signed_url: string | null;
};

export type CentralMediaAssetDetails = CentralMediaAsset & {
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
};


export type CentralAgendaTask = {
  id: string;
  title: string;
  category: string;
  due_at: string;
  due_date: string;
  status: string;
  priority: string;
  operation_scope: string;
  central_contact_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  notes: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

export type CentralAgendaSummary = {
  today_count: number;
  overdue_count: number;
  next_seven_days_count: number;
  completed_month_count: number;
  pending_count: number;
};

export type CentralAgendaSnapshot = {
  summary: CentralAgendaSummary;
  items: CentralAgendaTask[];
};

export type CentralAgendaUser = { id: string; name: string };

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

export type PartnerPortalHealthItem = {
  partner_id: string;
  partner_name: string;
  contact_name: string | null;
  partner_active: boolean;
  profile_id: string | null;
  portal_access_active: boolean | null;
  portal_user_name: string | null;
  portal_username: string | null;
  portal_user_email: string | null;
  profile_active: boolean | null;
  profile_role: string | null;
  last_sign_in_at: string | null;
  health_status: string;
};

export type PartnerPortalHealthSnapshot = {
  summary: { ready: number; attention: number; total: number };
  items: PartnerPortalHealthItem[];
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

export type InventoryReconciliationItem = {
  attention_type: "product" | "location" | string;
  entity_id: string;
  title: string;
  issue_code: string;
  details: Record<string, unknown>;
  review_status: "open" | "reviewing" | "resolved" | string;
  review_notes: string | null;
  review_updated_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
};

export type InventoryReconciliationHistory = {
  id: string;
  attention_type: string;
  entity_id: string;
  issue_code: string;
  review_status: string;
  notes: string | null;
  resolved_at: string | null;
  updated_at: string;
  resolved_by_name: string | null;
};

export type InventoryReconciliationSnapshot = {
  summary: { open: number; reviewing: number; resolved_current: number; total_current: number };
  items: InventoryReconciliationItem[];
  history: InventoryReconciliationHistory[];
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
    const contactResult = await supabase.from("central_contacts").select("id,operation_scope,display_name,phone,email,instagram_username,preferred_channel,notes,supplements_customer_id,fitness_customer_id").eq("id", conversation.contact_id).maybeSingle();
    if (contactResult.error) throw contactResult.error;
    contact = contactResult.data as CentralContact | null;
  }
  return { conversation, contact, messages: (messagesResult.data ?? []) as CentralMessage[] };
}


export async function getCentralIntegrationReadiness(): Promise<CentralIntegrationReadiness | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("central-integration-readiness");
  if (error || !data || typeof data !== "object") return null;
  return data as CentralIntegrationReadiness;
}

export async function getCentralIntegrationHealth(): Promise<CentralIntegrationHealth[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("central_integration_health_snapshot");
  if (error) throw error;
  return Array.isArray(data) ? data as CentralIntegrationHealth[] : [];
}

export async function getCentralGovernanceSnapshot(limit = 100): Promise<CentralGovernanceSnapshot> {
  if (!isSupabaseConfigured) return { audit: [], integrations: [] };
  const supabase = await createClient();
  const [auditResult, integrationResult] = await Promise.all([
    supabase.rpc("central_governance_audit_feed", { p_limit: limit }),
    supabase.rpc("central_integration_health_snapshot"),
  ]);
  if (auditResult.error) throw auditResult.error;
  if (integrationResult.error) throw integrationResult.error;
  return {
    audit: Array.isArray(auditResult.data) ? auditResult.data as CentralGovernanceAuditEvent[] : [],
    integrations: Array.isArray(integrationResult.data) ? integrationResult.data as CentralIntegrationHealth[] : [],
  };
}

export async function getCentralGovernanceSnapshotV2(limit = 150): Promise<CentralGovernanceSnapshotV2> {
  const fallback: CentralGovernanceSnapshotV2 = { audit: [], integrations: [], feature_flags: [], users: { total: 0, active: 0, admins: 0, operators: 0, sales: 0, partners: 0, marketing_access: 0 }, partner_portal: { eligible: 0, active_portals: 0, without_portal: 0 } };
  if (!isSupabaseConfigured) return fallback;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("central_governance_snapshot_v2", { p_limit: limit });
  if (error) throw error;
  return asObject<CentralGovernanceSnapshotV2>(data, fallback);
}

export async function getCentralGlobalSearch(query: string, limit = 80): Promise<CentralSearchResult[]> {
  if (!isSupabaseConfigured || query.trim().length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("central_global_search", { p_query: query.trim(), p_limit: limit });
  if (error) throw error;
  return (data ?? []) as CentralSearchResult[];
}

export async function getCentralAlertsSnapshot(): Promise<CentralAlertsSnapshot> {
  const fallback: CentralAlertsSnapshot = { summary: { total: 0, critical: 0, attention: 0, info: 0 }, items: [] };
  if (!isSupabaseConfigured) return fallback;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("central_alerts_snapshot");
  if (error) throw error;
  return asObject<CentralAlertsSnapshot>(data, fallback);
}

export async function getCentralMediaAssets(
  query = "",
  scope: string | null = null,
  kind: string | null = null,
  aiStatus: string | null = null,
  contactId: string | null = null,
): Promise<CentralMediaAsset[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("central_media_search_v2", {
    p_query: query || null,
    p_scope: scope,
    p_kind: kind,
    p_ai_status: aiStatus,
    p_contact_id: contactId,
    p_limit: 120,
  });
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

export async function getCentralMediaAssetDetails(assetId: string): Promise<CentralMediaAssetDetails | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: asset, error } = await supabase
    .from("central_media_assets")
    .select("id,operation_scope,storage_path,original_filename,mime_type,source,source_url,description_ai,search_text,ai_metadata,width,height,duration_seconds,contact_id,conversation_id,created_at")
    .eq("id", assetId)
    .maybeSingle();
  if (error) throw error;
  if (!asset) return null;
  const [tagsResult, contactResult] = await Promise.all([
    supabase.from("central_media_tags").select("tag").eq("media_asset_id", assetId).order("tag"),
    asset.contact_id ? supabase.from("central_contacts").select("display_name").eq("id", asset.contact_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (tagsResult.error) throw tagsResult.error;
  if (contactResult.error) throw contactResult.error;
  let signedUrl: string | null = null;
  if (asset.storage_path) {
    const signed = await supabase.storage.from("central-media").createSignedUrl(asset.storage_path, 3600);
    signedUrl = signed.data?.signedUrl ?? null;
  }
  return {
    ...(asset as Omit<CentralMediaAssetDetails, "tags" | "contact_name" | "signed_url">),
    tags: (tagsResult.data ?? []).map((row) => row.tag),
    contact_name: contactResult.data?.display_name ?? null,
    signed_url: signedUrl,
  };
}

export async function getCentralAiInsights(limit = 50): Promise<CentralAiInsight[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("central_ai_insights").select("id,operation_scope,contact_id,conversation_id,insight_type,title,content,status,model_name,generated_at").order("generated_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as CentralAiInsight[];
}


export async function getCentralContactDetails(contactId: string): Promise<CentralContactDetails> {
  if (!isSupabaseConfigured) return { contact: null, identities: [], conversations: [] };
  const supabase = await createClient();
  const [contactResult, identitiesResult, conversationsResult] = await Promise.all([
    supabase.from("central_contacts").select("id,operation_scope,display_name,phone,email,instagram_username,preferred_channel,notes,supplements_customer_id,fitness_customer_id").eq("id", contactId).maybeSingle(),
    supabase.from("central_contact_identities").select("id,provider,account_external_id,external_id,username,display_name").eq("contact_id", contactId).order("provider"),
    supabase.from("central_inbox_overview").select("*").eq("contact_id", contactId).order("last_message_at", { ascending: false }).limit(50),
  ]);
  if (contactResult.error) throw contactResult.error;
  if (identitiesResult.error) throw identitiesResult.error;
  if (conversationsResult.error) throw conversationsResult.error;
  return {
    contact: contactResult.data as CentralContact | null,
    identities: (identitiesResult.data ?? []) as CentralContactIdentity[],
    conversations: (conversationsResult.data ?? []) as CentralInboxItem[],
  };
}


export async function getCentralAgendaSnapshot(status: string | null = null, scope: string | null = null): Promise<CentralAgendaSnapshot> {
  const fallback: CentralAgendaSnapshot = { summary: { today_count: 0, overdue_count: 0, next_seven_days_count: 0, completed_month_count: 0, pending_count: 0 }, items: [] };
  if (!isSupabaseConfigured) return fallback;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("central_agenda_snapshot", { p_from: null, p_to: null, p_status: status, p_scope: scope, p_limit: 500 });
  if (error) throw error;
  return asObject<CentralAgendaSnapshot>(data, fallback);
}

export async function getCentralAgendaUsers(): Promise<CentralAgendaUser[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id,full_name,email").eq("active", true).neq("role", "partner").order("full_name");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), name: String(row.full_name || row.email || "Usuário") }));
}

export async function getPartnerPortalDashboard(): Promise<PartnerPortalDashboard | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("partner_portal_dashboard", { p_from: null, p_to: null });
  if (error) throw error;
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

export async function getPartnerPortalHealthSnapshot(): Promise<PartnerPortalHealthSnapshot> {
  const fallback: PartnerPortalHealthSnapshot = { summary: { ready: 0, attention: 0, total: 0 }, items: [] };
  if (!isSupabaseConfigured) return fallback;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("partner_portal_health_snapshot");
  if (error) throw error;
  return asObject<PartnerPortalHealthSnapshot>(data, fallback);
}

export async function getInventoryWorkspaceSnapshot(): Promise<InventoryWorkspaceSnapshot> {
  if (!isSupabaseConfigured) return { summary: null, locations: [], attention: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("inventory_workspace_snapshot");
  if (error) throw error;
  return asObject<InventoryWorkspaceSnapshot>(data, { summary: null, locations: [], attention: [] });
}

export async function getInventoryReconciliationSnapshot(): Promise<InventoryReconciliationSnapshot> {
  const fallback: InventoryReconciliationSnapshot = { summary: { open: 0, reviewing: 0, resolved_current: 0, total_current: 0 }, items: [], history: [] };
  if (!isSupabaseConfigured) return fallback;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("inventory_reconciliation_snapshot");
  if (error) throw error;
  return asObject<InventoryReconciliationSnapshot>(data, fallback);
}

export async function getCentralContacts(limit = 200): Promise<CentralContact[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("central_contacts")
    .select("id,operation_scope,display_name,phone,email,instagram_username,preferred_channel,notes,supplements_customer_id,fitness_customer_id")
    .order("display_name")
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CentralContact[];
}


export async function getCentralTeamMembers(scope: string): Promise<CentralTeamMember[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("central_team_members", { p_scope: scope || "company" });
  if (error) throw error;
  return (data ?? []) as CentralTeamMember[];
}

export async function getCentralQuickReplies(scope: string): Promise<CentralQuickReply[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("central_quick_replies")
    .select("id,operation_scope,title,body,active,sort_order")
    .eq("active", true)
    .in("operation_scope", ["company", scope || "company"])
    .order("sort_order")
    .order("title");
  if (error) throw error;
  return (data ?? []) as CentralQuickReply[];
}

export async function getAllCentralQuickReplies(): Promise<CentralQuickReply[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("central_quick_replies")
    .select("id,operation_scope,title,body,active,sort_order")
    .order("operation_scope")
    .order("sort_order")
    .order("title");
  if (error) throw error;
  return (data ?? []) as CentralQuickReply[];
}


export async function getCentralDailyPriorities(): Promise<CentralDailyPrioritiesSnapshot> {
  const fallback: CentralDailyPrioritiesSnapshot = {
    generated_at: null,
    summary: { tasks: 0, conversations: 0, radar: 0, inventory: 0, partner_attention: 0, integration_attention: 0, total: 0 },
    tasks: [], conversations: [], radar: [], inventory: [],
    partners: { summary: { ready: 0, attention: 0, total: 0 }, items: [] },
    integrations: [],
  };
  if (!isSupabaseConfigured) return fallback;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("central_daily_priorities_snapshot");
  if (error) throw error;
  return asObject<CentralDailyPrioritiesSnapshot>(data, fallback);
}
