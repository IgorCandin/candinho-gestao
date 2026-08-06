export type NexusDailySignal = {
  id: string;
  signal_type: string;
  severity: "urgent" | "attention" | "opportunity" | "info";
  title: string;
  summary: string | null;
  recommended_action: string | null;
  action_label: string | null;
  action_href: string | null;
  score: number;
  customer_id: string | null;
  product_id: string | null;
  partner_id: string | null;
  metadata: Record<string, unknown>;
};

export type NexusContextShortcut = {
  from_route: string;
  to_route: string;
  transitions_30d: number;
  transitions_7d: number;
  distinct_days: number;
  confidence: number;
  last_seen_at: string | null;
};

export type NexusRepeatedWorkflow = {
  step1: string;
  step2: string;
  step3: string;
  repetitions: number;
  distinct_days: number;
  last_seen_at: string | null;
};

export type NexusUsageHabit = {
  route: string;
  operation_scope: string;
  visits_30d: number;
  visits_7d: number;
  distinct_days: number;
  last_seen_at: string | null;
  avg_duration_seconds: number;
};

export type NexusActionHistoryItem = {
  id: string;
  action_kind: string;
  title: string;
  summary: string | null;
  status: string;
  source_route: string | null;
  created_at: string;
  executed_at: string | null;
  result: Record<string, unknown> | null;
};

export type NexusDailySnapshot = {
  generated_at: string;
  route: string;
  next_action: NexusDailySignal | null;
  queue: NexusDailySignal[];
  shortcuts: NexusContextShortcut[];
  workflows: NexusRepeatedWorkflow[];
  usage: NexusUsageHabit[];
  action_history: NexusActionHistoryItem[];
  stats: {
    events_30d: number;
    active_days_30d: number;
    learned_routes: number;
    repeated_workflows: number;
    contextual_shortcuts: number;
  };
};

export type NexusActionKind =
  | "signal_status"
  | "schedule_customer_followup"
  | "create_operational_task";

export type NexusActionPlanPreview = {
  headline: string;
  description: string | null;
  changes: string[];
  reversible: boolean;
  expires_in_minutes: number;
};

export type NexusPreparedAction = {
  plan_id: string;
  status: "preview";
  action_kind: NexusActionKind;
  title: string;
  summary: string | null;
  preview: NexusActionPlanPreview;
  expires_at: string;
};

export type NexusExecutedAction = {
  plan_id: string;
  status: "executed";
  action_kind: NexusActionKind;
  title: string;
  result: Record<string, unknown>;
};

export function emptyNexusDailySnapshot(route = "/suplementos"): NexusDailySnapshot {
  return {
    generated_at: new Date().toISOString(),
    route,
    next_action: null,
    queue: [],
    shortcuts: [],
    workflows: [],
    usage: [],
    action_history: [],
    stats: {
      events_30d: 0,
      active_days_30d: 0,
      learned_routes: 0,
      repeated_workflows: 0,
      contextual_shortcuts: 0,
    },
  };
}
