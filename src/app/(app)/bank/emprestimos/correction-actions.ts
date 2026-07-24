"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/^R\$/i, "");

  if (!raw) throw new Error("Informe o total pago correto.");

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Informe um total pago válido.");
  }

  return Math.round(parsed * 100) / 100;
}

export async function correctBankDebtTotalPaid(formData: FormData) {
  const debtId = String(formData.get("debt_id") ?? "");
  const totalPaid = parseMoney(formData.get("total_paid"));
  const reason = String(formData.get("reason") ?? "").trim();
  const confirmed =
    String(formData.get("confirm_correction") ?? "") === "yes";

  if (!uuidPattern.test(debtId)) {
    throw new Error("Dívida inválida.");
  }

  if (!confirmed) {
    throw new Error(
      "Confirme que esta é uma correção auditada do histórico.",
    );
  }

  if (reason.length < 5) {
    throw new Error("Explique o motivo da correção.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "bank_correct_debt_total_paid",
    {
      p_debt_id: debtId,
      p_total_paid: totalPaid,
      p_reason: reason,
    },
  );

  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/emprestimos");
  revalidatePath("/bank/visao-anual");
  redirect("/bank/emprestimos?salvo=corrigida");
}
