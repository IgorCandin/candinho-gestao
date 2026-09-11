"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f-]{36}$/i;
const date = /^\d{4}-\d{2}-\d{2}$/;
function money(value: FormDataEntryValue | null, required = false) {
  const raw = String(value ?? "").trim();
  if (!raw && !required) return null;
  const parsed = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  if (!Number.isFinite(parsed) || parsed < 0 || (required && parsed <= 0)) throw new Error("Revise os valores informados.");
  return Math.round(parsed * 100) / 100;
}
async function writableBank() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão não encontrada.");
  const { data, error } = await supabase.rpc("can_write_bank");
  if (error) throw error;
  if (!data) throw new Error("Seu usuário não pode alterar o Bank.");
  return supabase;
}
export async function createFinancialGoal(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim() || null;
  if (title.length < 2) throw new Error("Informe o nome da pendência.");
  if (dueDate && !date.test(dueDate)) throw new Error("Informe uma data válida.");
  const payload = {
    title, goal_type: formData.get("goal_type") === "expense" ? "expense" : "reserve", category: String(formData.get("category") ?? "other"),
    target_amount: money(formData.get("target_amount"), true), reserved_amount: money(formData.get("reserved_amount")) ?? 0,
    expected_spend_min: money(formData.get("expected_spend_min")), expected_spend_max: money(formData.get("expected_spend_max")), due_date: dueDate,
    payment_method: String(formData.get("payment_method") ?? "").trim() || null, priority: String(formData.get("priority") ?? "normal"), notes: String(formData.get("notes") ?? "").trim() || null,
  };
  const supabase = await writableBank();
  const { error } = await supabase.from("bank_financial_goals").insert(payload);
  if (error) throw error;
  revalidatePath("/bank"); revalidatePath("/bank/objetivos"); redirect("/bank/objetivos?salvo=1");
}
export async function updateFinancialGoal(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!uuid.test(id)) throw new Error("Pendência inválida.");
  const supabase = await writableBank();
  const action = String(formData.get("action") ?? "reserve");
  const values = action === "complete" ? { status: "completed", completed_at: new Date().toISOString() } : { reserved_amount: money(formData.get("reserved_amount")) ?? 0 };
  const { error } = await supabase.from("bank_financial_goals").update(values).eq("id", id);
  if (error) throw error;
  revalidatePath("/bank"); revalidatePath("/bank/objetivos");
}
