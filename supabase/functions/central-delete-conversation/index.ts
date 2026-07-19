import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Configuração interna indisponível" }, 503);

  const authHeader = req.headers.get("authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Não autenticado" }, 401);

  let body: { conversation_id?: string };
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const conversationId = text(body.conversation_id);
  if (!conversationId) return json({ error: "conversation_id é obrigatório" }, 400);

  const { data: conversation, error: conversationError } = await userClient
    .from("central_conversations")
    .select("id,operation_scope")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError || !conversation) return json({ error: "Conversa não encontrada ou sem permissão" }, 404);

  const { data: canWrite, error: permissionError } = await userClient.rpc("central_can_write_scope", {
    p_scope: conversation.operation_scope,
  });

  if (permissionError || !canWrite) return json({ error: "Sem permissão para excluir esta conversa" }, 403);

  const [{ data: messageMedia }, { data: linkedMedia }] = await Promise.all([
    adminClient
      .from("central_messages")
      .select("media_storage_path")
      .eq("conversation_id", conversationId)
      .not("media_storage_path", "is", null),
    adminClient
      .from("central_media_assets")
      .select("id,storage_path,source")
      .eq("conversation_id", conversationId),
  ]);

  // Só limpa arquivos que pertencem ao próprio fluxo de conversa.
  // Materiais da biblioteca ligados manualmente ao contato/conversa são preservados.
  const deletableAssets = (linkedMedia ?? []).filter((item: any) =>
    String(item.source ?? "").startsWith("whatsapp_")
  );

  const paths = Array.from(new Set([
    ...(messageMedia ?? []).map((item: any) => item.media_storage_path),
    ...deletableAssets.map((item: any) => item.storage_path),
  ].filter((value): value is string => typeof value === "string" && Boolean(value))));

  if (paths.length) {
    const storageDelete = await adminClient.storage.from("central-media").remove(paths);
    if (storageDelete.error) console.error("Falha ao limpar arquivos da conversa", storageDelete.error);
  }

  if (deletableAssets.length) {
    const ids = deletableAssets.map((item: any) => item.id).filter(Boolean);
    if (ids.length) {
      const assetDelete = await adminClient.from("central_media_assets").delete().in("id", ids);
      if (assetDelete.error) console.error("Falha ao limpar registros de mídia", assetDelete.error);
    }
  }

  // central_messages e central_ai_insights são removidos por CASCADE.
  // central_media_assets que não pertencem ao WhatsApp são apenas desvinculados (SET NULL).
  const { error: deleteError } = await adminClient
    .from("central_conversations")
    .delete()
    .eq("id", conversationId);

  if (deleteError) return json({ error: "Não foi possível excluir o histórico local da conversa" }, 500);

  return json({
    deleted: true,
    whatsapp_untouched: true,
    note: "O histórico local foi removido. Uma nova mensagem do contato recriará a conversa no Inbox.",
  });
});
