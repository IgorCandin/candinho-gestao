import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-candinho-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8" },
  });

const APP_URL = (Deno.env.get("CANDINHO_APP_URL") ?? "https://candinho.duckdns.org").replace(/\/$/, "");

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase service role indisponível");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function authorize(req: Request, admin: ReturnType<typeof serviceClient>) {
  const internalSecret = req.headers.get("x-candinho-sync-secret");
  if (internalSecret) {
    const { data } = await admin
      .from("central_calendar_internal_config")
      .select("sync_secret")
      .eq("singleton", true)
      .maybeSingle();

    if (data?.sync_secret && internalSecret === data.sync_secret) {
      return { mode: "internal" as const, userId: null };
    }
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("authorization") ?? "";
  if (!url || !anon || !authorization.toLowerCase().startsWith("bearer ")) return null;

  const client = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const [{ data: authData, error: authError }, { data: allowed, error: permissionError }] = await Promise.all([
    client.auth.getUser(),
    client.rpc("central_can_manage_strategic_agenda"),
  ]);

  if (authError || !authData.user || permissionError || !allowed) return null;
  return { mode: "user" as const, userId: authData.user.id };
}

function addOneDay(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

async function refreshAccessToken(admin: ReturnType<typeof serviceClient>, connection: any) {
  const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Credenciais Google Calendar não configuradas");

  const expiresAt = connection.access_token_expires_at
    ? new Date(connection.access_token_expires_at).getTime()
    : 0;

  if (connection.access_token && expiresAt > Date.now() + 60_000) {
    return String(connection.access_token);
  }

  if (!connection.refresh_token) throw new Error("Conexão Google sem refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: String(connection.refresh_token),
      grant_type: "refresh_token",
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    const message = body?.error_description ?? body?.error ?? "Falha ao atualizar token Google";
    await admin
      .from("central_google_calendar_connections")
      .update({
        status: body?.error === "invalid_grant" ? "revoked" : "error",
        last_error: String(message),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    throw new Error(String(message));
  }

  const token = String(body.access_token ?? "");
  if (!token) throw new Error("Google não retornou access_token");

  const nextExpiry = new Date(Date.now() + Number(body.expires_in ?? 3600) * 1000).toISOString();
  await admin
    .from("central_google_calendar_connections")
    .update({
      access_token: token,
      access_token_expires_at: nextExpiry,
      status: "connected",
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return token;
}

async function googleRequest(accessToken: string, path: string, init: RequestInit = {}) {
  return fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

function postSaleEvent(row: any) {
  const description = [
    row.customer_name ? `Cliente: ${row.customer_name}` : null,
    row.customer_phone ? `Telefone: ${row.customer_phone}` : null,
    row.city ? `Cidade: ${row.city}` : null,
    row.product_summary ? `Produtos: ${row.product_summary}` : null,
    row.reference ? `Referência: ${row.reference}` : null,
    `Abrir na Candinho: ${APP_URL}/agenda`,
  ].filter(Boolean).join("\n");

  return {
    summary: `Pós-venda · ${row.customer_name ?? "Cliente"}`,
    description,
    start: { date: row.due_on },
    end: { date: addOneDay(row.due_on) },
    extendedProperties: {
      private: {
        candinho_source_type: "post_sale",
        candinho_source_id: String(row.id),
      },
    },
  };
}

function strategicEvent(row: any) {
  const description = [
    row.objective ? `Objetivo: ${row.objective}` : null,
    row.category ? `Categoria: ${row.category}` : null,
    row.priority ? `Prioridade: ${row.priority}` : null,
    row.notes ? `Observações: ${row.notes}` : null,
    `Abrir na Candinho: ${APP_URL}/central/agenda-estrategica?month=${String(row.reference_month).slice(0, 7)}`,
  ].filter(Boolean).join("\n");

  return {
    summary: `Estratégica · ${row.task}`,
    description,
    start: { date: row.scheduled_on },
    end: { date: addOneDay(row.scheduled_on) },
    extendedProperties: {
      private: {
        candinho_source_type: "strategic_agenda",
        candinho_source_id: String(row.id),
      },
    },
  };
}

async function eventSource(admin: ReturnType<typeof serviceClient>, job: any, connection: any) {
  if (job.source_type === "post_sale") {
    if (!connection.sync_post_sale) return { shouldDelete: true, event: null };

    const { data, error } = await admin
      .from("post_sale_batch_overview")
      .select("*")
      .eq("id", job.source_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data || data.status !== "planned" || !data.due_on) return { shouldDelete: true, event: null };
    return { shouldDelete: false, event: postSaleEvent(data) };
  }

  if (!connection.sync_strategic_agenda) return { shouldDelete: true, event: null };

  const { data, error } = await admin
    .from("central_strategic_agenda_items")
    .select("*")
    .eq("id", job.source_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.status !== "planned" || !data.scheduled_on) return { shouldDelete: true, event: null };
  return { shouldDelete: false, event: strategicEvent(data) };
}

async function deleteGoogleEvent(
  admin: ReturnType<typeof serviceClient>,
  accessToken: string,
  calendarId: string,
  sourceType: string,
  sourceId: string,
) {
  const { data: binding, error } = await admin
    .from("central_calendar_event_bindings")
    .select("id,google_event_id,google_calendar_id")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!binding) return;

  const targetCalendar = binding.google_calendar_id || calendarId;
  const response = await googleRequest(
    accessToken,
    `/calendars/${encodeURIComponent(targetCalendar)}/events/${encodeURIComponent(binding.google_event_id)}`,
    { method: "DELETE" },
  );

  if (!response.ok && ![404, 410].includes(response.status)) {
    const body = await response.text();
    throw new Error(`Google Calendar delete ${response.status}: ${body.slice(0, 300)}`);
  }

  await admin.from("central_calendar_event_bindings").delete().eq("id", binding.id);
}

async function upsertGoogleEvent(
  admin: ReturnType<typeof serviceClient>,
  accessToken: string,
  calendarId: string,
  job: any,
  event: any,
) {
  const { data: binding, error: bindingError } = await admin
    .from("central_calendar_event_bindings")
    .select("id,google_event_id,google_calendar_id")
    .eq("source_type", job.source_type)
    .eq("source_id", job.source_id)
    .maybeSingle();

  if (bindingError) throw new Error(bindingError.message);

  if (binding) {
    const targetCalendar = binding.google_calendar_id || calendarId;
    const response = await googleRequest(
      accessToken,
      `/calendars/${encodeURIComponent(targetCalendar)}/events/${encodeURIComponent(binding.google_event_id)}`,
      { method: "PATCH", body: JSON.stringify(event) },
    );

    if (response.ok) {
      await admin
        .from("central_calendar_event_bindings")
        .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", binding.id);
      return;
    }

    if (response.status !== 404 && response.status !== 410) {
      const body = await response.text();
      throw new Error(`Google Calendar update ${response.status}: ${body.slice(0, 300)}`);
    }

    await admin.from("central_calendar_event_bindings").delete().eq("id", binding.id);
  }

  const response = await googleRequest(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: JSON.stringify(event) },
  );

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Google Calendar insert ${response.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }

  if (!body?.id) throw new Error("Google Calendar não retornou event id");

  const { error: saveError } = await admin
    .from("central_calendar_event_bindings")
    .upsert(
      {
        source_type: job.source_type,
        source_id: job.source_id,
        google_event_id: String(body.id),
        google_calendar_id: calendarId,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_type,source_id" },
    );

  if (saveError) throw new Error(saveError.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const admin = serviceClient();
  const auth = await authorize(req, admin);
  if (!auth) return json({ error: "Não autorizado" }, 403);

  let connectionQuery = admin
    .from("central_google_calendar_connections")
    .select("*")
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (auth.mode === "user" && auth.userId) {
    connectionQuery = connectionQuery.eq("owner_user_id", auth.userId);
  }

  const { data: connectionRows, error: connectionError } = await connectionQuery;
  const connection = connectionRows?.[0] ?? null;

  if (connectionError) return json({ error: connectionError.message }, 500);
  if (!connection) return json({ ok: true, connected: false, processed: 0 }, 200);

  let limit = 50;
  try {
    const body = await req.json();
    if (Number.isFinite(Number(body?.limit))) limit = Math.min(Math.max(Number(body.limit), 1), 100);
  } catch {
    // Corpo opcional.
  }

  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(admin, connection);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Falha ao autenticar no Google" }, 502);
  }

  const { data: jobs, error: queueError } = await admin
    .from("central_calendar_sync_queue")
    .select("*")
    .in("status", ["pending", "error"])
    .lt("attempts", 5)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (queueError) return json({ error: queueError.message }, 500);

  let processed = 0;
  let failed = 0;
  const failures: Array<{ source_type: string; source_id: string; error: string }> = [];
  const calendarId = String(connection.calendar_id || "primary");

  for (const job of jobs ?? []) {
    await admin
      .from("central_calendar_sync_queue")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", job.id);

    try {
      const source = await eventSource(admin, job, connection);
      const shouldDelete = job.action === "delete" || source.shouldDelete;

      if (shouldDelete) {
        await deleteGoogleEvent(admin, accessToken, calendarId, job.source_type, job.source_id);
      } else if (source.event) {
        await upsertGoogleEvent(admin, accessToken, calendarId, job, source.event);
      }

      await admin
        .from("central_calendar_sync_queue")
        .update({
          status: "done",
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", job.id);
      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      await admin
        .from("central_calendar_sync_queue")
        .update({
          status: "error",
          attempts: Number(job.attempts ?? 0) + 1,
          last_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      failed += 1;
      failures.push({ source_type: job.source_type, source_id: job.source_id, error: message });
    }
  }

  await admin
    .from("central_google_calendar_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_error: failed > 0 ? failures[0]?.error ?? "Falha parcial" : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return json({ ok: true, connected: true, processed, failed, failures: failures.slice(0, 5) });
});
