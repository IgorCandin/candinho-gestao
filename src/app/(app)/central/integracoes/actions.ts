"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const providers = new Set(["whatsapp", "instagram", "facebook"]);
const scopes = new Set(["company", "supplements", "fitness", "marketing"]);

export async function registerCentralIntegration(formData: FormData) {
  const provider = String(formData.get("provider") ?? "").trim().toLowerCase();
  const operationScope = String(formData.get("operation_scope") ?? "company").trim().toLowerCase();
  const accountExternalId = String(formData.get("account_external_id") ?? "").trim();
  const accountName = String(formData.get("account_name") ?? "").trim() || null;

  if (!providers.has(provider)) throw new Error("Canal inválido.");
  if (!scopes.has(operationScope)) throw new Error("Operação inválida.");
  if (!accountExternalId) throw new Error("Informe o ID externo da conta.");
  if (accountExternalId.length > 180) throw new Error("O ID externo informado é muito longo.");
  if (accountName && accountName.length > 180) throw new Error("O nome da conta informado é muito longo.");

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Sessão não encontrada.");

  const { data: access, error: accessError } = await supabase.rpc("get_my_access_v2");
  if (accessError) throw accessError;
  const row = Array.isArray(access) ? access[0] : access;
  if (!row || !(row.role === "admin" || row.can_manage_users)) {
    throw new Error("Seu usuário não possui permissão para gerenciar integrações.");
  }

  const { error } = await supabase.rpc("central_register_integration", {
    p_provider: provider,
    p_operation_scope: operationScope,
    p_account_external_id: accountExternalId,
    p_account_name: accountName,
    p_status: "disconnected",
    p_settings: {},
  });
  if (error) throw error;

  revalidatePath("/central");
  revalidatePath("/central/integracoes");
  redirect(`/central/integracoes?salvo=${encodeURIComponent(provider)}`);
}
