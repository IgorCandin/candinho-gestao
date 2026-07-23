import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });
const clean = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
type JsonRecord = Record<string, unknown>;

class QuotaError extends Error {}

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    brand: { type: "string" }, category: { type: "string" }, description: { type: "string" }, objective: { type: "string" },
    ideal_profile: { type: "string" }, duration_days: { type: "integer", minimum: 0 }, information: { type: "string" },
    quick_message: { type: "string" }, keywords: { type: "string" }, level: { type: "string" },
    confidence: { type: "string", enum: ["alta", "media", "baixa"] }, research_note: { type: "string" },
  },
  required: ["brand","category","description","objective","ideal_profile","duration_days","information","quick_message","keywords","level","confidence","research_note"],
  additionalProperties: false,
} as const;

function outputText(payload: JsonRecord) {
  if (typeof payload.output_text === "string") return payload.output_text.trim();
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const content = (item as JsonRecord).content;
    return Array.isArray(content) ? content : [];
  }).filter((item) => item && typeof item === "object" && (item as JsonRecord).type === "output_text")
    .map((item) => String((item as JsonRecord).text ?? "")).join("\n").trim();
}

function sourcesOf(payload: JsonRecord) {
  const sources = new Set<string>();
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const record = item as JsonRecord;
    if (record.type === "web_search_call") {
      const action = record.action && typeof record.action === "object" ? record.action as JsonRecord : null;
      if (action && Array.isArray(action.sources)) for (const source of action.sources) {
        if (source && typeof source === "object" && typeof (source as JsonRecord).url === "string") sources.add(String((source as JsonRecord).url));
      }
    }
  }
  return [...sources].slice(0, 8);
}

async function safeJson(response: Response): Promise<JsonRecord> {
  try { return await response.json() as JsonRecord; } catch { return {}; }
}

function apiError(raw: JsonRecord) {
  const error = raw.error && typeof raw.error === "object" ? raw.error as JsonRecord : null;
  return {
    message: typeof error?.message === "string" ? error.message : "",
    code: typeof error?.code === "string" ? error.code : "",
  };
}

async function requestModel(apiKey: string, model: string, prompt: string, useWeb: boolean) {
  const payload: JsonRecord = {
    model,
    store: false,
    input: [
      { role: "system", content: "Você é o Nexus de cadastro da Candinho Suplementos. Seja útil e conservador: nunca invente dados técnicos, preço, estoque, fornecedor, SKU ou ABCZ." },
      { role: "user", content: prompt },
    ],
    text: { format: { type: "json_schema", name: "candinho_product_enrichment", strict: true, schema: OUTPUT_SCHEMA } },
  };
  if (useWeb) {
    payload.tools = [{ type: "web_search" }];
    payload.include = ["web_search_call.action.sources"];
  }

  let lastError = "Pesquisa temporariamente indisponível.";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(useWeb ? 35_000 : 20_000),
    });
    const raw = await safeJson(response);
    if (response.ok) {
      const text = outputText(raw);
      if (!text) throw new Error("O Nexus não retornou dados estruturados.");
      return { parsed: JSON.parse(text) as JsonRecord, sources: useWeb ? sourcesOf(raw) : [] };
    }

    const detail = apiError(raw);
    const quota = response.status === 429 && (detail.code === "insufficient_quota" || /quota|billing|current plan|exceeded your current quota/i.test(detail.message));
    if (quota) throw new QuotaError("O Nexus está temporariamente indisponível porque a cota da inteligência artificial foi atingida. Regularize o faturamento da API OpenAI e tente novamente.");

    if (response.status === 429) lastError = "O Nexus recebeu muitas solicitações agora. Aguarde um instante e tente novamente.";
    else if (response.status === 401 || response.status === 403) lastError = "A integração do Nexus com a OpenAI precisa ser revisada pelo administrador.";
    else lastError = detail.message ? "A pesquisa do Nexus está temporariamente indisponível." : `Pesquisa temporariamente indisponível (${response.status}).`;

    if (![429,500,502,503,504].includes(response.status) || attempt === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
  }
  throw new Error(lastError);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!url || !anon || !apiKey) return json({ error: "Configuração interna indisponível" }, 503);

  const auth = req.headers.get("authorization") ?? "";
  const supabase = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) return json({ error: "Não autenticado" }, 401);
  const { data: canWrite, error: permissionError } = await supabase.rpc("can_write");
  if (permissionError) return json({ error: "Falha ao validar permissão" }, 500);
  if (!canWrite) return json({ error: "Sem permissão" }, 403);

  let body: JsonRecord;
  try { body = await req.json() as JsonRecord; } catch { return json({ error: "JSON inválido" }, 400); }
  const name = clean(body.name);
  if (!name || name.length < 3) return json({ error: "Informe um nome de produto mais completo." }, 400);
  const existing = body.existing && typeof body.existing === "object" ? body.existing as JsonRecord : {};
  const categories = Array.isArray(body.categories) ? body.categories.filter((x): x is string => typeof x === "string").slice(0, 80) : [];
  const model = Deno.env.get("OPENAI_PRODUCT_ENRICH_MODEL") ?? "gpt-5";

  const baseRules = [
    `Produto: ${name}`,
    `Campos atuais: ${JSON.stringify(existing)}`,
    `Categorias existentes no sistema: ${JSON.stringify(categories)}`,
    "Complete somente campos vazios.",
    "Nunca sugira preço, estoque, fornecedor, SKU ou categoria ABCZ.",
    "Não invente composição, ingredientes, concentração, dose ou promessa de resultado.",
    "Mesmo sem pesquisa externa, produza textos cadastrais seguros para descrição, objetivo, perfil ideal, informativo, mensagem rápida, palavras-chave e nível.",
    "Marca e duração só podem ser preenchidas quando houver evidência suficiente; caso contrário use string vazia e 0.",
  ].join("\n");

  try {
    try {
      const result = await requestModel(apiKey, model, `${baseRules}\nPesquise primeiro na web e priorize fabricante ou página oficial.`, true);
      const p = result.parsed;
      return json({ suggestions: { brand: clean(p.brand), category: clean(p.category), description: clean(p.description), objective: clean(p.objective), ideal_profile: clean(p.ideal_profile), duration_days: Number(p.duration_days) > 0 ? Number(p.duration_days) : null, information: clean(p.information), quick_message: clean(p.quick_message), keywords: clean(p.keywords), level: clean(p.level) }, confidence: ["alta","media","baixa"].includes(String(p.confidence)) ? p.confidence : "baixa", research_note: clean(p.research_note), sources: result.sources, fallback_used: false, saved: false });
    } catch (primaryError) {
      if (primaryError instanceof QuotaError) throw primaryError;
      const result = await requestModel(apiKey, model, `${baseRules}\nA pesquisa externa falhou ou foi limitada. Use somente o nome e os campos atuais para gerar conteúdo descritivo seguro; não invente fatos técnicos.`, false);
      const p = result.parsed;
      return json({ suggestions: { brand: clean(p.brand), category: clean(p.category), description: clean(p.description), objective: clean(p.objective), ideal_profile: clean(p.ideal_profile), duration_days: Number(p.duration_days) > 0 ? Number(p.duration_days) : null, information: clean(p.information), quick_message: clean(p.quick_message), keywords: clean(p.keywords), level: clean(p.level) }, confidence: "baixa", research_note: clean(p.research_note) ?? (primaryError instanceof Error ? primaryError.message : "Pesquisa externa indisponível"), sources: [], fallback_used: true, saved: false });
    }
  } catch (error) {
    if (error instanceof QuotaError) return json({ error: error.message, code: "AI_QUOTA" }, 503);
    return json({ error: error instanceof Error ? error.message : "Falha ao pesquisar produto", code: "AI_UNAVAILABLE" }, 502);
  }
});
