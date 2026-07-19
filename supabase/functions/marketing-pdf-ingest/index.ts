import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

function outputText(response: any) {
  if (typeof response?.output_text === "string") return response.output_text;
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    if (item?.type !== "message") continue;
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content?.text === "string") return content.text;
    }
  }
  return "";
}

function parseJson(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_MEDIA_MODEL") ?? "gpt-5-mini";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Configuração interna indisponível" }, 503);
  if (!openaiKey) return json({ error: "OPENAI_API_KEY não configurada" }, 503);

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

  let body: { asset_id?: string };
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  if (!body.asset_id) return json({ error: "asset_id é obrigatório" }, 400);

  const { data: canWrite } = await userClient.rpc("central_can_write_scope", { p_scope: "marketing" });
  if (!canWrite) return json({ error: "Sem permissão para a Operação Marketing" }, 403);

  const { data: asset, error: assetError } = await userClient
    .from("central_media_assets")
    .select("id,operation_scope,storage_path,original_filename,mime_type,created_by")
    .eq("id", body.asset_id)
    .eq("operation_scope", "marketing")
    .single();

  if (assetError || !asset) return json({ error: "PDF de Marketing não encontrado" }, 404);
  if (String(asset.mime_type ?? "").toLowerCase() !== "application/pdf") return json({ error: "Esta automação processa PDFs" }, 422);

  const fallbackTitle = String(asset.original_filename ?? "Roteiro")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const { data: existing } = await adminClient
    .from("marketing_projects")
    .select("id")
    .eq("media_asset_id", asset.id)
    .maybeSingle();

  let projectId = existing?.id ? String(existing.id) : null;

  if (!projectId) {
    const inserted = await adminClient.from("marketing_projects").insert({
      media_asset_id: asset.id,
      title: fallbackTitle || "Roteiro",
      processing_status: "processing",
      created_by: asset.created_by ?? authData.user.id,
    }).select("id").single();

    if (inserted.error || !inserted.data) return json({ error: "Não foi possível criar a página do roteiro" }, 500);
    projectId = String(inserted.data.id);
  } else {
    await adminClient.from("marketing_projects").update({
      processing_status: "processing",
      updated_at: new Date().toISOString(),
    }).eq("id", projectId);
  }

  try {
    const download = await userClient.storage.from("central-media").download(asset.storage_path);
    if (download.error || !download.data) throw new Error("Não foi possível ler o PDF");
    if (download.data.size > 20 * 1024 * 1024) throw new Error("PDF maior que 20 MB nesta versão");

    const bytes = new Uint8Array(await download.data.arrayBuffer());
    const fileData = toBase64(bytes);

    const prompt = `Você é o Nexus da Operação Marketing da Candinho Company. Leia integralmente o PDF enviado e transforme o conteúdo em uma página operacional de roteiro, preservando as ideias do documento e sem inventar informações que não estejam presentes. Responda SOMENTE JSON válido, sem markdown, no formato: {"title":"título curto","summary":"resumo fiel do material","objective":"objetivo principal ou null","product":"produto/tema principal ou null","content_format":"reels|story|carrossel|post|campanha|roteiro|outro","audience":"público mencionado ou null","hook":"gancho principal ou null","script_text":"roteiro organizado em texto corrido com seções e falas, mantendo o conteúdo útil do PDF","cta":"chamada para ação ou null","keywords":["palavra1"],"sections":[{"title":"nome da seção","content":"conteúdo"}]}. Se o PDF contiver vários roteiros, organize todos dentro de script_text e sections, sem apagar nenhum roteiro relevante.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${openaiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_file", filename: asset.original_filename ?? "roteiro.pdf", file_data: fileData },
          ],
        }],
      }),
    });

    if (!openaiResponse.ok) {
      const detail = await openaiResponse.text();
      console.error("OpenAI marketing PDF error", openaiResponse.status, detail);
      throw new Error(`Falha ao interpretar PDF (${openaiResponse.status})`);
    }

    const responseJson = await openaiResponse.json();
    const result = parseJson(outputText(responseJson));
    const title = clean(result.title) ?? fallbackTitle ?? "Roteiro";
    const keywords = Array.isArray(result.keywords) ? result.keywords.filter((item: unknown) => typeof item === "string") : [];
    const sections = Array.isArray(result.sections) ? result.sections : [];

    const update = await adminClient.from("marketing_projects").update({
      title,
      summary: clean(result.summary),
      objective: clean(result.objective),
      product: clean(result.product),
      content_format: clean(result.content_format),
      audience: clean(result.audience),
      hook: clean(result.hook),
      script_text: clean(result.script_text),
      cta: clean(result.cta),
      processing_status: "ready",
      ai_metadata: { keywords, sections, model, processed_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq("id", projectId);

    if (update.error) throw update.error;

    await adminClient.from("central_media_assets").update({
      description_ai: clean(result.summary),
      search_text: [asset.original_filename, title, result.summary, result.product, result.content_format, ...keywords].filter(Boolean).join(" "),
      ai_metadata: {
        marketing_ingestion_status: "ready",
        marketing_project_id: projectId,
        model,
        keywords,
        processed_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    }).eq("id", asset.id);

    return json({ processed: true, project_id: projectId, title });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao interpretar PDF";
    await adminClient.from("marketing_projects").update({
      processing_status: "error",
      ai_metadata: { error: message, failed_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq("id", projectId);

    return json({ error: message, project_id: projectId }, 500);
  }
});
