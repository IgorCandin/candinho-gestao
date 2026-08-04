export const BANK_NEXUS_ACTION_TYPES = [
  "set_card_invoice",
  "set_account_balance",
  "mark_income_received",
  "mark_income_pending",
  "postpone_debt",
  "set_subscription_amount",
  "set_income_default_amount",
] as const;

export type BankNexusActionType =
  (typeof BANK_NEXUS_ACTION_TYPES)[number];

export type BankNexusAction = {
  type: BankNexusActionType;
  entity_id: string;
  entity_name: string;
  amount: number | null;
  reference_month: string | null;
  date: string | null;
  label: string;
  before: string | null;
  after: string;
  reason: string;
  requires_attention: boolean;
};

export type BankNexusPlan = {
  reply: string;
  summary: string;
  can_apply: boolean;
  actions: BankNexusAction[];
  warnings: string[];
};

export type BankNexusHistoryItem = {
  id: string;
  summary: string | null;
  status: "applied" | "undone";
  actionCount: number;
  createdAt: string;
  undoneAt: string | null;
};
