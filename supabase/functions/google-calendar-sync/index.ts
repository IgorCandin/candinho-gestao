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
const SAO_PAULO_TZ = "America/Sao_Paulo";
const MAX_JOBS_PER_RUN = 8;
const APPS_SCRIPT_TIMEOUT_MS = 12000;

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase service role indisponível");
  return createClient(url, key, { auth: { persistSession: false } });
}

function brazilDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Data inválida: ${value}`);
  return {
    date: new Intl.DateTimeFormat("en-CA", {
      timeZone: SAO_PAULO_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date),
    time: new Intl.DateTimeFormat("pt-BR", {
      timeZone: SAO_PAULO_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
  };
}

async function authorize(req: Request, admin: ReturnType<typeof serviceClient>) {
  const internalSecret = req.headers.get("x-candinho-sync-secret");
  if (internalSecret) {
    const { data } = await admin
      .from("central_calendar_internal_config")
      .select("sync_secret")
      .eq("singleton", true)
      .maybeSingle();
    if (data?.sync_secret && internalSecret === data.sync_secret) return true;
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("authorization") ?? "";
  if (!url || !anon || !authorization.toLowerCase().startsWith("bearer ")) return false;

  const client = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const [{ data: authData, error: authError }, { data: allowed, error: permissionError }] = await Promise.all([
    client.auth.getUser(),
    client.rpc("central_can_manage_strategic_agenda"),
  ]);
  return Boolean(!authError && authData.user && !permissionError && allowed);
}

async function getSource(admin: ReturnType<typeof serviceClient>, job: any) {
  if (job.source_type === "post_sale") {
    const { data, error } = await admin
      .from("post_sale_batch_overview")
      .select("*")
      .eq("id", job.source_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || data.status !== "planned" || !data.due_on) return { action: "delete" as const };

    const description = [
      data.customer_name ? `Cliente: ${data.customer_name}` : null,
      data.customer_phone ? `Telefone: ${data.customer_phone}` : null,
      data.city ? `Cidade: ${data.city}` : null,
      data.product_summary ? `Produtos: ${data.product_summary}` : null,
      data.reference ? `Referência: ${data.reference}` : null,
      `Abrir na Candinho: ${APP_URL}/agenda`,
    ].filter(Boolean).join("\n");

    return {
      action: "upsert" as const,
      title: `Pós-venda · ${data.customer_name ?? "Cliente"}`,
      date: String(data.due_on),
      description,
    };
  }

  if (job.source_type === "operational_task") {
    const { data, error } = await admin
      .from("operational_tasks")
      .select("id,title,category,due_at,status,priority,operation_scope,notes")
      .eq("id", job.source_id)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const allowedScopes = ["company", "supplements", "fitness"];
    if (
      !data ||
      !allowedScopes.includes(String(data.operation_scope)) ||
      data.status !== "planned" ||
      !data.due_at
    ) {
      return { action: "delete" as const };
    }

    const when = brazilDateTime(String(data.due_at));
    const scope = String(data.operation_scope);
    const scopeLabel =
      scope === "supplements"
        ? "Suplementos"
        : scope === "fitness"
          ? "Fitness"
          : "Central";
    const href =
      scope === "supplements"
        ? "/suplementos/agenda"
        : scope === "fitness"
          ? "/fitness/agenda"
          : "/central/agenda";

    const description = [
      `Operação: ${scopeLabel}`,
      `Horário na Candinho: ${when.time}`,
      data.category ? `Categoria: ${data.category}` : null,
      data.priority ? `Prioridade: ${data.priority}` : null,
      data.notes ? `Observações:\n${data.notes}` : null,
      `Abrir na Candinho: ${APP_URL}${href}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      action: "upsert" as const,
      title: `${scopeLabel} · ${data.title}`,
      date: when.date,
      description,
    };
  }
  if (job.source_type === "marketing_task") {
    const { data, error } = await admin
      .from("operational_tasks")
      .select("id,title,category,due_at,status,priority,operation_scope,notes")
      .eq("id", job.source_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || data.operation_scope !== "marketing" || data.status !== "planned" || !data.due_at) {
      return { action: "delete" as const };
    }

    const when = brazilDateTime(String(data.due_at));
    const description = [
      `Horário na Candinho: ${when.time}`,
      data.category ? `Categoria: ${data.category}` : null,
      data.priority ? `Prioridade: ${data.priority}` : null,
      data.notes ? `Plano:\n${data.notes}` : null,
      `Abrir no Marketing: ${APP_URL}/central/marketing/planejamento`,
    ].filter(Boolean).join("\n");

    return {
      action: "upsert" as const,
      title: `Marketing · ${data.title}`,
      date: when.date,
      description,
    };
  }

  if (job.source_type === "strategic_agenda") {
    const { data, error } = await admin
      .from("central_strategic_agenda_items")
      .select("*")
      .eq("id", job.source_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || data.status !== "planned" || !data.scheduled_on) return { action: "delete" as const };

    const description = [
      data.objective ? `Objetivo: ${data.objective}` : null,
      data.category ? `Categoria: ${data.category}` : null,
      data.priority ? `Prioridade: ${data.priority}` : null,
      data.notes ? `Observações: ${data.notes}` : null,
      `Abrir na Candinho: ${APP_URL}/central/agenda-estrategica?month=${String(data.reference_month).slice(0, 7)}`,
    ].filter(Boolean).join("\n");

    return {
      action: "upsert" as const,
      title: `Estratégica · ${data.task}`,
      date: String(data.scheduled_on),
      description,
    };
  }

  throw new Error(`Tipo de origem não suportado: ${String(job.source_type)}`);
}

async function callAppsScript(url: string, secret: string, job: any, source: any) {
  const payload: Record<string, unknown> = {
    secret,
    action: job.action === "delete" || source.action === "delete" ? "delete" : "upsert",
    source_type: job.source_type,
    source_id: String(job.source_id),
  };
  if (payload.action === "upsert") {
    payload.title = source.title;
    payload.date = source.date;
    payload.description = source.description ?? "";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APPS_SCRIPT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal,
    });
    const text = await response.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { body = null; }
    if (!response.ok) throw new Error(`Apps Script HTTP ${response.status}: ${text.slice(0, 300)}`);
    if (!body?.ok) throw new Error(body?.error ?? `Resposta inválida do Apps Script: ${text.slice(0, 300)}`);
    return body;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Apps Script excedeu ${Math.round(APPS_SCRIPT_TIMEOUT_MS / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJobs(admin: ReturnType<typeof serviceClient>, limit: number) {
  const { data: pending, error: pendingError } = await admin
    .from("central_calendar_sync_queue")
    .select("*")
    .eq("status", "pending")
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (pendingError) throw new Error(pendingError.message);
  if ((pending ?? []).length >= limit) return pending ?? [];

  const remaining = limit - (pending?.length ?? 0);
  const { data: retries, error: retryError } = await admin
    .from("central_calendar_sync_queue")
    .select("*")
    .eq("status", "error")
    .lt("attempts", 5)
    .gte("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("updated_at", { ascending: true })
    .limit(remaining);
  if (retryError) throw new Error(retryError.message);
  return [...(pending ?? []), ...(retries ?? [])];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const admin = serviceClient();
  const allowed = await authorize(req, admin);
  if (!allowed) return json({ error: "Não autorizado" }, 403);

  const { data: config, error: configError } = await admin
    .from("central_calendar_internal_config")
    .select("apps_script_url,apps_script_secret")
    .eq("singleton", true)
    .maybeSingle();
  if (configError) return json({ error: configError.message }, 500);
  if (!config?.apps_script_url || !config?.apps_script_secret) {
    return json({ ok: true, connected: false, processed: 0, error: "Apps Script não configurado" }, 200);
  }

  let requestedLimit = MAX_JOBS_PER_RUN;
  try {
    const body = await req.json();
    if (Number.isFinite(Number(body?.limit))) requestedLimit = Number(body.limit);
  } catch {
    // Corpo opcional.
  }
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_JOBS_PER_RUN);

  let jobs: any[] = [];
  try {
    jobs = await fetchJobs(admin, limit);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro ao ler fila" }, 500);
  }

  let processed = 0;
  let failed = 0;
  const failures: Array<{ source_type: string; source_id: string; error: string }> = [];

  for (const job of jobs) {
    await admin
      .from("central_calendar_sync_queue")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", job.id);

    try {
      const source = await getSource(admin, job);
      await callAppsScript(config.apps_script_url, config.apps_script_secret, job, source);
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
      failures.push({ source_type: String(job.source_type), source_id: String(job.source_id), error: message });
    }
  }

  await admin
    .from("central_calendar_internal_config")
    .update({
      last_sync_at: new Date().toISOString(),
      last_error: failed > 0 ? failures[0]?.error ?? "Falha parcial" : null,
      updated_at: new Date().toISOString(),
    })
    .eq("singleton", true);

  return json({ ok: true, connected: true, processed, failed, failures: failures.slice(0, 5), remaining_hint: jobs.length === limit });
});
