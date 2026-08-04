"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const monthPattern = /^\d{4}-\d{2}-01$/;

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

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Uma das faturas possui valor inválido.");
  }

  return Math.round(parsed * 100) / 100;
}

async function requireBankWriteAccess() {
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

  return supabase;
}

export async function saveCurrentMonthInvoices(formData: FormData) {
  const referenceMonth = String(
    formData.get("reference_month") ?? "",
  );

  if (!monthPattern.test(referenceMonth)) {
    throw new Error("Mês de referência inválido.");
  }

  const cardIds = [
    ...new Set(formData.getAll("card_id").map(String)),
  ].filter((id) => uuidPattern.test(id));

  if (cardIds.length === 0) {
    throw new Error("Nenhum cartão válido foi encontrado.");
  }

  const supabase = await requireBankWriteAccess();

  for (const cardId of cardIds) {
    const amount = parseMoney(formData.get(`amount:${cardId}`));

    // Campo vazio = não mexe naquele cartão.
    if (amount === null) continue;

    const { error } = await supabase.rpc("bank_save_card_invoices", {
      p_card_id: cardId,
      p_rows: [
        {
          reference_month: referenceMonth,
          amount,
          includes_recurring: true,
        },
      ],
      p_blank_months: [],
    });

    if (error) throw error;
  }

  revalidatePath("/bank");
  revalidatePath("/bank/faturas");
  revalidatePath("/bank/faturas/rapido");
  revalidatePath("/bank/visao-anual");

  redirect("/bank/faturas/rapido?salvo=1");
}
