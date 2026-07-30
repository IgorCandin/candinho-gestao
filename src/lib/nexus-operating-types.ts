export type NexusSignalSeverity =
  | "urgent"
  | "attention"
  | "opportunity"
  | "info";

export type NexusSignalStatus =
  | "open"
  | "snoozed"
  | "resolved"
  | "dismissed";

export type NexusSignal = {
  id: string;
  fingerprint: string;
  signalType: string;
  severity: NexusSignalSeverity;
  operationScope: string;
  entityType: string | null;
  entityId: string | null;
  customerId: string | null;
  productId: string | null;
  partnerId: string | null;
  title: string;
  summary: string | null;
  rationale: string | null;
  recommendedAction: string | null;
  actionLabel: string | null;
  actionHref: string | null;
  score: number;
  status: NexusSignalStatus;
  snoozedUntil: string | null;
  metadata: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type NexusUsageRoute = {
  route: string;
  visits: number;
  distinctDays: number;
  lastSeenAt: string | null;
};

export type NexusRouteTransition = {
  fromRoute: string;
  toRoute: string;
  transitions: number;
  lastSeenAt: string | null;
};

export type NexusCommercialSnapshot = {
  currentMonthSales: number;
  currentMonthRevenue: number;
  currentMonthProfit: number;
  previousMonthSales: number;
  previousMonthRevenue: number;
  previousMonthProfit: number;
  receivableTotal: number;
  receivableSales: number;
  stockCostValue: number;
  stockSaleValue: number;
  stockPotentialProfit: number;
};

export type NexusAgendaSnapshot = {
  todayCount: number;
  overdueCount: number;
  nextSevenDaysCount: number;
};

export type NexusPostSaleSnapshot = {
  openCount: number;
  overdueCount: number;
  todayCount: number;
  nextSevenDaysCount: number;
};

export type NexusBrief = {
  generatedAt: string;
  signals: NexusSignal[];
  counts: {
    open: number;
    urgent: number;
    attention: number;
    opportunity: number;
    lead: number;
    payment: number;
    delivery: number;
    postSale: number;
    stock: number;
    relationship: number;
  };
  usage: NexusUsageRoute[];
  transitions: NexusRouteTransition[];
  commercial: NexusCommercialSnapshot;
  agenda: NexusAgendaSnapshot;
  postSale: NexusPostSaleSnapshot;
};

export type CustomerRelationship = {
  id: string;
  direction: "outgoing" | "incoming";
  relatedCustomerId: string;
  relatedName: string;
  relationType: string;
  relationLabel: string | null;
  notes: string | null;
  active: boolean;
};

export type CustomerPartnerAffiliation = {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerType: string | null;
  relationType: string;
  relationLabel: string | null;
  countsForPartnership: boolean;
  autoAttributeSales: boolean;
  isPrimary: boolean;
  priority: number;
  validFrom: string | null;
  validUntil: string | null;
  notes: string | null;
  active: boolean;
};

export type AutoPartner = {
  partner_id: string;
  partner_name: string;
  relation_type: string;
  relation_label: string | null;
  affiliation_id: string;
};

export type CustomerNetwork = {
  customerId: string;
  relationships: CustomerRelationship[];
  affiliations: CustomerPartnerAffiliation[];
  autoPartner: AutoPartner | null;
};
