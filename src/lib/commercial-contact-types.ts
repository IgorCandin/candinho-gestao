export type CommercialContactSourceType = "lead" | "repurchase";
export type CommercialContactStage = "contact" | "response_check";

export type CommercialContactContext = {
  queue_key: string;
  source_type: CommercialContactSourceType;
  source_id: string;
  customer_id: string;
  customer_name: string;
  phone: string | null;
  city: string | null;
  product_id: string | null;
  product_name: string;
  stock_quantity: number;
  reason: string;
  stage: CommercialContactStage;
  priority_rank: number;
  reference_on: string | null;
  eligible_on: string | null;
  last_action: string | null;
  last_attempt_at: string | null;
  last_purchase_on: string | null;
  estimated_due_on: string | null;
  lead_status: string | null;
  reference: string | null;
  source_notes: string | null;
  href: string;
  source_created_at: string;
};

export type CommercialContactQueueItem = CommercialContactContext & {
  context_count?: number;
  contexts?: CommercialContactContext[];
};

export type CommercialContactQueueSnapshot = {
  today: string;
  goal: number;
  contacted_today: number;
  remaining: number;
  completed: boolean;
  total_eligible: number;
  total_contexts?: number;
  lead_eligible: number;
  repurchase_eligible: number;
  items: CommercialContactQueueItem[];
  skipped?: boolean;
  reason?: string;
};

export function emptyCommercialContactQueue(
  today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
): CommercialContactQueueSnapshot {
  return {
    today,
    goal: 12,
    contacted_today: 0,
    remaining: 12,
    completed: false,
    total_eligible: 0,
    total_contexts: 0,
    lead_eligible: 0,
    repurchase_eligible: 0,
    items: [],
  };
}
