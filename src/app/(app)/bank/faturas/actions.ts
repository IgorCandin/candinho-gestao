"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const monthPattern = /^\d{4}-\d{2}-01$/;

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!raw) return null;

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Uma das faturas possui um valor inválido.");
  }

  return Math.round(parsed * 100) / 100;
}

export async function saveBankInvoices(formData: FormData) {
  const cardId = String(formData.get("card_id") ?? "");
  const mode = String(formData.get("mode") ?? "individual") === "todas" ? "todas" : "individual";
  const nextCardId = String(formData.get("next_card_id") ?? "");
  const referenceMonths = [...new Set(formData.getAll("reference_month").map(String))];

  if (!uuidPattern.test(cardId)) throw new Error("Cartão inválido para atualização.");
  if (referenceMonths.length !== 12 || referenceMonths.some((month) => !monthPattern.test(month))) {
    throw new Error("A atualização precisa conter exatamente os próximos 12 meses.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Sessão não encontrada.");

  const { data: canWrite, error: permissionError } = await supabase.rpc("can_write_bank");
  if (permissionError) throw permissionError;
  if (!canWrite) throw new Error("Seu usuário não possui permissão para alterar dados da Candinho Bank.");

  const { data: card, error: cardError } = await supabase
    .from("bank_cards")
    .select("id")
    .eq("id", cardId)
    .eq("is_active", true)
    .maybeSingle();
  if (cardError) throw cardError;
  if (!card) throw new Error("Esse cartão não está mais ativo.");

  const filledRows: Array<{
    card_id: string;
    reference_month: string;
    amount: number;
    created_by: string;
    updated_by: string;
  }> = [];
  const blankMonths: string[] = [];

  for (const month of referenceMonths) {
    const amount = parseMoney(formData.get(`amount:${month}`));
    if (amount === null) {
      blankMonths.push(month);
    } else {
      filledRows.push({
        card_id: cardId,
        reference_month: month,
        amount,
        created_by: user.id,
        updated_by: user.id,
      });
    }
  }

  if (filledRows.length > 0) {
    const { error } = await supabase
      .from("bank_card_invoices")
      .upsert(filledRows, { onConflict: "card_id,reference_month" });
    if (error) throw error;
  }

  if (blankMonths.length > 0) {
    const { error } = await supabase
      .from("bank_card_invoices")
      .delete()
      .eq("card_id", cardId)
      .in("reference_month", blankMonths)
      .neq("status", "paid");
    if (error) throw error;
  }

  revalidatePath("/bank");
  revalidatePath("/bank/faturas");
  revalidatePath("/bank/visao-anual");

  if (mode === "todas" && uuidPattern.test(nextCardId)) {
    redirect(`/bank/faturas?acao=atualizar&modo=todas&cartao=${encodeURIComponent(nextCardId)}&salvo=1`);
  }

  redirect("/bank/faturas?salvo=1");
}
