import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "content-type":
        "application/json; charset=utf-8",
    },
  });

const appUrl = () =>
  (
    Deno.env.get("CANDINHO_APP_URL") ??
    "https://candinho.duckdns.org"
  ).replace(/\/$/, "");

const functionUrl = () => {
  const supabaseUrl =
    Deno.env.get("SUPABASE_URL");

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL ausente");
  }

  return `${supabaseUrl}/functions/v1/google-calendar-oauth`;
};

async function authenticatedUser(
  req: Request,
) {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get(
    "SUPABASE_ANON_KEY",
  );

  if (!url || !anon) return null;

  const authorization =
    req.headers.get("authorization") ?? "";

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return null;
  }

  const client = createClient(url, anon, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
    },
  });

  const { data, error } =
    await client.auth.getUser();

  if (error || !data.user) return null;

  return data.user;
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  );

  if (!url || !key) {
    throw new Error(
      "Supabase service role indisponível",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

async function callback(reqUrl: URL) {
  const code =
    reqUrl.searchParams.get("code");
  const state =
    reqUrl.searchParams.get("state");
  const oauthError =
    reqUrl.searchParams.get("error");

  if (oauthError) {
    return Response.redirect(
      `${appUrl()}/central/agenda-estrategica?calendar=error`,
      302,
    );
  }

  if (!code || !state) {
    return json(
      {
        error:
          "Callback OAuth incompleto",
      },
      400,
    );
  }

  const admin = serviceClient();

  const {
    data: stateRow,
    error: stateError,
  } = await admin
    .from(
      "central_google_calendar_oauth_states",
    )
    .select(
      "state,user_id,expires_at",
    )
    .eq("state", state)
    .maybeSingle();

  if (stateError || !stateRow) {
    return json(
      { error: "Estado OAuth inválido" },
      400,
    );
  }

  if (
    new Date(
      stateRow.expires_at,
    ).getTime() < Date.now()
  ) {
    await admin
      .from(
        "central_google_calendar_oauth_states",
      )
      .delete()
      .eq("state", state);

    return json(
      { error: "Estado OAuth expirado" },
      400,
    );
  }

  await admin
    .from(
      "central_google_calendar_oauth_states",
    )
    .delete()
    .eq("state", state);

  const clientId =
    Deno.env.get(
      "GOOGLE_CALENDAR_CLIENT_ID",
    );
  const clientSecret =
    Deno.env.get(
      "GOOGLE_CALENDAR_CLIENT_SECRET",
    );

  if (!clientId || !clientSecret) {
    return json(
      {
        error:
          "Credenciais Google Calendar não configuradas",
      },
      503,
    );
  }

  const tokenResponse = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: functionUrl(),
        grant_type:
          "authorization_code",
      }),
    },
  );

  const tokenBody =
    await tokenResponse.json();

  if (!tokenResponse.ok) {
    return json(
      {
        error:
          tokenBody?.error_description ??
          tokenBody?.error ??
          "Falha ao trocar código OAuth",
      },
      500,
    );
  }

  const accessToken = String(
    tokenBody.access_token ?? "",
  );

  let email: string | null = null;

  if (accessToken) {
    try {
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        },
      );

      if (response.ok) {
        const profile =
          await response.json();

        email =
          typeof profile?.email ===
          "string"
            ? profile.email
            : null;
      }
    } catch {
      // O e-mail é apenas informativo.
    }
  }

  const { data: existing } =
    await admin
      .from(
        "central_google_calendar_connections",
      )
      .select("refresh_token")
      .eq(
        "owner_user_id",
        stateRow.user_id,
      )
      .maybeSingle();

  const refreshToken =
    tokenBody.refresh_token ??
    existing?.refresh_token ??
    null;

  if (!refreshToken) {
    return json(
      {
        error:
          "O Google não retornou refresh_token. Reconecte concedendo acesso offline.",
      },
      400,
    );
  }

  const expiresAt =
    tokenBody.expires_in
      ? new Date(
          Date.now() +
            Number(
              tokenBody.expires_in,
            ) *
              1000,
        ).toISOString()
      : null;

  const { error: saveError } =
    await admin
      .from(
        "central_google_calendar_connections",
      )
      .upsert(
        {
          owner_user_id:
            stateRow.user_id,
          google_account_email: email,
          calendar_id: "primary",
          refresh_token: refreshToken,
          access_token:
            accessToken || null,
          access_token_expires_at:
            expiresAt,
          granted_scope:
            typeof tokenBody.scope ===
            "string"
              ? tokenBody.scope
              : null,
          status: "connected",
          last_error: null,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "owner_user_id",
        },
      );

  if (saveError) {
    return json(
      {
        error:
          `Falha ao salvar conexão: ${saveError.message}`,
      },
      500,
    );
  }

  await admin.rpc(
    "dispatch_google_calendar_sync",
  );

  return Response.redirect(
    `${appUrl()}/central/agenda-estrategica?calendar=connected`,
    302,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: cors,
    });
  }

  const reqUrl = new URL(req.url);

  if (
    req.method === "GET" &&
    (
      reqUrl.searchParams.has(
        "code",
      ) ||
      reqUrl.searchParams.has(
        "error",
      )
    )
  ) {
    return callback(reqUrl);
  }

  if (req.method !== "POST") {
    return json(
      {
        error:
          "Método não permitido",
      },
      405,
    );
  }

  const user =
    await authenticatedUser(req);

  if (!user) {
    return json(
      { error: "Não autenticado" },
      401,
    );
  }

  let body:
    Record<string, unknown> = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action =
    typeof body.action === "string"
      ? body.action
      : "start";

  const admin = serviceClient();

  if (action === "disconnect") {
    await admin
      .from(
        "central_google_calendar_connections",
      )
      .delete()
      .eq(
        "owner_user_id",
        user.id,
      );

    await admin
      .from(
        "central_calendar_event_bindings",
      )
      .delete()
      .neq(
        "id",
        "00000000-0000-0000-0000-000000000000",
      );

    return json({
      ok: true,
      disconnected: true,
    });
  }

  if (action !== "start") {
    return json(
      { error: "Ação inválida" },
      400,
    );
  }

  const clientId =
    Deno.env.get(
      "GOOGLE_CALENDAR_CLIENT_ID",
    );
  const clientSecret =
    Deno.env.get(
      "GOOGLE_CALENDAR_CLIENT_SECRET",
    );

  if (!clientId || !clientSecret) {
    return json(
      {
        error:
          "Google Calendar ainda não configurado no Supabase.",
        missing: [
          !clientId
            ? "GOOGLE_CALENDAR_CLIENT_ID"
            : null,
          !clientSecret
            ? "GOOGLE_CALENDAR_CLIENT_SECRET"
            : null,
        ].filter(Boolean),
        redirect_uri:
          functionUrl(),
      },
      503,
    );
  }

  const state =
    crypto
      .randomUUID()
      .replaceAll("-", "") +
    crypto
      .randomUUID()
      .replaceAll("-", "");

  const { error: stateError } =
    await admin
      .from(
        "central_google_calendar_oauth_states",
      )
      .insert({
        state,
        user_id: user.id,
        expires_at:
          new Date(
            Date.now() +
              10 * 60 * 1000,
          ).toISOString(),
      });

  if (stateError) {
    return json(
      {
        error:
          `Falha ao iniciar OAuth: ${stateError.message}`,
      },
      500,
    );
  }

  const authUrl = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth",
  );

  authUrl.searchParams.set(
    "client_id",
    clientId,
  );
  authUrl.searchParams.set(
    "redirect_uri",
    functionUrl(),
  );
  authUrl.searchParams.set(
    "response_type",
    "code",
  );
  authUrl.searchParams.set(
    "access_type",
    "offline",
  );
  authUrl.searchParams.set(
    "prompt",
    "consent",
  );
  authUrl.searchParams.set(
    "include_granted_scopes",
    "true",
  );
  authUrl.searchParams.set(
    "state",
    state,
  );
  authUrl.searchParams.set(
    "scope",
    [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar",
    ].join(" "),
  );

  return json({
    authorization_url:
      authUrl.toString(),
    redirect_uri:
      functionUrl(),
  });
});
