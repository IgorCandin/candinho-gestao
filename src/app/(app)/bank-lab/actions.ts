"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { decodeBankFile, parseBankStatement } from "@/lib/bank-statement-parser";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseMoneyInput(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/^R\$/i, "").replace(/\s/g, "");
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error("Informe um valor válido.");
  return Math.round(parsed * 100) / 100;
}

async function writableClient() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Sua sessão expirou. Entre novamente.");
  const { data: canWrite, error } = await supabase.rpc("can_write_bank");
  if (error) throw error;
  if (!canWrite) throw new Error("Seu usuário não pode alterar o Bank.");
  return supabase;
}

function returnToLab(message: string, kind: "ok" | "erro" = "ok") {
  revalidatePath("/bank-lab");
  redirect(`/bank-lab?${kind}=${encodeURIComponent(message)}`);
}

export async function importBankStatement(formData: FormData) {
  const accountId = String(formData.get("account_id") ?? "");
  const file = formData.get("statement_file");
  if (!uuidPattern.test(accountId)) throw new Error("Selecione a conta correta.");
  if (!(file instanceof File) || file.size === 0) throw new Error("Escolha um extrato OFX ou CSV.");
  if (file.size > 5 * 1024 * 1024) throw new Error("O arquivo deve ter no máximo 5 MB.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const parsed = parseBankStatement(file.name, decodeBankFile(bytes));
  if (parsed.transactions.length === 0) throw new Error("Nenhuma movimentação foi encontrada no extrato.");
  if (parsed.transactions.length > 5000) throw new Error("Envie um extrato com até 5.000 movimentações por vez.");

  const occurrences = new Map<string, number>();
  const rows = parsed.transactions.map((transaction) => {
    const normalizedDescription = transaction.description.toLowerCase().replace(/\s+/g, " ").trim();
    const base = [transaction.externalId || "", transaction.date, transaction.amount.toFixed(2), normalizedDescription].join("|");
    const occurrence = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, occurrence);
    return {
      transaction_date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      external_id: transaction.externalId ?? null,
      fingerprint: createHash("sha256").update(`${base}|${occurrence}`).digest("hex"),
    };
  });

  const manualBalance = parseMoneyInput(formData.get("statement_balance"));
  const balance = manualBalance ?? parsed.balance;
  const latestTransactionDate = rows.reduce((latest, row) => row.transaction_date > latest ? row.transaction_date : latest, rows[0].transaction_date);
  const balanceDate = parsed.balanceDate ?? latestTransactionDate;
  const fileHash = createHash("sha256").update(bytes).digest("hex");
  const supabase = await writableClient();
  const { data, error } = await supabase.rpc("bank_lab_import_statement", {
    p_account_id: accountId,
    p_file_name: file.name,
    p_file_hash: fileHash,
    p_statement_balance: balance,
    p_statement_date: balanceDate,
    p_rows: rows,
  });
  if (error) throw error;

  const result = (data ?? {}) as { already_imported?: boolean; imported_rows?: number; duplicate_rows?: number; balance_updated?: boolean };
  if (result.already_imported) returnToLab("Esse mesmo arquivo já havia sido importado. Nada foi duplicado.");
  const balanceMessage = result.balance_updated ? " Saldo atualizado." : " O saldo manual foi preservado.";
  returnToLab(`${result.imported_rows ?? 0} movimentações importadas; ${result.duplicate_rows ?? 0} repetidas ignoradas.${balanceMessage}`);
}

export async function saveLabBalance(formData: FormData) {
  const accountId = String(formData.get("account_id") ?? "");
  const balanceDate = String(formData.get("balance_date") ?? "");
  const balance = parseMoneyInput(formData.get("balance"));
  if (!uuidPattern.test(accountId) || !datePattern.test(balanceDate) || balance === null) {
    throw new Error("Confira a conta, a data e o saldo.");
  }
  const supabase = await writableClient();
  const { error } = await supabase.from("bank_lab_accounts").update({
    current_balance: balance,
    balance_date: balanceDate,
    balance_source: "manual",
    updated_at: new Date().toISOString(),
  }).eq("id", accountId);
  if (error) throw error;
  returnToLab("Saldo alterado manualmente.");
}

export async function addLabTransaction(formData: FormData) {
  const accountId = String(formData.get("account_id") ?? "");
  const transactionDate = String(formData.get("transaction_date") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amount = parseMoneyInput(formData.get("amount"));
  if (!uuidPattern.test(accountId) || !datePattern.test(transactionDate) || !description || !amount) {
    throw new Error("Preencha conta, data, descrição e valor.");
  }
  const supabase = await writableClient();
  const { error } = await supabase.from("bank_lab_transactions").insert({
    account_id: accountId,
    transaction_date: transactionDate,
    description,
    amount,
    category: String(formData.get("category") ?? "").trim() || null,
    source: "manual",
  });
  if (error) throw error;
  returnToLab("Movimentação manual adicionada.");
}

export async function editLabTransaction(formData: FormData) {
  const transactionId = String(formData.get("transaction_id") ?? "");
  const transactionDate = String(formData.get("transaction_date") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amount = parseMoneyInput(formData.get("amount"));
  if (!uuidPattern.test(transactionId) || !datePattern.test(transactionDate) || !description || !amount) {
    throw new Error("Confira os dados da movimentação.");
  }
  const supabase = await writableClient();
  const { error } = await supabase.from("bank_lab_transactions").update({
    transaction_date: transactionDate,
    description,
    amount,
    category: String(formData.get("category") ?? "").trim() || null,
    manually_edited_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", transactionId);
  if (error) throw error;
  returnToLab("Movimentação ajustada manualmente.");
}
