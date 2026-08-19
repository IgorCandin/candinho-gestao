/* eslint-disable @typescript-eslint/no-explicit-any */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const encoder = new TextEncoder();
type Provider = "whatsapp" | "instagram" | "facebook";
type ParsedMessage = { provider: Provider; accountId: string; externalContactId: string; externalMessageId?: string; displayName: string; phone?: string; username?: string; direction: "inbound" | "outbound"; messageType: string; body?: string; mediaUrl?: string; sentAt: string; raw: Record<string, unknown> };
type DeliveryStatus = { externalMessageId: string; status: string; sentAt: string; raw: Record<string, unknown> };

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } }); }
function asRecord(value: unknown): Record<string, any> { return value && typeof value === "object" ? value as Record<string, any> : {}; }
async function sha256Hex(value: string) { const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value)); return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function hmacSha256Hex(secret: string, value: string) { const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value)); return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let result = 0; for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0; }

function parseMetaPayload(payload: Record<string, any>) {
  const messages: ParsedMessage[] = [];
  const statuses: DeliveryStatus[] = [];
  const object = String(payload.object ?? "");
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const rawEntry of entries) {
    const entry = asRecord(rawEntry);
    if (Array.isArray(entry.messaging)) {
      const provider: "instagram" | "facebook" = object === "instagram" ? "instagram" : "facebook";
      const accountId = String(entry.id ?? "");
      for (const rawMessaging of entry.messaging) {
        const messaging = asRecord(rawMessaging);
        const message = asRecord(messaging.message);
        if (!Object.keys(message).length) continue;
        const isEcho = Boolean(message.is_echo);
        const senderId = String(asRecord(messaging.sender).id ?? "");
        const recipientId = String(asRecord(messaging.recipient).id ?? "");
        const externalContactId = isEcho ? recipientId : senderId;
        if (!accountId || !externalContactId) continue;
        const attachment = Array.isArray(message.attachments) ? asRecord(message.attachments[0]) : {};
        const attachmentPayload = asRecord(attachment.payload);
        const timestamp = Number(messaging.timestamp ?? Date.now());
        messages.push({ provider, accountId, externalContactId, externalMessageId: message.mid ? String(message.mid) : undefined, displayName: externalContactId, direction: isEcho ? "outbound" : "inbound", messageType: message.text ? "text" : (attachment.type ? String(attachment.type) : "unknown"), body: message.text ? String(message.text) : undefined, mediaUrl: attachmentPayload.url ? String(attachmentPayload.url) : undefined, sentAt: new Date(Number.isFinite(timestamp) ? timestamp : Date.now()).toISOString(), raw: messaging });
      }
    }

    if (Array.isArray(entry.changes)) {
      for (const rawChange of entry.changes) {
        const value = asRecord(asRecord(rawChange).value);
        if (value.messaging_product !== "whatsapp") continue;
        const metadata = asRecord(value.metadata);
        const accountId = String(metadata.phone_number_id ?? entry.id ?? "");
        const contacts = Array.isArray(value.contacts) ? value.contacts.map(asRecord) : [];
        if (Array.isArray(value.messages)) {
          for (const rawMessage of value.messages) {
            const message = asRecord(rawMessage);
            const from = String(message.from ?? "");
            if (!accountId || !from) continue;
            const contact = contacts.find((c) => String(c.wa_id ?? "") === from) ?? contacts[0] ?? {};
            const profile = asRecord(contact.profile);
            const type = String(message.type ?? "unknown");
            let body: string | undefined;
            if (type === "text") body = asRecord(message.text).body;
            else if (type === "button") body = asRecord(message.button).text;
            else if (type === "interactive") { const interactive = asRecord(message.interactive); body = asRecord(interactive.button_reply).title ?? asRecord(interactive.list_reply).title; }
            const seconds = Number(message.timestamp ?? Math.floor(Date.now() / 1000));
            messages.push({ provider: "whatsapp", accountId, externalContactId: from, externalMessageId: message.id ? String(message.id) : undefined, displayName: String(profile.name ?? from), phone: from, direction: "inbound", messageType: type, body: body ? String(body) : undefined, sentAt: new Date((Number.isFinite(seconds) ? seconds : Math.floor(Date.now() / 1000)) * 1000).toISOString(), raw: message });
          }
        }
        if (Array.isArray(value.statuses)) {
          for (const rawStatus of value.statuses) {
            const status = asRecord(rawStatus);
            const id = String(status.id ?? "");
            if (!id) continue;
            const seconds = Number(status.timestamp ?? Math.floor(Date.now() / 1000));
            statuses.push({ externalMessageId: id, status: String(status.status ?? "sent"), sentAt: new Date((Number.isFinite(seconds) ? seconds : Math.floor(Date.now() / 1000)) * 1000).toISOString(), raw: status });
          }
        }
      }
    }
  }
  return { messages, statuses };
}

async function resolveIntegration(supabase: SupabaseClient, provider: string, accountId: string) {
  const { data } = await supabase.from("central_integrations").select("id,operation_scope,status").eq("provider", provider).eq("account_external_id", accountId).maybeSingle();
  return data ?? null;
}

async function touchIntegration(supabase: SupabaseClient, provider: string, accountId: string, at: string) {
  await supabase.from("central_integrations").update({ status: "connected", last_sync_at: at, last_error: null, updated_at: at }).eq("provider", provider).eq("account_external_id", accountId);
}

async function ingestMessage(supabase: SupabaseClient, item: ParsedMessage): Promise<boolean> {
  const integration = await resolveIntegration(supabase, item.provider, item.accountId);
  // A conta precisa estar explicitamente conectada. Sem isso, um webhook antigo
  // da Meta não pode recriar o canal depois que a integração foi removida.
  if (!integration || integration.status !== "connected") return false;
  const scope = integration?.operation_scope ?? "company";
  const { data: channel, error: channelError } = await supabase.from("central_channels").upsert({ provider: item.provider, operation_scope: scope, account_external_id: item.accountId, active: true, metadata: {} }, { onConflict: "provider,account_external_id" }).select("id").single();
  if (channelError) throw channelError;

  const { data: existingIdentity, error: identityLookupError } = await supabase.from("central_contact_identities").select("id,contact_id").eq("provider", item.provider).eq("account_external_id", item.accountId).eq("external_id", item.externalContactId).maybeSingle();
  if (identityLookupError) throw identityLookupError;
  let contactId = existingIdentity?.contact_id as string | undefined;
  if (!contactId) {
    const { data: contact, error: contactError } = await supabase.from("central_contacts").insert({ operation_scope: scope, display_name: item.displayName, phone: item.phone ?? null, instagram_username: item.username ?? null, preferred_channel: item.provider }).select("id").single();
    if (contactError) throw contactError;
    contactId = contact.id;
    const { error: identityError } = await supabase.from("central_contact_identities").insert({ contact_id: contactId, provider: item.provider, account_external_id: item.accountId, external_id: item.externalContactId, username: item.username ?? null, display_name: item.displayName, metadata: {} });
    if (identityError && identityError.code !== "23505") throw identityError;
  }

  const { data: conversation, error: conversationError } = await supabase.from("central_conversations").upsert({ channel_id: channel.id, contact_id: contactId, operation_scope: scope, external_conversation_id: item.externalContactId, status: "open", last_message_at: item.sentAt, metadata: { provider: item.provider } }, { onConflict: "channel_id,external_conversation_id" }).select("id,unread_count").single();
  if (conversationError) throw conversationError;

  const { error: messageError } = await supabase.from("central_messages").insert({ conversation_id: conversation.id, operation_scope: scope, external_message_id: item.externalMessageId ?? null, direction: item.direction, sender_external_id: item.externalContactId, message_type: item.messageType, body: item.body ?? null, media_external_url: item.mediaUrl ?? null, delivery_status: item.direction === "inbound" ? "received" : "sent", sent_at: item.sentAt, raw_payload: item.raw, ai_processed: false });
  if (messageError && messageError.code !== "23505") throw messageError;
  if (!messageError) {
    const nextUnread = item.direction === "inbound" ? Number(conversation.unread_count ?? 0) + 1 : Number(conversation.unread_count ?? 0);
    const { error: updateError } = await supabase.from("central_conversations").update({ last_message_at: item.sentAt, unread_count: nextUnread, updated_at: new Date().toISOString() }).eq("id", conversation.id);
    if (updateError) throw updateError;
  }
  await touchIntegration(supabase, item.provider, item.accountId, item.sentAt);
  return true;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const verifyToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") ?? "";
  const appSecret = Deno.env.get("META_APP_SECRET") ?? "";
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode") ?? "";
    const token = url.searchParams.get("hub.verify_token") ?? "";
    const challenge = url.searchParams.get("hub.challenge") ?? "";
    if (!verifyToken) return json({ error: "META_WEBHOOK_VERIFY_TOKEN não configurado" }, 503);
    if (mode === "subscribe" && safeEqual(token, verifyToken)) return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
    return json({ error: "Falha na verificação do webhook" }, 403);
  }
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  if (!appSecret) return json({ error: "META_APP_SECRET não configurado" }, 503);

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const expected = `sha256=${await hmacSha256Hex(appSecret, rawBody)}`;
  if (!signature || !safeEqual(signature, expected)) return json({ error: "Assinatura Meta inválida" }, 401);
  let payload: Record<string, any>;
  try { payload = JSON.parse(rawBody); } catch { return json({ error: "JSON inválido" }, 400); }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Configuração interna indisponível" }, 503);
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const externalEventId = await sha256Hex(rawBody);
  const eventType = typeof payload.object === "string" ? payload.object : "meta_event";
  const { data: event, error: eventError } = await supabase.from("central_webhook_events").upsert({ provider: "meta", external_event_id: externalEventId, event_type: eventType, payload, status: "processing" }, { onConflict: "provider,external_event_id" }).select("id,attempts").single();
  if (eventError) return json({ error: "Falha ao registrar evento" }, 500);
  await supabase.from("central_webhook_events").update({ attempts: Number(event.attempts ?? 0) + 1 }).eq("id", event.id);

  try {
    const parsed = parseMetaPayload(payload);
    let messagesProcessed = 0;
    let messagesIgnored = 0;
    for (const message of parsed.messages) {
      if (await ingestMessage(supabase, message)) messagesProcessed += 1;
      else messagesIgnored += 1;
    }
    for (const status of parsed.statuses) {
      await supabase.from("central_messages").update({ delivery_status: status.status, raw_payload: status.raw }).eq("external_message_id", status.externalMessageId).eq("direction", "outbound");
    }
    const processed = messagesProcessed + parsed.statuses.length;
    await supabase.from("central_webhook_events").update({ status: processed ? "processed" : "ignored", processed_at: new Date().toISOString(), error: null }).eq("id", event.id);
    return json({ received: true, messages_processed: messagesProcessed, messages_ignored: messagesIgnored, statuses_processed: parsed.statuses.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("central-meta-webhook processing error", error);
    await supabase.from("central_webhook_events").update({ status: "failed", error: message }).eq("id", event.id);
    return json({ error: "Falha ao processar evento" }, 500);
  }
});
