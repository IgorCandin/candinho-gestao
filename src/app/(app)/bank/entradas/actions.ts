"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseMoney(value: FormDataEntryValue | null, label: string, allowBlank = false) {
  const raw = String(value ?? "").trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!raw && allowBlank) return null;
  if (!raw) throw new Error(`Informe ${label}.`);
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Informe ${label} com um valor válido maior que zero.`);
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

export async function createBankIncomeSource(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const payerName = String(formData.get("payer_name") ?? "").trim() || null;
  const amount = parseMoney(formData.get("amount"), "o valor previsto");
  const frequency = String(formData.get("frequency") ?? "monthly");
  const expectedDayRaw = String(formData.get("expected_day") ?? "").trim();
  const expectedDay = expectedDayRaw ? Number(expectedDayRaw) : null;
  const startsOn = String(formData.get("starts_on") ?? "").trim() || null;
  const endsOn = String(formData.get("ends_on") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const origin = String(formData.get("origin") ?? "").trim() || null;
  const isVariable = formData.get("is_variable") === "on";
  const includeInProjection = formData.get("include_in_projection") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) throw new Error("Informe o nome da entrada prevista.");
  if (!["monthly", "annual", "weekly", "custom"].includes(frequency)) throw new Error("Frequência inválida.");
  if (expectedDay !== null && (!Number.isInteger(expectedDay) || expectedDay < 1 || expectedDay > 31)) throw new Error("Informe um dia esperado entre 1 e 31.");
  if (startsOn && !datePattern.test(startsOn)) throw new Error("Data inicial inválida.");
  if (endsOn && !datePattern.test(endsOn)) throw new Error("Data final inválida.");

  const { supabase, user } = await requireBankWriteAccess();
  const { error } = await supabase.from("bank_income_sources").insert({
    name,
    payer_name: payerName,
    amount,
    frequency,
    expected_day: expectedDay,
    starts_on: startsOn,
    ends_on: endsOn,
    category,
    origin,
    is_variable: isVariable,
    include_in_projection: includeInProjection,
    is_active: true,
    notes,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/entradas");
  revalidatePath("/bank/visao-anual");
  redirect("/bank/entradas?salvo=entrada-criada");
}

export async function toggleBankIncomeSource(formData: FormData) {
  const sourceId = String(formData.get("source_id") ?? "");
  const active = String(formData.get("active") ?? "false") === "true";
  if (!uuidPattern.test(sourceId)) throw new Error("Entrada prevista inválida.");

  const { supabase, user } = await requireBankWriteAccess();
  const { error } = await supabase
    .from("bank_income_sources")
    .update({ is_active: active, updated_by: user.id })
    .eq("id", sourceId);
  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/entradas");
  revalidatePath("/bank/visao-anual");
  redirect(`/bank/entradas?salvo=${active ? "entrada-ativada" : "entrada-pausada"}`);
}

export async function createBankReceivable(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const payerName = String(formData.get("payer_name") ?? "").trim() || null;
  const amount = parseMoney(formData.get("amount"), "o valor a receber");
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const origin = String(formData.get("origin") ?? "").trim() || null;
  const incomeSourceIdRaw = String(formData.get("income_source_id") ?? "").trim();
  const incomeSourceId = uuidPattern.test(incomeSourceIdRaw) ? incomeSourceIdRaw : null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!title) throw new Error("Informe o nome da conta a receber.");
  if (!datePattern.test(dueDate)) throw new Error("Informe uma data de vencimento válida.");

  const { supabase, user } = await requireBankWriteAccess();
  const { error } = await supabase.from("bank_receivables").insert({
    title,
    payer_name: payerName,
    description,
    amount,
    received_amount: 0,
    due_date: dueDate,
    status: "pending",
    category,
    origin,
    source_type: incomeSourceId ? "income_source" : "manual",
    source_id: incomeSourceId,
    notes,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/entradas");
  revalidatePath("/bank/visao-anual");
  redirect("/bank/entradas?salvo=receber-criado");
}

export async function receiveBankReceivable(formData: FormData) {
  const receivableId = String(formData.get("receivable_id") ?? "");
  const amount = parseMoney(formData.get("amount"), "o valor recebido", true);
  const receivedOn = String(formData.get("received_on") ?? "").trim();
  const accountIdRaw = String(formData.get("receiving_account_id") ?? "").trim();
  const accountId = uuidPattern.test(accountIdRaw) ? accountIdRaw : null;

  if (!uuidPattern.test(receivableId)) throw new Error("Conta a receber inválida.");
  if (!datePattern.test(receivedOn)) throw new Error("Informe uma data de recebimento válida.");

  const { supabase } = await requireBankWriteAccess();
  const { error } = await supabase.rpc("bank_receive_receivable", {
    p_receivable_id: receivableId,
    p_amount: amount,
    p_received_on: receivedOn,
    p_receiving_account_id: accountId,
  });
  if (error) throw error;

  revalidatePath("/bank");
  revalidatePath("/bank/entradas");
  revalidatePath("/bank/visao-anual");
  redirect("/bank/entradas?salvo=recebido");
}
