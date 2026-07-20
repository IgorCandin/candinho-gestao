"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const monthPattern = /^\d{4}-\d{2}-01$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function todayInBrazil() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

async function requireBankWriteAccess() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "Sessão não encontrada.",
    );
  }

  const {
    data: canWrite,
    error: permissionError,
  } = await supabase.rpc(
    "can_write_bank",
  );

  if (permissionError)
    throw permissionError;

  if (!canWrite) {
    throw new Error(
      "Seu usuário não possui permissão para alterar dados da Candinho Bank.",
    );
  }

  return supabase;
}

function revalidateBank() {
  revalidatePath("/bank");
  revalidatePath(
    "/bank/atualizar",
  );
  revalidatePath(
    "/bank/cobrancas",
  );
  revalidatePath(
    "/bank/faturas",
  );
  revalidatePath(
    "/bank/emprestimos",
  );
  revalidatePath(
    "/bank/visao-anual",
  );
}

export async function markBankCommitmentAsPaid(
  formData: FormData,
) {
  const commitmentKey = String(
    formData.get(
      "commitment_key",
    ) ?? "",
  ).trim();

  const referenceMonth = String(
    formData.get(
      "reference_month",
    ) ?? "",
  ).trim();

  if (
    !commitmentKey ||
    !commitmentKey.includes(":")
  ) {
    throw new Error(
      "Compromisso inválido.",
    );
  }

  if (
    !monthPattern.test(
      referenceMonth,
    )
  ) {
    throw new Error(
      "Mês de referência inválido.",
    );
  }

  const [kind, id] =
    commitmentKey.split(":");

  if (!uuidPattern.test(id ?? "")) {
    throw new Error(
      "Identificador do compromisso inválido.",
    );
  }

  const supabase =
    await requireBankWriteAccess();

  if (kind === "charge") {
    const { error } =
      await supabase.rpc(
        "bank_mark_charge_paid",
        {
          p_charge_id: id,
          p_paid_on:
            todayInBrazil(),
          p_payment_account_id:
            null,
        },
      );

    if (error) throw error;
  } else if (kind === "invoice") {
    const { error } =
      await supabase.rpc(
        "bank_mark_invoice_paid",
        {
          p_invoice_id: id,
          p_paid_on:
            todayInBrazil(),
        },
      );

    if (error) throw error;
  } else if (kind === "debt") {
    const { error } =
      await supabase.rpc(
        "bank_pay_debt_installment",
        {
          p_debt_id: id,
          p_amount: null,
          p_paid_on:
            todayInBrazil(),
          p_payment_account_id:
            null,
          p_notes:
            "Pagamento confirmado pela Home do Candinho Bank.",
        },
      );

    if (error) throw error;
  } else if (
    kind === "subscription"
  ) {
    const { error } =
      await supabase.rpc(
        "bank_mark_commitment_paid",
        {
          p_commitment_key:
            commitmentKey,
          p_reference_month:
            referenceMonth,
        },
      );

    if (error) throw error;
  } else {
    throw new Error(
      "Tipo de compromisso não suportado.",
    );
  }

  revalidateBank();
}
