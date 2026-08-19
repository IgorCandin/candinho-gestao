/* eslint-disable @typescript-eslint/no-explicit-any */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
function normalizeText(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function normalizeWhatsAppNumber(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!digits.startsWith("55") || (digits.length !== 12 && digits.length !== 13)) return "";
  return digits;
}
function safeFilename(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "arquivo";
}
function mediaKind(mime: string) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const graphVersion = normalizeText(Deno.env.get("META_GRAPH_API_VERSION"));
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Configuração interna indisponível" }, 503);

  const authHeader = req.headers.get("authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Não autenticado" }, 401);

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const conversationId = normalizeText(payload.conversation_id);
  const body = normalizeText(payload.body);
  const mediaStoragePath = normalizeText(payload.media_storage_path);
  const mediaMimeType = normalizeText(payload.media_mime_type);
  const mediaFilename = safeFilename(normalizeText(payload.media_filename) || "arquivo");

  if (!conversationId) return json({ error: "Conversa obrigatória" }, 400);
  if (!body && !mediaStoragePath) return json({ error: "Digite uma mensagem ou anexe um arquivo" }, 400);
  if (body.length > 4096) return json({ error: "A mensagem excede 4096 caracteres" }, 400);

  const { data: conversation, error: conversationError } = await adminClient.from("central_conversations").select("id,contact_id,channel_id,operation_scope,status").eq("id", conversationId).single();
  if (conversationError || !conversation) return json({ error: "Conversa não encontrada" }, 404);

  const { data: canWrite, error: writeError } = await userClient.rpc("central_can_write_scope", { p_scope: conversation.operation_scope });
  if (writeError || !canWrite) return json({ error: "Seu usuário não pode responder por esta operação" }, 403);

  const { data: channel, error: channelError } = await adminClient.from("central_channels").select("id,provider,account_external_id,account_name,active").eq("id", conversation.channel_id).single();
  if (channelError || !channel) return json({ error: "Canal da conversa não encontrado" }, 404);
  if (!channel.active) return json({ error: "Este canal está desativado" }, 409);

  const provider = String(channel.provider);
  if (!["whatsapp", "instagram", "facebook"].includes(provider)) return json({ error: "Canal ainda não suportado para envio" }, 400);
  if (!graphVersion) return json({ error: "META_GRAPH_API_VERSION não configurado nos Secrets" }, 503);
  if (mediaStoragePath && provider !== "whatsapp") return json({ error: "Nesta versão, anexos pelo Inbox estão disponíveis para WhatsApp." }, 400);

  const { data: identity, error: identityError } = await adminClient.from("central_contact_identities").select("external_id").eq("contact_id", conversation.contact_id).eq("provider", provider).eq("account_external_id", channel.account_external_id).maybeSingle();
  if (identityError || !identity?.external_id) return json({ error: "Identidade externa do contato não encontrada" }, 409);

  const { data: integration } = await adminClient.from("central_integrations").select("id,status").eq("provider", provider).eq("account_external_id", channel.account_external_id).maybeSingle();
  if (!integration) return json({ error: "Cadastre esta conta em Integrações antes de responder" }, 409);
  if (integration.status !== "connected") return json({ error: "Esta integração está desconectada. Reconecte-a antes de enviar mensagens pelo Inbox." }, 409);

  const commonToken = normalizeText(Deno.env.get("META_ACCESS_TOKEN"));
  const token = provider === "whatsapp"
    ? normalizeText(Deno.env.get("META_WHATSAPP_ACCESS_TOKEN")) || commonToken
    : provider === "instagram"
      ? normalizeText(Deno.env.get("META_INSTAGRAM_ACCESS_TOKEN")) || commonToken
      : normalizeText(Deno.env.get("META_FACEBOOK_PAGE_ACCESS_TOKEN")) || commonToken;
  if (!token) return json({ error: "Token do canal não configurado nos Secrets" }, 503);

  const recipientId = provider === "whatsapp" ? normalizeWhatsAppNumber(identity.external_id) : String(identity.external_id);
  if (!recipientId) return json({ error: "Número de WhatsApp inválido" }, 409);

  const accountId = String(channel.account_external_id);
  const endpoint = provider === "instagram"
    ? `https://graph.instagram.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(accountId)}/messages`
    : `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(accountId)}/messages`;

  let requestBody: Record<string, unknown>;
  let storedMessageType = "text";

  if (mediaStoragePath && provider === "whatsapp") {
    const download = await adminClient.storage.from("central-media").download(mediaStoragePath);
    if (download.error || !download.data) return json({ error: "Não foi possível ler o anexo enviado." }, 500);

    const mime = mediaMimeType || download.data.type || "application/octet-stream";
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", mime);
    form.append("file", download.data, mediaFilename);

    const uploadResponse = await fetch(`https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(accountId)}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const uploadPayload = await uploadResponse.json().catch(() => ({})) as Record<string, any>;
    if (!uploadResponse.ok || !uploadPayload.id) return json({ error: uploadPayload?.error?.message || "Falha ao enviar anexo para a Meta" }, 502);

    const kind = mediaKind(mime);
    storedMessageType = kind;
    const mediaObject: Record<string, unknown> = { id: String(uploadPayload.id) };
    if (body) mediaObject.caption = body;
    if (kind === "document") mediaObject.filename = mediaFilename;

    requestBody = { messaging_product: "whatsapp", recipient_type: "individual", to: recipientId, type: kind, [kind]: mediaObject };
  } else if (provider === "whatsapp") {
    requestBody = { messaging_product: "whatsapp", recipient_type: "individual", to: recipientId, type: "text", text: { preview_url: false, body } };
  } else if (provider === "instagram") {
    requestBody = { recipient: { id: recipientId }, message: { text: body } };
  } else {
    requestBody = { recipient: { id: recipientId }, messaging_type: "RESPONSE", message: { text: body } };
  }

  const sentAt = new Date().toISOString();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const metaResponse = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) return json({ error: metaResponse?.error?.message || `Meta API respondeu ${response.status}` }, response.status);

  const externalMessageId = provider === "whatsapp"
    ? String((Array.isArray(metaResponse.messages) ? metaResponse.messages[0]?.id : "") || crypto.randomUUID())
    : String(metaResponse.message_id || crypto.randomUUID());

  await adminClient.from("central_messages").upsert({
    conversation_id: conversationId,
    operation_scope: conversation.operation_scope,
    external_message_id: externalMessageId,
    direction: "outbound",
    sender_external_id: accountId,
    message_type: storedMessageType,
    body: body || null,
    media_external_url: null,
    media_storage_path: mediaStoragePath || null,
    media_mime_type: mediaMimeType || null,
    media_filename: mediaStoragePath ? mediaFilename : null,
    delivery_status: "sent",
    sent_at: sentAt,
    raw_payload: { provider, response: metaResponse },
    ai_processed: true,
  }, { onConflict: "conversation_id,external_message_id" });

  await Promise.all([
    adminClient.from("central_conversations").update({ status: "open", last_message_at: sentAt, updated_at: sentAt }).eq("id", conversationId),
    adminClient.from("central_integrations").update({ status: "connected", last_error: null, last_sync_at: sentAt, updated_at: sentAt }).eq("id", integration.id),
  ]);

  return json({ sent: true, provider, external_message_id: externalMessageId });
});
