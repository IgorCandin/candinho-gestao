"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const monthPattern = /^\d{4}-\d{2}-01$/;

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/^R\$/i, "");

  if (!raw) throw new Error("Informe o valor deste mês.");

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Informe um valor válido igual ou maior que zero.");
  }

  return Math.round(parsed * 100) / 100;
}

export async function adjustBankMonthCommitment(formData: FormData) {
  const commitmentKey = String(
    formData.get("commitment_key") ?? "",
  ).trim();
  const referenceMonth = String(
    formData.get("reference_month") ?? "",
  ).trim();
  const amount = parseMoney(formData.get("amount"));
  const notes =
    String(formData.get("notes") ?? "").trim() || null;

  if (!commitmentKey.includes(":")) {
    throw new Error("Compromisso inválido.");
  }

  if (!monthPattern.test(referenceMonth)) {
    throw new Error("Mês de referência inválido.");
  }

  const supabase = await createClient();
  const { data: canWrite, error: permissionError } =
    await supabase.rpc("can_write_bank");

  if (permissionError) throw permissionError;
  if (!canWrite) {
    throw new Error(
      "Seu usuário não possui permissão para alterar dados da Candinho Bank.",
    );
  }

  const { error } = await supabase.rpc(
    "bank_adjust_month_commitment",
    {
      p_commitment_key: commitmentKey,
      p_reference_month: referenceMonth,
      p_amount: amount,
      p_notes: notes,
    },
  );

  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/visao-anual");
  redirect("/bank?salvo=compromisso-ajustado");
}
