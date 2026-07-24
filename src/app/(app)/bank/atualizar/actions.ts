"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/^R\$/i, "");

  if (!raw) return null;

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error("Um dos saldos informados é inválido.");
  }

  return Math.round(parsed * 100) / 100;
}

export async function saveBankQuickUpdate(formData: FormData) {
  const balanceDate = String(
    formData.get("balance_date") ?? "",
  );
  const accountIds = [
    ...new Set(formData.getAll("account_id").map(String)),
  ];

  if (!datePattern.test(balanceDate)) {
    throw new Error("Informe uma data válida para os saldos.");
  }

  if (accountIds.some((id) => !uuidPattern.test(id))) {
    throw new Error("Há uma conta inválida na atualização.");
  }

  const balances = accountIds.flatMap((accountId) => {
    const balance = parseMoney(
      formData.get(`balance:${accountId}`),
    );

    return balance === null
      ? []
      : [{ account_id: accountId, balance }];
  });

  if (balances.length === 0) {
    throw new Error("Informe pelo menos um saldo para atualizar.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Sessão não encontrada.");
  }

  const { data: canWrite, error: permissionError } =
    await supabase.rpc("can_write_bank");

  if (permissionError) throw permissionError;
  if (!canWrite) {
    throw new Error(
      "Seu usuário não possui permissão para alterar dados da Candinho Bank.",
    );
  }

  const { error } = await supabase.rpc("bank_save_balances", {
    p_balance_date: balanceDate,
    p_rows: balances,
  });

  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/atualizar");
  revalidatePath("/bank/contas");
  revalidatePath("/bank/visao-anual");

  redirect(
    `/bank/atualizar?salvo=1&data=${encodeURIComponent(
      balanceDate,
    )}`,
  );
}
