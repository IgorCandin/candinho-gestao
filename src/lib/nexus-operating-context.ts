import { createClient } from "@/lib/supabase/server";
import type {
  CustomerNetwork,
  CustomerPartnerAffiliation,
  CustomerRelationship,
  NexusBrief,
  NexusSignal,
} from "@/lib/nexus-operating-types";

const num = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const str = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;

const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

function normalizeSignal(value: unknown): NexusSignal {
  const row = obj(value);

  return {
    id: String(row.id ?? ""),
    fingerprint: String(row.fingerprint ?? ""),
    signalType: String(row.signal_type ?? "info"),
    severity: (["urgent", "attention", "opportunity", "info"] as const).includes(
      row.severity as "urgent" | "attention" | "opportunity" | "info",
    )
      ? (row.severity as NexusSignal["severity"])
      : "info",
    operationScope: String(row.operation_scope ?? "supplements"),
    entityType: str(row.entity_type),
    entityId: str(row.entity_id),
    customerId: str(row.customer_id),
    productId: str(row.product_id),
    partnerId: str(row.partner_id),
    title: String(row.title ?? "Sinal do Nexus"),
    summary: str(row.summary),
    rationale: str(row.rationale),
    recommendedAction: str(row.recommended_action),
    actionLabel: str(row.action_label),
    actionHref: str(row.action_href),
    score: num(row.score),
    status: (["open", "snoozed", "resolved", "dismissed"] as const).includes(
      row.status as "open" | "snoozed" | "resolved" | "dismissed",
    )
      ? (row.status as NexusSignal["status"])
      : "open",
    snoozedUntil: str(row.snoozed_until),
    metadata: obj(row.metadata),
    firstSeenAt: String(row.first_seen_at ?? ""),
    lastSeenAt: String(row.last_seen_at ?? ""),
  };
}

function emptyBrief(): NexusBrief {
  return {
    generatedAt: new Date().toISOString(),
    signals: [],
    counts: {
      open: 0,
      urgent: 0,
      attention: 0,
      opportunity: 0,
      lead: 0,
      payment: 0,
      delivery: 0,
      postSale: 0,
      stock: 0,
      relationship: 0,
    },
    usage: [],
    transitions: [],
    commercial: {
      currentMonthSales: 0,
      currentMonthRevenue: 0,
      currentMonthProfit: 0,
      previousMonthSales: 0,
      previousMonthRevenue: 0,
      previousMonthProfit: 0,
      receivableTotal: 0,
      receivableSales: 0,
      stockCostValue: 0,
      stockSaleValue: 0,
      stockPotentialProfit: 0,
    },
    agenda: {
      todayCount: 0,
      overdueCount: 0,
      nextSevenDaysCount: 0,
    },
    postSale: {
      openCount: 0,
      overdueCount: 0,
      todayCount: 0,
      nextSevenDaysCount: 0,
    },
  };
}

export async function getNexusBrief({
  refresh = false,
  signalLimit = 30,
}: {
  refresh?: boolean;
  signalLimit?: number;
} = {}): Promise<NexusBrief> {
  const supabase = await createClient();

  if (refresh) {
    // Pipeline central: gera sinais, reduz ruído histórico e aplica retenção da telemetria.
    // É best-effort; perfis somente-leitura ainda podem ver o último snapshot.
    await supabase.rpc("refresh_nexus_operating_layer_v2");
  }

  const [
    signalResult,
    usageResult,
    transitionResult,
    commercialResult,
    agendaResult,
    postSaleResult,
  ] = await Promise.all([
    supabase
      .from("nexus_signals")
      .select("*")
      .eq("operation_scope", "supplements")
      .eq("status", "open")
      .order("score", { ascending: false })
      .order("last_seen_at", { ascending: false })
      .limit(Math.max(signalLimit, 200)),
    supabase.rpc("get_nexus_usage_summary_v1", { p_days: 30 }),
    supabase.rpc("get_nexus_route_transitions_v1", { p_days: 30 }),
    supabase.from("commercial_dashboard_summary").select("*").maybeSingle(),
    supabase.from("operational_agenda_summary").select("*").maybeSingle(),
    supabase.from("post_sale_batch_summary").select("*").maybeSingle(),
  ]);

  const brief = emptyBrief();

  const allSignals = !signalResult.error
    ? (signalResult.data ?? []).map(normalizeSignal)
    : [];

  brief.signals = allSignals.slice(0, signalLimit);

  for (const signal of allSignals) {
    brief.counts.open += 1;
    if (signal.severity === "urgent") brief.counts.urgent += 1;
    if (signal.severity === "attention") brief.counts.attention += 1;
    if (signal.severity === "opportunity") brief.counts.opportunity += 1;
    if (signal.signalType === "lead_followup") brief.counts.lead += 1;
    if (signal.signalType === "payment_due") brief.counts.payment += 1;
    if (signal.signalType === "delivery_due") brief.counts.delivery += 1;
    if (signal.signalType === "post_sale") brief.counts.postSale += 1;
    if (["stockout", "stock_lead_opportunity"].includes(signal.signalType)) {
      brief.counts.stock += 1;
    }
    if (signal.signalType === "relationship_review") {
      brief.counts.relationship += 1;
    }
  }

  if (!usageResult.error) {
    brief.usage = (usageResult.data ?? []).map((value) => {
      const row = obj(value);
      return {
        route: String(row.route ?? "/"),
        visits: num(row.visits),
        distinctDays: num(row.distinct_days),
        lastSeenAt: str(row.last_seen_at),
      };
    });
  }

  if (!transitionResult.error) {
    brief.transitions = (transitionResult.data ?? []).map((value) => {
      const row = obj(value);
      return {
        fromRoute: String(row.from_route ?? "/"),
        toRoute: String(row.to_route ?? "/"),
        transitions: num(row.transitions),
        lastSeenAt: str(row.last_seen_at),
      };
    });
  }

  const commercial = obj(commercialResult.data);
  brief.commercial = {
    currentMonthSales: num(commercial.current_month_sales),
    currentMonthRevenue: num(commercial.current_month_revenue),
    currentMonthProfit: num(commercial.current_month_profit),
    previousMonthSales: num(commercial.previous_month_sales),
    previousMonthRevenue: num(commercial.previous_month_revenue),
    previousMonthProfit: num(commercial.previous_month_profit),
    receivableTotal: num(commercial.receivable_total),
    receivableSales: num(commercial.receivable_sales),
    stockCostValue: num(commercial.stock_cost_value),
    stockSaleValue: num(commercial.stock_sale_value),
    stockPotentialProfit: num(commercial.stock_potential_profit),
  };

  const agenda = obj(agendaResult.data);
  brief.agenda = {
    todayCount: num(agenda.today_count),
    overdueCount: num(agenda.overdue_count),
    nextSevenDaysCount: num(agenda.next_seven_days_count),
  };

  const postSale = obj(postSaleResult.data);
  brief.postSale = {
    openCount: num(postSale.open_count),
    overdueCount: num(postSale.overdue_count),
    todayCount: num(postSale.today_count),
    nextSevenDaysCount: num(postSale.next_seven_days_count),
  };

  brief.generatedAt = new Date().toISOString();
  return brief;
}

export async function getCustomerNetworkContext(
  customerId: string,
): Promise<CustomerNetwork> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_customer_network_v1", {
    p_customer_id: customerId,
  });

  if (error) throw error;

  const source = obj(data);
  const relationships = Array.isArray(source.relationships)
    ? source.relationships
    : [];
  const affiliations = Array.isArray(source.affiliations)
    ? source.affiliations
    : [];
  const autoPartner = obj(source.auto_partner);

  return {
    customerId,
    relationships: relationships.map((value): CustomerRelationship => {
      const row = obj(value);
      return {
        id: String(row.id ?? ""),
        direction: row.direction === "incoming" ? "incoming" : "outgoing",
        relatedCustomerId: String(row.related_customer_id ?? ""),
        relatedName: String(row.related_name ?? "Cliente"),
        relationType: String(row.relation_type ?? "other"),
        relationLabel: str(row.relation_label),
        notes: str(row.notes),
        active: row.active !== false,
      };
    }),
    affiliations: affiliations.map((value): CustomerPartnerAffiliation => {
      const row = obj(value);
      return {
        id: String(row.id ?? ""),
        partnerId: String(row.partner_id ?? ""),
        partnerName: String(row.partner_name ?? "Parceiro"),
        partnerType: str(row.partner_type),
        relationType: String(row.relation_type ?? "client_of_partner"),
        relationLabel: str(row.relation_label),
        countsForPartnership: row.counts_for_partnership !== false,
        autoAttributeSales: row.auto_attribute_sales !== false,
        isPrimary: row.is_primary === true,
        priority: num(row.priority),
        validFrom: str(row.valid_from),
        validUntil: str(row.valid_until),
        notes: str(row.notes),
        active: row.active !== false,
      };
    }),
    autoPartner:
      source.auto_partner && autoPartner.partner_id
        ? {
            partner_id: String(autoPartner.partner_id),
            partner_name: String(autoPartner.partner_name ?? "Parceiro"),
            relation_type: String(autoPartner.relation_type ?? "client_of_partner"),
            relation_label: str(autoPartner.relation_label),
            affiliation_id: String(autoPartner.affiliation_id ?? ""),
          }
        : null,
  };
}
