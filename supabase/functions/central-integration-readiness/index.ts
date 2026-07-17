import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Configuração interna indisponível" }, 503);
  }

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

  const { data: caller, error: callerError } = await adminClient
    .from("profiles")
    .select("id,active,can_manage_users,role")
    .eq("id", authData.user.id)
    .single();

  if (callerError || !caller?.active || !(caller.can_manage_users || caller.role === "admin")) {
    return json({ error: "Acesso negado" }, 403);
  }

  const metaVerifyToken = Boolean(Deno.env.get("META_WEBHOOK_VERIFY_TOKEN"));
  const metaAppSecret = Boolean(Deno.env.get("META_APP_SECRET"));
  const openAiKey = Boolean(Deno.env.get("OPENAI_API_KEY"));

  return json({
    meta: {
      webhook_url: `${supabaseUrl}/functions/v1/central-meta-webhook`,
      verify_token_configured: metaVerifyToken,
      app_secret_configured: metaAppSecret,
      ready: metaVerifyToken && metaAppSecret,
    },
    openai: {
      api_key_configured: openAiKey,
      media_model: Deno.env.get("OPENAI_MEDIA_MODEL") ?? "gpt-5-mini",
      nexus_model: Deno.env.get("OPENAI_NEXUS_MODEL") ?? "gpt-5-mini",
      ready: openAiKey,
    },
    functions: {
      meta_webhook: "active",
      media_classifier: "active",
      nexus_suggest: "active",
      partner_portal_invite: "active",
    },
  });
});
