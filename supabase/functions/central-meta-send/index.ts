/* eslint-disable @typescript-eslint/no-explicit-any */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const graphVersion = normalizeText(Deno.env.get("META_GRAPH_API_VERSION"));
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

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const conversationId = normalizeText(payload.conversation_id);
  const body = normalizeText(payload.body);
  if (!conversationId) return json({ error: "Conversa obrigatória" }, 400);
  if (!body) return json({ error: "Digite uma mensagem" }, 400);
  if (body.length > 4096) return json({ error: "A mensagem excede 4096 caracteres" }, 400);

  const { data: conversation, error: conversationError } = await adminClient
    .from("central_conversations")
    .select("id,contact_id,channel_id,operation_scope,status")
    .eq("id", conversationId)
    .single();
  if (conversationError || !conversation) return json({ error: "Conversa não encontrada" }, 404);

  const { data: canWrite, error: writeError } = await userClient.rpc("central_can_write_scope", { p_scope: conversation.operation_scope });
  if (writeError || !canWrite) return json({ error: "Seu usuário não pode responder por esta operação" }, 403);

  const { data: channel, error: channelError } = await adminClient
    .from("central_channels")
    .select("id,provider,account_external_id,account_name,active")
    .eq("id", conversation.channel_id)
    .single();
  if (channelError || !channel) return json({ error: "Canal da conversa não encontrado" }, 404);
  if (!channel.active) return json({ error: "Este canal está desativado" }, 409);

  const provider = String(channel.provider);
  if (!["whatsapp", "instagram", "facebook"].includes(provider)) return json({ error: "Canal ainda não suportado para envio" }, 400);
  if (!graphVersion) return json({ error: "META_GRAPH_API_VERSION não configurado nos Secrets" }, 503);

  const { data: identity, error: identityError } = await adminClient
    .from("central_contact_identities")
    .select("external_id")
    .eq("contact_id", conversation.contact_id)
    .eq("provider", provider)
    .eq("account_external_id", channel.account_external_id)
    .maybeSingle();
  if (identityError || !identity?.external_id) return json({ error: "Identidade externa do contato não encontrada" }, 409);

  const { data: integration } = await adminClient
    .from("central_integrations")
    .select("id,status")
    .eq("provider", provider)
    .eq("account_external_id", channel.account_external_id)
    .maybeSingle();
  if (!integration) return json({ error: "Cadastre esta conta em Integrações antes de responder" }, 409);

  const commonToken = normalizeText(Deno.env.get("META_ACCESS_TOKEN"));
  const token = provider === "whatsapp"
    ? normalizeText(Deno.env.get("META_WHATSAPP_ACCESS_TOKEN")) || commonToken
    : provider === "instagram"
      ? normalizeText(Deno.env.get("META_INSTAGRAM_ACCESS_TOKEN")) || commonToken
      : normalizeText(Deno.env.get("META_FACEBOOK_PAGE_ACCESS_TOKEN")) || commonToken;
  if (!token) {
    const secretName = provider === "whatsapp" ? "META_WHATSAPP_ACCESS_TOKEN" : provider === "instagram" ? "META_INSTAGRAM_ACCESS_TOKEN" : "META_FACEBOOK_PAGE_ACCESS_TOKEN";
    return json({ error: `${secretName} não configurado nos Secrets` }, 503);
  }

  const recipientId = String(identity.external_id);
  const accountId = String(channel.account_external_id);
  let endpoint: string;
  let requestBody: Record<string, unknown>;

  if (provider === "whatsapp") {
    endpoint = `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(accountId)}/messages`;
    requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientId,
      type: "text",
      text: { preview_url: false, body },
    };
  } else if (provider === "instagram") {
    endpoint = `https://graph.instagram.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(accountId)}/messages`;
    requestBody = { recipient: { id: recipientId }, message: { text: body } };
  } else {
    endpoint = `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(accountId)}/messages`;
    requestBody = { recipient: { id: recipientId }, messaging_type: "RESPONSE", message: { text: body } };
  }

  const sentAt = new Date().toISOString();
  let metaResponse: Record<string, unknown> = {};
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const raw = await response.text();
    try { metaResponse = raw ? JSON.parse(raw) : {}; } catch { metaResponse = { raw }; }
    if (!response.ok) {
      const errorMessage = typeof (metaResponse as any)?.error?.message === "string" ? (metaResponse as any).error.message : `Meta API respondeu ${response.status}`;
      await adminClient.from("central_integrations").update({ status: "error", last_error: errorMessage, updated_at: sentAt }).eq("id", integration.id);
      return json({ error: errorMessage, provider }, response.status >= 400 && response.status < 600 ? response.status : 502);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao conectar com a Meta";
    await adminClient.from("central_integrations").update({ status: "error", last_error: message, updated_at: sentAt }).eq("id", integration.id);
    return json({ error: message }, 502);
  }

  const externalMessageId = provider === "whatsapp"
    ? String((Array.isArray((metaResponse as any).messages) ? (metaResponse as any).messages[0]?.id : "") || crypto.randomUUID())
    : String((metaResponse as any).message_id || crypto.randomUUID());

  const { error: insertError } = await adminClient.from("central_messages").upsert({
    conversation_id: conversationId,
    operation_scope: conversation.operation_scope,
    external_message_id: externalMessageId,
    direction: "outbound",
    sender_external_id: accountId,
    message_type: "text",
    body,
    media_external_url: null,
    delivery_status: "sent",
    sent_at: sentAt,
    raw_payload: { provider, response: metaResponse },
    ai_processed: true,
  }, { onConflict: "conversation_id,external_message_id" });
  if (insertError) return json({ error: "Mensagem enviada, mas houve falha ao registrar o histórico" }, 500);

  await Promise.all([
    adminClient.from("central_conversations").update({ status: "open", last_message_at: sentAt, updated_at: sentAt }).eq("id", conversationId),
    adminClient.from("central_integrations").update({ status: "connected", last_error: null, last_sync_at: sentAt, updated_at: sentAt }).eq("id", integration.id),
  ]);

  return json({ sent: true, provider, external_message_id: externalMessageId });
});
