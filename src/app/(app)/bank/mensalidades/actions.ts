"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!raw) throw new Error("Informe o valor do plano ou mensalidade.");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Informe um valor válido maior que zero.");
  return Math.round(parsed * 100) / 100;
}

async function requireBankWriteAccess() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Sessão não encontrada.");
  const { data: canWrite, error: permissionError } = await supabase.rpc("can_write_bank");
  if (permissionError) throw permissionError;
  if (!canWrite) throw new Error("Seu usuário não possui permissão para alterar dados da Candinho Bank.");
  return { supabase, user };
}

export async function createBankSubscription(formData: FormData) {
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
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) throw new Error("Informe o nome do plano ou mensalidade.");
  if (!["monthly", "annual", "weekly", "custom"].includes(billingCycle)) throw new Error("Ciclo de cobrança inválido.");
  if (billingDay !== null && (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31)) throw new Error("Informe um dia de cobrança entre 1 e 31.");
  if (startsOnRaw && !datePattern.test(startsOnRaw)) throw new Error("Data inicial inválida.");
  if (endsOnRaw && !datePattern.test(endsOnRaw)) throw new Error("Data final inválida.");
  if (!["card", "account", "cash", "other"].includes(paymentMethodType)) throw new Error("Forma de pagamento inválida.");
  if (!["inside_card", "direct_charge", "reference_only"].includes(projectionMode)) throw new Error("Modo de projeção inválido.");

  const cardId = paymentMethodType === "card" && uuidPattern.test(cardIdRaw) ? cardIdRaw : null;
  const accountId = paymentMethodType === "account" && uuidPattern.test(accountIdRaw) ? accountIdRaw : null;
  if (paymentMethodType === "card" && !cardId) throw new Error("Escolha o cartão onde essa mensalidade é cobrada.");
  if (paymentMethodType === "account" && !accountId) throw new Error("Escolha a conta usada para essa mensalidade.");

  const { supabase, user } = await requireBankWriteAccess();

  const { error } = await supabase.from("bank_subscriptions").insert({
    name,
    provider,
    amount,
    billing_cycle: billingCycle,
    billing_day: billingDay,
    starts_on: startsOnRaw || null,
    ends_on: endsOnRaw || null,
    category,
    origin,
    payment_method_type: paymentMethodType,
    card_id: cardId,
    account_id: accountId,
    include_in_projection: includeInProjection,
    projection_mode: projectionMode,
    is_active: true,
    notes,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/mensalidades");
  revalidatePath("/bank/visao-anual");
  redirect("/bank/mensalidades?salvo=criada");
}

export async function toggleBankSubscription(formData: FormData) {
  const subscriptionId = String(formData.get("subscription_id") ?? "");
  const active = String(formData.get("active") ?? "false") === "true";
  if (!uuidPattern.test(subscriptionId)) throw new Error("Mensalidade inválida.");

  const { supabase, user } = await requireBankWriteAccess();
  const { error } = await supabase
    .from("bank_subscriptions")
    .update({ is_active: active, updated_by: user.id })
    .eq("id", subscriptionId);
  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/mensalidades");
  revalidatePath("/bank/visao-anual");
  redirect(`/bank/mensalidades?salvo=${active ? "ativada" : "pausada"}`);
}
