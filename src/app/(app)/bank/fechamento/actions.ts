"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function closeBankMonth(formData: FormData) {
  const referenceMonthRaw = String(formData.get("reference_month") ?? "");
  const referenceMonth = /^\d{4}-\d{2}$/.test(referenceMonthRaw) ? `${referenceMonthRaw}-01` : referenceMonthRaw;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!/^\d{4}-\d{2}-01$/.test(referenceMonth)) throw new Error("Informe um mês válido.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("bank_close_month", { p_reference_month: referenceMonth, p_notes: notes });
  if (error) throw error;
  revalidatePath("/bank"); revalidatePath("/bank/fechamento");
  redirect(`/bank/fechamento?salvo=1&mes=${encodeURIComponent(referenceMonth)}`);
}
