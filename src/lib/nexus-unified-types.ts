export type NexusUnifiedQueueItem = {
  queue_id: string;
  source_id: string;
  source_type:
    | "nexus_signal"
    | "operational_task"
    | "fitness_sale"
    | "fitness_post_sale"
    | "bank_charge"
    | "bank_invoice"
    | "bank_debt";
  operation_scope: string;
  operation_label: string;
  severity: "urgent" | "attention" | "opportunity" | "info";
  score: number;
  title: string;
  summary: string | null;
  href: string;
  due_at: string | null;
  action_mode: "signal_status" | "open";
  metadata: Record<string, unknown>;
};

export type NexusUnifiedQueueSnapshot = {
  generated_at: string;
  items: NexusUnifiedQueueItem[];
  summary: {
    total: number;
    urgent: number;
    attention: number;
    opportunity: number;
    info: number;
    by_operation: Record<string, number>;
    by_severity: Record<string, number>;
  };
};

export function emptyNexusUnifiedQueue(): NexusUnifiedQueueSnapshot {
  return {
    generated_at: new Date().toISOString(),
    items: [],
    summary: {
      total: 0,
      urgent: 0,
      attention: 0,
      opportunity: 0,
      info: 0,
      by_operation: {},
      by_severity: {},
    },
  };
}
