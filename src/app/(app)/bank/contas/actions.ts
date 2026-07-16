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

export async function saveBankBalances(formData: FormData) {
  const balanceDate = String(formData.get("balance_date") ?? "");
  const accountIds = formData.getAll("account_id").map(String);

  if (!datePattern.test(balanceDate)) throw new Error("Informe uma data válida para os saldos.");
  if (accountIds.length === 0 || accountIds.some((id) => !uuidPattern.test(id))) {
    throw new Error("Nenhuma conta válida foi encontrada para atualização.");
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

  const uniqueIds = [...new Set(accountIds)];
  const { data: activeAccounts, error: accountsError } = await supabase
    .from("bank_accounts")
    .select("id")
    .eq("is_active", true)
    .in("id", uniqueIds);
  if (accountsError) throw accountsError;

  const validIds = new Set((activeAccounts ?? []).map((row) => String(row.id)));
  if (validIds.size !== uniqueIds.length) throw new Error("Uma ou mais contas não estão mais ativas.");

  const rows = uniqueIds.map((accountId) => ({
    account_id: accountId,
    balance_date: balanceDate,
    balance: parseMoney(formData.get(`balance:${accountId}`)),
    created_by: user.id,
  }));

  const { error } = await supabase
    .from("bank_balance_snapshots")
    .upsert(rows, { onConflict: "account_id,balance_date" });
  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/contas");
  redirect(`/bank/contas?salvo=1&data=${encodeURIComponent(balanceDate)}`);
}
