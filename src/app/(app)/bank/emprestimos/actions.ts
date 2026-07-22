"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern =
  /^\d{4}-\d{2}-\d{2}$/;
const monthPattern =
  /^\d{4}-\d{2}$/;

function parseMoney(
  value: FormDataEntryValue | null,
  options?: {
    required?: boolean;
    label?: string;
    allowZero?: boolean;
  },
) {
  const required =
    options?.required ?? true;
  const label =
    options?.label ?? "valor";
  const allowZero =
    options?.allowZero ?? false;

  const raw = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/^R\$/i, "");

  if (!raw) {
    if (!required) return null;
    throw new Error(
      `Informe o ${label}.`,
    );
  }

  const normalized =
    raw.includes(",")
      ? raw
          .replace(/\./g, "")
          .replace(",", ".")
      : raw;

  const parsed = Number(normalized);

  if (
    !Number.isFinite(parsed) ||
    (allowZero
      ? parsed < 0
      : parsed <= 0)
  ) {
    throw new Error(
      `Informe um ${label} válido${
        allowZero
          ? ""
          : " maior que zero"
      }.`,
    );
  }

  return (
    Math.round(parsed * 100) /
    100
  );
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

function revalidateBankDebtPaths() {
  revalidatePath("/bank");
  revalidatePath(
    "/bank/emprestimos",
  );
  revalidatePath(
    "/bank/visao-anual",
  );
}

export async function adjustBankDebtHistory(
  formData: FormData,
) {
  const debtId = String(
    formData.get("debt_id") ??
      "",
  );

  const totalPaid = parseMoney(
    formData.get("total_paid"),
    {
      label: "total já pago",
      allowZero: true,
    },
  );

  const dueMode =
    String(
      formData.get("due_mode") ??
        "fixed_day",
    ) === "month_only"
      ? "month_only"
      : "fixed_day";

  const nextMonth = String(
    formData.get(
      "next_reference_month",
    ) ?? "",
  ).trim();

  const nextDate = String(
    formData.get(
      "next_due_date",
    ) ?? "",
  ).trim();

  const notes =
    String(
      formData.get("notes") ?? "",
    ).trim() || null;

  if (!uuidPattern.test(debtId)) {
    throw new Error(
      "Dívida inválida.",
    );
  }

  let referenceDate: string | null =
    null;

  if (dueMode === "month_only") {
    if (
      nextMonth &&
      !monthPattern.test(
        nextMonth,
      )
    ) {
      throw new Error(
        "Informe um mês de referência válido.",
      );
    }

    referenceDate = nextMonth
      ? `${nextMonth}-01`
      : null;
  } else {
    if (
      nextDate &&
      !datePattern.test(nextDate)
    ) {
      throw new Error(
        "Informe uma data válida.",
      );
    }

    referenceDate =
      nextDate || null;
  }

  const supabase =
    await requireBankWriteAccess();

  const { error } =
    await supabase.rpc(
      "bank_adjust_debt_history",
      {
        p_debt_id: debtId,
        p_total_paid:
          totalPaid ?? 0,
        p_next_reference_date:
          referenceDate,
        p_due_mode: dueMode,
        p_notes: notes,
      },
    );

  if (error) throw error;

  revalidateBankDebtPaths();

  redirect(
    "/bank/emprestimos?salvo=ajustada",
  );
}

export async function createBankDebt(
  formData: FormData,
) {
  const name = String(
    formData.get("name") ?? "",
  ).trim();

  const debtType = String(
    formData.get("debt_type") ??
      "loan",
  );

  const creditorName =
    String(
      formData.get(
        "creditor_name",
      ) ?? "",
    ).trim() || null;

  const originalAmount =
    parseMoney(
      formData.get(
        "original_amount",
      ),
      {
        label: "valor total",
      },
    );

  const monthlyAmount =
    parseMoney(
      formData.get(
        "monthly_amount",
      ),
      {
        required: false,
        label: "valor da parcela",
      },
    );

  const startDateRaw = String(
    formData.get(
      "start_date",
    ) ?? "",
  ).trim();

  const nextDueDateRaw = String(
    formData.get(
      "next_due_date",
    ) ?? "",
  ).trim();

  const origin =
    String(
      formData.get("origin") ?? "",
    ).trim() || null;

  const notes =
    String(
      formData.get("notes") ?? "",
    ).trim() || null;

  if (!name) {
    throw new Error(
      "Informe um nome para a dívida.",
    );
  }

  if (
    !["loan", "note"].includes(
      debtType,
    )
  ) {
    throw new Error(
      "Tipo de dívida inválido.",
    );
  }

  if (
    startDateRaw &&
    !datePattern.test(
      startDateRaw,
    )
  ) {
    throw new Error(
      "Informe uma data inicial válida.",
    );
  }

  if (
    nextDueDateRaw &&
    !datePattern.test(
      nextDueDateRaw,
    )
  ) {
    throw new Error(
      "Informe um próximo vencimento válido.",
    );
  }

  const supabase =
    await requireBankWriteAccess();

  const { error } =
    await supabase.rpc(
      "bank_create_debt",
      {
        p_name: name,
        p_debt_type: debtType,
        p_creditor_name:
          creditorName,
        p_original_amount:
          originalAmount,
        p_monthly_amount:
          monthlyAmount,
        p_start_date:
          startDateRaw || null,
        p_next_due_date:
          nextDueDateRaw || null,
        p_origin: origin,
        p_notes: notes,
      },
    );

  if (error) throw error;

  revalidateBankDebtPaths();

  redirect(
    "/bank/emprestimos?salvo=criada",
  );
}

export async function payBankDebtInstallment(
  formData: FormData,
) {
  const debtId = String(
    formData.get("debt_id") ??
      "",
  );

  const amount = parseMoney(
    formData.get("amount"),
    {
      required: false,
      label:
        "valor do pagamento",
    },
  );

  const paidOn = String(
    formData.get("paid_on") ??
      "",
  ).trim();

  const paymentAccountIdRaw =
    String(
      formData.get(
        "payment_account_id",
      ) ?? "",
    ).trim();

  const paymentAccountId =
    paymentAccountIdRaw || null;

  const notes =
    String(
      formData.get("notes") ?? "",
    ).trim() || null;

  if (!uuidPattern.test(debtId)) {
    throw new Error(
      "Dívida inválida.",
    );
  }

  if (!datePattern.test(paidOn)) {
    throw new Error(
      "Informe uma data de pagamento válida.",
    );
  }

  if (
    paymentAccountId &&
    !uuidPattern.test(
      paymentAccountId,
    )
  ) {
    throw new Error(
      "Conta de pagamento inválida.",
    );
  }

  const supabase =
    await requireBankWriteAccess();

  if (paymentAccountId) {
    const {
      data: account,
      error: accountError,
    } = await supabase
      .from("bank_accounts")
      .select("id")
      .eq(
        "id",
        paymentAccountId,
      )
      .eq("is_active", true)
      .maybeSingle();

    if (accountError)
      throw accountError;

    if (!account) {
      throw new Error(
        "A conta escolhida para o pagamento não está mais ativa.",
      );
    }
  }

  const { error } =
    await supabase.rpc(
      "bank_pay_debt_installment",
      {
        p_debt_id: debtId,
        p_amount: amount,
        p_paid_on: paidOn,
        p_payment_account_id:
          paymentAccountId,
        p_notes: notes,
      },
    );

  if (error) throw error;

  revalidateBankDebtPaths();

  redirect(
    "/bank/emprestimos?salvo=paga",
  );
}

export async function postponeBankDebtPayment(
  formData: FormData,
) {
  const debtId = String(
    formData.get("debt_id") ??
      "",
  );

  const notes =
    String(
      formData.get("notes") ?? "",
    ).trim() || null;

  if (!uuidPattern.test(debtId)) {
    throw new Error(
      "Dívida inválida.",
    );
  }

  const supabase =
    await requireBankWriteAccess();

  const { error } =
    await supabase.rpc(
      "bank_postpone_debt_payment",
      {
        p_debt_id: debtId,
        p_notes: notes,
      },
    );

  if (error) throw error;

  revalidateBankDebtPaths();

  redirect(
    "/bank/emprestimos?salvo=adiada",
  );
}
