import { createClient } from "@/lib/supabase/server";

export type BankFinancialGoal = {
  id: string;
  title: string;
  goalType: "reserve" | "expense";
  category: "health" | "travel" | "purchase" | "bill" | "emergency" | "other";
  targetAmount: number;
  reservedAmount: number;
  expectedSpendMin: number | null;
  expectedSpendMax: number | null;
  dueDate: string | null;
  paymentMethod: string | null;
  priority: "normal" | "attention" | "urgent";
  status: "active" | "completed" | "cancelled";
  notes: string | null;
};

export async function getBankFinancialGoals(): Promise<BankFinancialGoal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("bank_financial_goals").select("id,title,goal_type,category,target_amount,reserved_amount,expected_spend_min,expected_spend_max,due_date,payment_method,priority,status,notes").order("status").order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id), title: String(row.title), goalType: row.goal_type === "expense" ? "expense" : "reserve",
    category: (["health", "travel", "purchase", "bill", "emergency"].includes(String(row.category)) ? row.category : "other") as BankFinancialGoal["category"],
    targetAmount: Number(row.target_amount ?? 0), reservedAmount: Number(row.reserved_amount ?? 0),
    expectedSpendMin: row.expected_spend_min == null ? null : Number(row.expected_spend_min), expectedSpendMax: row.expected_spend_max == null ? null : Number(row.expected_spend_max),
    dueDate: typeof row.due_date === "string" ? row.due_date : null, paymentMethod: typeof row.payment_method === "string" ? row.payment_method : null,
    priority: (["urgent", "attention"].includes(String(row.priority)) ? row.priority : "normal") as BankFinancialGoal["priority"],
    status: (["completed", "cancelled"].includes(String(row.status)) ? row.status : "active") as BankFinancialGoal["status"], notes: typeof row.notes === "string" ? row.notes : null,
  }));
}
