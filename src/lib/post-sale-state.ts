export type PostSaleTiming = "overdue" | "today" | "upcoming" | "completed" | "cancelled";

// A terminal status wins over an old due date: it must never reopen a contact.
export function postSaleTiming(row: { status: string | null; due_on: string | null }, today: string): PostSaleTiming {
  if (row.status === "cancelled") return "cancelled";
  if (row.status === "completed") return "completed";
  if (!row.due_on) return "upcoming";
  const due = row.due_on.slice(0, 10);
  if (due < today) return "overdue";
  return due === today ? "today" : "upcoming";
}
