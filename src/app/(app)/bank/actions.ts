"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const monthPattern = /^\d{4}-\d{2}-01$/;

export async function markBankCommitmentAsPaid(formData: FormData) {
  const commitmentKey = String(formData.get("commitment_key") ?? "").trim();
  const referenceMonth = String(formData.get("reference_month") ?? "").trim();

  if (!commitmentKey || !commitmentKey.includes(":")) {
    throw new Error("Compromisso inválido.");
  }
  if (!monthPattern.test(referenceMonth)) {
    throw new Error("Mês de referência inválido.");
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

  const { error } = await supabase
    .from("bank_month_commitment_resolutions")
    .upsert({
      commitment_key: commitmentKey,
      reference_month: referenceMonth,
      resolution: "paid",
      resolved_on: new Date().toISOString().slice(0, 10),
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "commitment_key,reference_month" });

  if (error) throw error;

  // Esta ação só tira o item da fila mensal. O saldo bancário continua sendo
  // atualizado manualmente, como definido para a operação da Candinho Bank.
  revalidatePath("/bank");
}
