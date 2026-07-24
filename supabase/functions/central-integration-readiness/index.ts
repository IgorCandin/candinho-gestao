import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "content-type":
          "application/json; charset=utf-8",
      },
    },
  );
}

Deno.serve(async (
  req: Request,
) => {
  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {
    return json(
      {
        error:
          "Método não permitido",
      },
      405,
    );
  }

  const supabaseUrl =
    Deno.env.get(
      "SUPABASE_URL",
    );

  const anonKey =
    Deno.env.get(
      "SUPABASE_ANON_KEY",
    );

  const serviceRoleKey =
    Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

  if (
    !supabaseUrl ||
    !anonKey ||
    !serviceRoleKey
  ) {
    return json(
      {
        error:
          "Configuração interna indisponível",
      },
      503,
    );
  }

  const authHeader =
    req.headers.get(
      "authorization",
    ) ?? "";

  const userClient =
    createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization:
              authHeader,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken:
            false,
        },
      },
    );

  const adminClient =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken:
            false,
        },
      },
    );

  const {
    data: authData,
    error: authError,
  } =
    await userClient.auth.getUser();

  if (
    authError ||
    !authData.user
  ) {
    return json(
      {
        error:
          "Não autenticado",
      },
      401,
    );
  }

  const {
    data: caller,
    error: callerError,
  } = await adminClient
    .from("profiles")
    .select(
      "id,active,can_manage_users,role",
    )
    .eq(
      "id",
      authData.user.id,
    )
    .single();

  if (
    callerError ||
    !caller?.active ||
    !(
      caller.can_manage_users ||
      caller.role === "admin"
    )
  ) {
    return json(
      {
        error:
          "Acesso negado",
      },
      403,
    );
  }

  const verifyToken =
    Boolean(
      Deno.env.get(
        "META_WEBHOOK_VERIFY_TOKEN",
      ),
    );

  const appSecret =
    Boolean(
      Deno.env.get(
        "META_APP_SECRET",
      ),
    );

  const graphVersion =
    Boolean(
      Deno.env.get(
        "META_GRAPH_API_VERSION",
      ),
    );

  const commonToken =
    Boolean(
      Deno.env.get(
        "META_ACCESS_TOKEN",
      ),
    );

  const whatsappToken =
    Boolean(
      Deno.env.get(
        "META_WHATSAPP_ACCESS_TOKEN",
      ),
    ) || commonToken;

  const instagramToken =
    Boolean(
      Deno.env.get(
        "META_INSTAGRAM_ACCESS_TOKEN",
      ),
    ) || commonToken;

  const facebookToken =
    Boolean(
      Deno.env.get(
        "META_FACEBOOK_PAGE_ACCESS_TOKEN",
      ),
    ) || commonToken;

  const openAiKey =
    Boolean(
      Deno.env.get(
        "OPENAI_API_KEY",
      ),
    );

  const geminiKey =
    Boolean(
      Deno.env.get(
        "GEMINI_API_KEY",
      ),
    );

  const preferred =
    Deno.env.get(
      "NEXUS_AI_PROVIDER",
    ) ||
    (geminiKey
      ? "gemini"
      : "openai");

  return json({
    meta: {
      webhook_url:
        `${supabaseUrl}/functions/v1/central-meta-webhook`,
      verify_token_configured:
        verifyToken,
      app_secret_configured:
        appSecret,
      graph_api_version_configured:
        graphVersion,
      receive_ready:
        verifyToken &&
        appSecret,
      ready:
        verifyToken &&
        appSecret,
      send: {
        whatsapp:
          graphVersion &&
          whatsappToken,
        instagram:
          graphVersion &&
          instagramToken,
        facebook:
          graphVersion &&
          facebookToken,
      },
      send_ready:
        graphVersion &&
        (
          whatsappToken ||
          instagramToken ||
          facebookToken
        ),
    },
    nexus: {
      ready:
        geminiKey ||
        openAiKey,
      preferred_provider:
        preferred,
      gemini_configured:
        geminiKey,
      openai_configured:
        openAiKey,
      gemini_model:
        Deno.env.get(
          "GEMINI_NEXUS_MODEL",
        ) ||
        "gemini-2.5-flash-lite",
      openai_fallback:
        Deno.env.get(
          "NEXUS_OPENAI_FALLBACK",
        ) !== "false",
    },
    gemini: {
      api_key_configured:
        geminiKey,
      nexus_model:
        Deno.env.get(
          "GEMINI_NEXUS_MODEL",
        ) ||
        "gemini-2.5-flash-lite",
      ready: geminiKey,
    },
    openai: {
      api_key_configured:
        openAiKey,
      media_model:
        Deno.env.get(
          "OPENAI_MEDIA_MODEL",
        ) ||
        "gpt-5-mini",
      nexus_model:
        Deno.env.get(
          "OPENAI_NEXUS_MODEL",
        ) ||
        "gpt-5-mini",
      ready: openAiKey,
    },
    functions: {
      meta_webhook:
        "active",
      meta_send: "active",
      media_classifier:
        "active",
      nexus_suggest:
        "active",
      partner_portal_invite:
        "active",
    },
  });
});
