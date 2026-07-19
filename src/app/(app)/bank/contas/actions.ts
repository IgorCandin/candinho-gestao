"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!raw) throw new Error("Informe o saldo de todas as contas.");

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) throw new Error("Um dos saldos informados é inválido.");
  return Math.round(parsed * 100) / 100;
}

async function requireBankWriteAccess() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Sessão não encontrada.");

  const { data: canWrite, error: permissionError } = await supabase.rpc("can_write_bank");
  if (permissionError) throw permissionError;
  if (!canWrite) throw new Error("Seu usuário não possui permissão para alterar dados da Candinho Bank.");

  return supabase;
}

export async function saveBankBalances(formData: FormData) {
  const balanceDate = String(formData.get("balance_date") ?? "");
  const accountIds = formData.getAll("account_id").map(String);

  if (!datePattern.test(balanceDate)) throw new Error("Informe uma data válida para os saldos.");
  if (accountIds.length === 0 || accountIds.some((id) => !uuidPattern.test(id))) {
    throw new Error("Nenhuma conta válida foi encontrada para atualização.");
  }

  const uniqueIds = [...new Set(accountIds)];
  const rows = uniqueIds.map((accountId) => ({
    account_id: accountId,
    balance: parseMoney(formData.get(`balance:${accountId}`)),
  }));

  const supabase = await requireBankWriteAccess();
  const { error } = await supabase.rpc("bank_save_balances", {
    p_balance_date: balanceDate,
    p_rows: rows,
  });
  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/contas");
  redirect(`/bank/contas?salvo=1&data=${encodeURIComponent(balanceDate)}`);
}

export async function createBankAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const accountType = String(formData.get("account_type") ?? "bank");
  const origin = String(formData.get("origin") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const displayOrderRaw = String(formData.get("display_order") ?? "0").trim();
  const displayOrder = Number.isFinite(Number(displayOrderRaw)) ? Math.trunc(Number(displayOrderRaw)) : 0;

  if (!name) throw new Error("Informe o nome da conta ou carteira.");
  if (!["bank", "cash", "wallet", "saved", "other"].includes(accountType)) throw new Error("Tipo de conta inválido.");

  const supabase = await requireBankWriteAccess();
  const { error } = await supabase.rpc("bank_create_account", {
    p_name: name,
    p_account_type: accountType,
    p_origin: origin,
    p_notes: notes,
    p_display_order: displayOrder,
  });
  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/contas");
  redirect("/bank/contas?salvo=conta-criada");
}
