export type NexusCommandIntent = "navigate" | "create_task" | "answer";

export type NexusCommandTask = {
  title: string | null;
  due_at: string | null;
  priority: "normal" | "attention" | "urgent" | null;
  operation_scope: "company" | "supplements" | "fitness" | "marketing" | null;
  notes: string | null;
};

export type NexusCommandResult = {
  intent: NexusCommandIntent;
  message: string;
  href: string | null;
  task: NexusCommandTask;
  next_actions: Array<{
    label: string;
    href: string | null;
    reason: string | null;
  }>;
  confidence: string;
  provider?: string;
  model?: string;
  error?: string;
};
