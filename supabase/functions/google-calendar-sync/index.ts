import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-candinho-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "content-type": "application/json; charset=utf-8",
    },
  });

const APP_URL = (
  Deno.env.get("CANDINHO_APP_URL") ??
  "https://candinho.duckdns.org"
).replace(/\/$/, "");

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error("Supabase service role indisponível");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

async function authorize(
  req: Request,
  admin: ReturnType<typeof serviceClient>,
) {
  const internalSecret = req.headers.get(
    "x-candinho-sync-secret",
  );

  if (internalSecret) {
    const { data } = await admin
      .from("central_calendar_internal_config")
      .select("sync_secret")
      .eq("singleton", true)
      .maybeSingle();

    if (
      data?.sync_secret &&
      internalSecret === data.sync_secret
    ) {
      return true;
    }
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization =
    req.headers.get("authorization") ?? "";

  if (
    !url ||
    !anon ||
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return false;
  }

  const client = createClient(url, anon, {
    global: {
      headers: { Authorization: authorization },
    },
    auth: { persistSession: false },
  });

  const [
    { data: authData, error: authError },
    { data: allowed, error: permissionError },
  ] = await Promise.all([
    client.auth.getUser(),
    client.rpc(
      "central_can_manage_strategic_agenda",
    ),
  ]);

  return Boolean(
    !authError &&
      authData.user &&
      !permissionError &&
      allowed,
  );
}

async function getSource(
  admin: ReturnType<typeof serviceClient>,
  job: any,
) {
  if (job.source_type === "post_sale") {
    const { data, error } = await admin
      .from("post_sale_batch_overview")
      .select("*")
      .eq("id", job.source_id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (
      !data ||
      data.status !== "planned" ||
      !data.due_on
    ) {
      return { action: "delete" as const };
    }

    const description = [
      data.customer_name
        ? `Cliente: ${data.customer_name}`
        : null,
      data.customer_phone
        ? `Telefone: ${data.customer_phone}`
        : null,
      data.city
        ? `Cidade: ${data.city}`
        : null,
      data.product_summary
        ? `Produtos: ${data.product_summary}`
        : null,
      data.reference
        ? `Referência: ${data.reference}`
        : null,
      `Abrir na Candinho: ${APP_URL}/agenda`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      action: "upsert" as const,
      title:
        `Pós-venda · ${data.customer_name ?? "Cliente"}`,
      date: String(data.due_on),
      description,
    };
  }

  const { data, error } = await admin
    .from("central_strategic_agenda_items")
    .select("*")
    .eq("id", job.source_id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (
    !data ||
    data.status !== "planned" ||
    !data.scheduled_on
  ) {
    return { action: "delete" as const };
  }

  const description = [
    data.objective
      ? `Objetivo: ${data.objective}`
      : null,
    data.category
      ? `Categoria: ${data.category}`
      : null,
    data.priority
      ? `Prioridade: ${data.priority}`
      : null,
    data.notes
      ? `Observações: ${data.notes}`
      : null,
    `Abrir na Candinho: ${APP_URL}/central/agenda-estrategica?month=${String(
      data.reference_month,
    ).slice(0, 7)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    action: "upsert" as const,
    title: `Estratégica · ${data.task}`,
    date: String(data.scheduled_on),
    description,
  };
}

async function callAppsScript(
  url: string,
  secret: string,
  job: any,
  source: any,
) {
  const payload: Record<string, unknown> = {
    secret,
    action:
      job.action === "delete" ||
      source.action === "delete"
        ? "delete"
        : "upsert",
    source_type: job.source_type,
    source_id: String(job.source_id),
  };

  if (payload.action === "upsert") {
    payload.title = source.title;
    payload.date = source.date;
    payload.description =
      source.description ?? "";
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    redirect: "follow",
  });

  const text = await response.text();
  let body: any = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      `Apps Script HTTP ${response.status}: ${text.slice(0, 300)}`,
    );
  }

  if (!body?.ok) {
    throw new Error(
      body?.error ??
        `Resposta inválida do Apps Script: ${text.slice(0, 300)}`,
    );
  }

  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: cors,
    });
  }

  if (req.method !== "POST") {
    return json(
      { error: "Método não permitido" },
      405,
    );
  }

  const admin = serviceClient();
  const allowed = await authorize(req, admin);

  if (!allowed) {
    return json(
      { error: "Não autorizado" },
      403,
    );
  }

  const { data: config, error: configError } =
    await admin
      .from("central_calendar_internal_config")
      .select(
        "apps_script_url,apps_script_secret",
      )
      .eq("singleton", true)
      .maybeSingle();

  if (configError) {
    return json(
      { error: configError.message },
      500,
    );
  }

  if (
    !config?.apps_script_url ||
    !config?.apps_script_secret
  ) {
    return json(
      {
        ok: true,
        connected: false,
        processed: 0,
        error:
          "Apps Script não configurado",
      },
      200,
    );
  }

  let limit = 50;

  try {
    const body = await req.json();

    if (
      Number.isFinite(
        Number(body?.limit),
      )
    ) {
      limit = Math.min(
        Math.max(
          Number(body.limit),
          1,
        ),
        100,
      );
    }
  } catch {
    // Corpo opcional.
  }

  const { data: jobs, error: queueError } =
    await admin
      .from(
        "central_calendar_sync_queue",
      )
      .select("*")
      .in(
        "status",
        ["pending", "error"],
      )
      .lt("attempts", 5)
      .order("updated_at", {
        ascending: true,
      })
      .limit(limit);

  if (queueError) {
    return json(
      { error: queueError.message },
      500,
    );
  }

  let processed = 0;
  let failed = 0;

  const failures: Array<{
    source_type: string;
    source_id: string;
    error: string;
  }> = [];

  for (const job of jobs ?? []) {
    await admin
      .from(
        "central_calendar_sync_queue",
      )
      .update({
        status: "processing",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", job.id);

    try {
      const source =
        await getSource(admin, job);

      await callAppsScript(
        config.apps_script_url,
        config.apps_script_secret,
        job,
        source,
      );

      await admin
        .from(
          "central_calendar_sync_queue",
        )
        .update({
          status: "done",
          processed_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
          last_error: null,
        })
        .eq("id", job.id);

      processed += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro desconhecido";

      await admin
        .from(
          "central_calendar_sync_queue",
        )
        .update({
          status: "error",
          attempts:
            Number(
              job.attempts ?? 0,
            ) + 1,
          last_error: message,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", job.id);

      failed += 1;

      failures.push({
        source_type:
          String(job.source_type),
        source_id:
          String(job.source_id),
        error: message,
      });
    }
  }

  await admin
    .from(
      "central_calendar_internal_config",
    )
    .update({
      last_sync_at:
        new Date().toISOString(),
      last_error:
        failed > 0
          ? failures[0]?.error ??
            "Falha parcial"
          : null,
      updated_at:
        new Date().toISOString(),
    })
    .eq("singleton", true);

  return json({
    ok: true,
    connected: true,
    processed,
    failed,
    failures:
      failures.slice(0, 5),
  });
});
