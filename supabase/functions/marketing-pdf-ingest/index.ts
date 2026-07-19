import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8" },
  });
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function outputText(response: any) {
  if (typeof response?.output_text === "string") return response.output_text;
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function errorDetail(status: number, raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.error?.message === "string") return `OpenAI ${status}: ${parsed.error.message}`;
  } catch {}
  return `OpenAI ${status}: ${raw.slice(0, 600) || "erro sem detalhes"}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openai = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_MEDIA_MODEL") ?? "gpt-5-mini";
  if (!url || !anon || !service || !openai) return reply({ error: "Configuração interna indisponível" }, 503);

  const auth = req.headers.get("authorization") ?? "";
  const user = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const { data: userData } = await user.auth.getUser();
  if (!userData.user) return reply({ error: "Não autenticado" }, 401);

  let body: { asset_id?: string };
  try { body = await req.json(); } catch { return reply({ error: "JSON inválido" }, 400); }
  if (!body.asset_id) return reply({ error: "asset_id é obrigatório" }, 400);

  const { data: allowed } = await user.rpc("central_can_write_scope", { p_scope: "marketing" });
  if (!allowed) return reply({ error: "Sem permissão para Marketing" }, 403);

  const { data: asset, error: assetError } = await user
    .from("central_media_assets")
    .select("id,storage_path,original_filename,mime_type,created_by")
    .eq("id", body.asset_id)
    .eq("operation_scope", "marketing")
    .single();
  if (assetError || !asset) return reply({ error: "PDF não encontrado" }, 404);
  if (asset.mime_type !== "application/pdf") return reply({ error: "O arquivo precisa ser PDF" }, 422);

  const fallbackTitle = String(asset.original_filename ?? "Roteiro")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Roteiro";

  const existing = await admin.from("marketing_projects").select("id").eq("media_asset_id", asset.id).maybeSingle();
  if (existing.error) return reply({ error: existing.error.message }, 500);

  let projectId = existing.data?.id as string | undefined;
  if (!projectId) {
    const created = await admin.from("marketing_projects").insert({
      media_asset_id: asset.id,
      title: fallbackTitle,
      processing_status: "processing",
      created_by: asset.created_by ?? userData.user.id,
    }).select("id").single();
    if (created.error || !created.data) return reply({ error: created.error?.message ?? "Falha ao criar projeto" }, 500);
    projectId = created.data.id;
  } else {
    await admin.from("marketing_projects").update({ processing_status: "processing", updated_at: new Date().toISOString() }).eq("id", projectId);
  }

  try {
    const downloaded = await admin.storage.from("central-media").download(asset.storage_path);
    if (downloaded.error || !downloaded.data) throw new Error(downloaded.error?.message ?? "Não foi possível ler o PDF");
    if (downloaded.data.size > 20 * 1024 * 1024) throw new Error("PDF maior que 20 MB");

    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    // A API de arquivos da Responses aceita file_data em base64. Nesta versão
    // enviamos como data URL completa para manter MIME e codificação explícitos.
    const fileData = `data:application/pdf;base64,${toBase64(bytes)}`;

    const prompt = `Leia integralmente este PDF da Operação Marketing da Candinho Company. Preserve todas as ideias úteis e organize o material como página de roteiro. Não invente dados. Retorne SOMENTE JSON válido sem markdown: {"title":"título","summary":"resumo","objective":"objetivo ou null","product":"produto ou tema ou null","content_format":"formato ou roteiro","audience":"público ou null","hook":"gancho ou null","script_text":"roteiro completo organizado","cta":"cta ou null","keywords":["palavra"],"sections":[{"title":"seção","content":"conteúdo"}]}. Se houver vários roteiros, mantenha todos.`;

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openai}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: [{
          role: "user",
          content: [
            { type: "input_file", filename: asset.original_filename ?? "roteiro.pdf", file_data: fileData },
            { type: "input_text", text: prompt },
          ],
        }],
      }),
    });

    const rawResponse = await aiResponse.text();
    if (!aiResponse.ok) throw new Error(errorDetail(aiResponse.status, rawResponse));

    const parsedResponse = JSON.parse(rawResponse);
    const text = outputText(parsedResponse).trim();
    if (!text) throw new Error("O Nexus não retornou conteúdo para o roteiro");

    let result: any;
    try {
      result = JSON.parse(text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim());
    } catch {
      result = { title: fallbackTitle, content_format: "roteiro", script_text: text, keywords: [], sections: [] };
    }

    const keywords = Array.isArray(result.keywords) ? result.keywords.filter((v: unknown) => typeof v === "string") : [];
    const sections = Array.isArray(result.sections) ? result.sections : [];
    const title = clean(result.title) ?? fallbackTitle;

    const saved = await admin.from("marketing_projects").update({
      title,
      summary: clean(result.summary),
      objective: clean(result.objective),
      product: clean(result.product),
      content_format: clean(result.content_format) ?? "roteiro",
      audience: clean(result.audience),
      hook: clean(result.hook),
      script_text: clean(result.script_text) ?? text,
      cta: clean(result.cta),
      processing_status: "ready",
      ai_metadata: { keywords, sections, model, processed_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq("id", projectId);
    if (saved.error) throw new Error(saved.error.message);

    await admin.from("central_media_assets").update({
      description_ai: clean(result.summary),
      search_text: [asset.original_filename, title, result.summary, result.product, ...keywords].filter(Boolean).join(" "),
      ai_metadata: { marketing_ingestion_status: "ready", marketing_project_id: projectId, model, keywords },
      updated_at: new Date().toISOString(),
    }).eq("id", asset.id);

    return reply({ processed: true, project_id: projectId, title });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao interpretar PDF";
    await admin.from("marketing_projects").update({
      processing_status: "error",
      ai_metadata: { error: message, failed_at: new Date().toISOString(), model },
      updated_at: new Date().toISOString(),
    }).eq("id", projectId);
    console.error("marketing-pdf-ingest", message);
    return reply({ error: message, project_id: projectId }, 500);
  }
});
