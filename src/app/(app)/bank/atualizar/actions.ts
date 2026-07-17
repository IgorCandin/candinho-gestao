"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-\d{2}-01$/;

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error("Um dos valores informados é inválido.");
  return Math.round(parsed * 100) / 100;
}

export async function saveBankQuickUpdate(formData: FormData) {
  const balanceDate = String(formData.get("balance_date") ?? "");
  const referenceMonth = String(formData.get("reference_month") ?? "");
  const accountIds = [...new Set(formData.getAll("account_id").map(String))];
  const cardIds = [...new Set(formData.getAll("card_id").map(String))];

  if (!datePattern.test(balanceDate)) throw new Error("Informe uma data válida para os saldos.");
  if (!monthPattern.test(referenceMonth)) throw new Error("Informe um mês válido para as faturas.");
  if (accountIds.some((id) => !uuidPattern.test(id)) || cardIds.some((id) => !uuidPattern.test(id))) {
    throw new Error("Há uma conta ou cartão inválido na atualização.");
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Sessão não encontrada.");
  const { data: canWrite, error: permissionError } = await supabase.rpc("can_write_bank");
  if (permissionError) throw permissionError;
  if (!canWrite) throw new Error("Seu usuário não possui permissão para alterar dados da Candinho Bank.");

  const balanceRows = accountIds.flatMap((accountId) => {
    const balance = parseMoney(formData.get(`balance:${accountId}`));
    return balance === null ? [] : [{ account_id: accountId, balance_date: balanceDate, balance, created_by: user.id }];
  });
  if (balanceRows.length > 0) {
    const { error } = await supabase.from("bank_balance_snapshots").upsert(balanceRows, { onConflict: "account_id,balance_date" });
    if (error) throw error;
  }

  const invoiceRows = cardIds.flatMap((cardId) => {
    const amount = parseMoney(formData.get(`invoice:${cardId}`));
    if (amount === null) return [];
    return [{
      card_id: cardId,
      reference_month: referenceMonth,
      amount,
      includes_recurring: String(formData.get(`invoice_mode:${cardId}`) ?? "total") !== "installments",
      created_by: user.id,
      updated_by: user.id,
    }];
  });
  if (invoiceRows.length > 0) {
    const { error } = await supabase.from("bank_card_invoices").upsert(invoiceRows, { onConflict: "card_id,reference_month" });
    if (error) throw error;
  }

  revalidatePath("/bank");
  revalidatePath("/bank/atualizar");
  revalidatePath("/bank/contas");
  revalidatePath("/bank/faturas");
  revalidatePath("/bank/visao-anual");
  redirect(`/bank/atualizar?salvo=1&data=${encodeURIComponent(balanceDate)}&mes=${encodeURIComponent(referenceMonth)}`);
}
