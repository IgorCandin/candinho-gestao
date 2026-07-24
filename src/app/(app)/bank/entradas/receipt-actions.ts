"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const monthPattern = /^\d{4}-\d{2}-01$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseOptionalMoney(value: FormDataEntryValue | null) {
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
    throw new Error("Valor recebido inválido.");
  }

  return Math.round(parsed * 100) / 100;
}

export async function markBankIncomeSourceReceived(formData: FormData) {
  const sourceId = String(formData.get("source_id") ?? "");
  const referenceMonth = String(
    formData.get("reference_month") ?? "",
  );
  const receivedOn = String(
    formData.get("received_on") ?? "",
  );
  const amount = parseOptionalMoney(formData.get("amount"));

  if (!uuidPattern.test(sourceId)) {
    throw new Error("Entrada prevista inválida.");
  }

  if (!monthPattern.test(referenceMonth)) {
    throw new Error("Mês de referência inválido.");
  }

  if (!datePattern.test(receivedOn)) {
    throw new Error("Data de recebimento inválida.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "bank_mark_income_source_received",
    {
      p_source_id: sourceId,
      p_reference_month: referenceMonth,
      p_received_on: receivedOn,
      p_amount: amount,
      p_notes: "Recebimento mensal confirmado pela tela Entradas.",
    },
  );

  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/entradas");
  revalidatePath("/bank/visao-anual");
  redirect("/bank/entradas?salvo=entrada-recebida");
}
