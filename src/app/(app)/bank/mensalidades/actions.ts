"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!raw) throw new Error("Informe o valor do plano ou mensalidade.");

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Informe um valor válido maior que zero.");
  }

  return Math.round(parsed * 100) / 100;
}

async function requireBankWriteAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Sessão não encontrada.");

  const { data: canWrite, error: permissionError } = await supabase.rpc("can_write_bank");
  if (permissionError) throw permissionError;
  if (!canWrite) {
    throw new Error("Seu usuário não possui permissão para alterar dados da Candinho Bank.");
  }

  return supabase;
}

function parseSubscriptionForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const provider = String(formData.get("provider") ?? "").trim() || null;
  const amount = parseMoney(formData.get("amount"));
  const billingCycle = String(formData.get("billing_cycle") ?? "monthly");
  const billingDayRaw = String(formData.get("billing_day") ?? "").trim();
  const billingDay = billingDayRaw ? Number(billingDayRaw) : null;
  const startsOnRaw = String(formData.get("starts_on") ?? "").trim();
  const endsOnRaw = String(formData.get("ends_on") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const origin = String(formData.get("origin") ?? "").trim() || null;
  const paymentMethodType = String(formData.get("payment_method_type") ?? "card");
  const cardIdRaw = String(formData.get("card_id") ?? "").trim();
  const accountIdRaw = String(formData.get("account_id") ?? "").trim();
  const projectionMode = String(formData.get("projection_mode") ?? "inside_card");
  const includeInProjection = formData.get("include_in_projection") === "on";
  const dueMode = String(formData.get("due_mode") ?? "fixed_day") === "month_only"
    ? "month_only"
    : "fixed_day";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) throw new Error("Informe o nome do plano ou mensalidade.");
  if (!["monthly", "annual", "yearly", "weekly", "custom"].includes(billingCycle)) {
    throw new Error("Ciclo de cobrança inválido.");
  }
  if (billingDay !== null && (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31)) {
    throw new Error("Informe um dia de cobrança entre 1 e 31.");
  }
  if (startsOnRaw && !datePattern.test(startsOnRaw)) throw new Error("Data inicial inválida.");
  if (endsOnRaw && !datePattern.test(endsOnRaw)) throw new Error("Data final inválida.");
  if (startsOnRaw && endsOnRaw && endsOnRaw < startsOnRaw) {
    throw new Error("A data final não pode ser anterior à data inicial.");
  }
  if (!["card", "account", "cash", "other"].includes(paymentMethodType)) {
    throw new Error("Forma de pagamento inválida.");
  }
  if (!["inside_card", "direct_charge", "reference_only"].includes(projectionMode)) {
    throw new Error("Modo de projeção inválido.");
  }

  const cardId = paymentMethodType === "card" && uuidPattern.test(cardIdRaw) ? cardIdRaw : null;
  const accountId = paymentMethodType === "account" && uuidPattern.test(accountIdRaw) ? accountIdRaw : null;

  if (paymentMethodType === "card" && !cardId) {
    throw new Error("Escolha o cartão onde essa mensalidade é cobrada.");
  }
  if (paymentMethodType === "account" && !accountId) {
    throw new Error("Escolha a conta usada para essa mensalidade.");
  }

  return {
    name,
    provider,
    amount,
    billingCycle,
    billingDay,
    startsOn: startsOnRaw || null,
    endsOn: endsOnRaw || null,
    category,
    origin,
    paymentMethodType,
    cardId,
    accountId,
    projectionMode,
    includeInProjection,
    dueMode,
    notes,
  };
}

function revalidateBankSubscriptionPaths() {
  revalidatePath("/bank");
  revalidatePath("/bank/mensalidades");
  revalidatePath("/bank/visao-anual");
  revalidatePath("/bank/organizar");
}

export async function createBankSubscription(formData: FormData) {
  const payload = parseSubscriptionForm(formData);
  const supabase = await requireBankWriteAccess();

  const { error } = await supabase.rpc("bank_create_subscription", {
    p_name: payload.name,
    p_provider: payload.provider,
    p_amount: payload.amount,
    p_billing_cycle: payload.billingCycle,
    p_billing_day: payload.billingDay,
    p_starts_on: payload.startsOn,
    p_ends_on: payload.endsOn,
    p_category: payload.category,
    p_origin: payload.origin,
    p_payment_method_type: payload.paymentMethodType,
    p_card_id: payload.cardId,
    p_account_id: payload.accountId,
    p_include_in_projection: payload.includeInProjection,
    p_projection_mode: payload.projectionMode,
    p_notes: payload.notes,
  });

  if (error) throw error;

  revalidateBankSubscriptionPaths();
  redirect("/bank/mensalidades?salvo=criada");
}

export async function updateBankSubscription(formData: FormData) {
  const subscriptionId = String(formData.get("subscription_id") ?? "");
  if (!uuidPattern.test(subscriptionId)) throw new Error("Mensalidade inválida.");

  const payload = parseSubscriptionForm(formData);
  const supabase = await requireBankWriteAccess();

  const { error } = await supabase.rpc("bank_update_subscription", {
    p_subscription_id: subscriptionId,
    p_name: payload.name,
    p_provider: payload.provider,
    p_amount: payload.amount,
    p_billing_cycle: payload.billingCycle,
    p_billing_day: payload.billingDay,
    p_starts_on: payload.startsOn,
    p_ends_on: payload.endsOn,
    p_category: payload.category,
    p_origin: payload.origin,
    p_payment_method_type: payload.paymentMethodType,
    p_card_id: payload.cardId,
    p_account_id: payload.accountId,
    p_include_in_projection: payload.includeInProjection,
    p_projection_mode: payload.projectionMode,
    p_due_mode: payload.dueMode,
    p_notes: payload.notes,
  });

  if (error) throw error;

  revalidateBankSubscriptionPaths();
  redirect("/bank/mensalidades?salvo=editada");
}

export async function toggleBankSubscription(formData: FormData) {
  const subscriptionId = String(formData.get("subscription_id") ?? "");
  const active = String(formData.get("active") ?? "false") === "true";

  if (!uuidPattern.test(subscriptionId)) throw new Error("Mensalidade inválida.");

  const supabase = await requireBankWriteAccess();
  const { error } = await supabase.rpc("bank_toggle_subscription", {
    p_subscription_id: subscriptionId,
    p_active: active,
  });

  if (error) throw error;

  revalidateBankSubscriptionPaths();
  redirect(`/bank/mensalidades?salvo=${active ? "ativada" : "pausada"}`);
}

export async function resolveBankWeeklyOccurrence(formData: FormData) {
  const subscriptionId = String(formData.get("subscription_id") ?? "");
  const occurrenceOn = String(formData.get("occurrence_on") ?? "");
  const resolution = String(formData.get("resolution") ?? "");

  if (!uuidPattern.test(subscriptionId)) throw new Error("Compromisso semanal inválido.");
  if (!datePattern.test(occurrenceOn)) throw new Error("Semana inválida.");
  if (!['paid', 'skipped'].includes(resolution)) throw new Error("Escolha Paguei ou Não aconteceu.");

  const supabase = await requireBankWriteAccess();
  const { error } = await supabase.rpc("bank_resolve_weekly_subscription_occurrence", {
    p_subscription_id: subscriptionId,
    p_occurrence_on: occurrenceOn,
    p_resolution: resolution,
    p_notes: resolution === "paid"
      ? "Consulta confirmada como paga."
      : "Consulta não realizada nesta semana.",
  });
  if (error) throw error;

  revalidateBankSubscriptionPaths();
  redirect("/bank/mensalidades?salvo=semana-atualizada");
}

export async function clearBankWeeklyOccurrence(formData: FormData) {
  const subscriptionId = String(formData.get("subscription_id") ?? "");
  const occurrenceOn = String(formData.get("occurrence_on") ?? "");

  if (!uuidPattern.test(subscriptionId)) throw new Error("Compromisso semanal inválido.");
  if (!datePattern.test(occurrenceOn)) throw new Error("Semana inválida.");

  const supabase = await requireBankWriteAccess();
  const { error } = await supabase.rpc("bank_clear_weekly_subscription_occurrence", {
    p_subscription_id: subscriptionId,
    p_occurrence_on: occurrenceOn,
  });
  if (error) throw error;

  revalidateBankSubscriptionPaths();
  redirect("/bank/mensalidades?salvo=semana-desfeita");
}
