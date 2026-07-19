"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!raw) throw new Error("Informe o valor da cobrança.");

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Informe um valor válido maior que zero.");
  }

  return Math.round(parsed * 100) / 100;
}

async function requireBankWriteAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Sessão não encontrada.");

  const { data: canWrite, error: permissionError } = await supabase.rpc("can_write_bank");
  if (permissionError) throw permissionError;
  if (!canWrite) throw new Error("Seu usuário não possui permissão para alterar dados da Candinho Bank.");

  return supabase;
}

export async function createBankCharge(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const dueDate = String(formData.get("due_date") ?? "");
  const origin = String(formData.get("origin") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const amount = parseMoney(formData.get("amount"));

  if (!title) throw new Error("Informe o nome da cobrança.");
  if (!datePattern.test(dueDate)) throw new Error("Informe uma data de vencimento válida.");

  const supabase = await requireBankWriteAccess();
  const { error } = await supabase.rpc("bank_create_charge", {
    p_title: title,
    p_description: description,
    p_amount: amount,
    p_due_date: dueDate,
    p_category: category,
    p_origin: origin,
    p_notes: notes,
  });
  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/cobrancas");
  revalidatePath("/bank/visao-anual");
  redirect("/bank/cobrancas?salvo=criada");
}

export async function markBankChargePaid(formData: FormData) {
  const chargeId = String(formData.get("charge_id") ?? "");
  const paidOn = String(formData.get("paid_on") ?? "");
  const paymentAccountIdRaw = String(formData.get("payment_account_id") ?? "").trim();
  const paymentAccountId = paymentAccountIdRaw || null;

  if (!uuidPattern.test(chargeId)) throw new Error("Cobrança inválida.");
  if (!datePattern.test(paidOn)) throw new Error("Informe uma data de pagamento válida.");
  if (paymentAccountId && !uuidPattern.test(paymentAccountId)) throw new Error("Conta de pagamento inválida.");

  const supabase = await requireBankWriteAccess();

  if (paymentAccountId) {
    const { data: account, error: accountError } = await supabase
      .from("bank_accounts")
      .select("id")
      .eq("id", paymentAccountId)
      .eq("is_active", true)
      .maybeSingle();

    if (accountError) throw accountError;
    if (!account) throw new Error("A conta escolhida para o pagamento não está mais ativa.");
  }

  const { error } = await supabase.rpc("bank_mark_charge_paid", {
    p_charge_id: chargeId,
    p_paid_on: paidOn,
    p_payment_account_id: paymentAccountId,
  });

  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/cobrancas");
  revalidatePath("/bank/visao-anual");
  redirect("/bank/cobrancas?salvo=paga");
}
