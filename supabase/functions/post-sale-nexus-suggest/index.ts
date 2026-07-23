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

function parseJson(text: string) {
  const normalized = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
  try { return JSON.parse(normalized); } catch { return { message: normalized }; }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function parseOpenAIError(raw: string) {
  let message = raw.slice(0, 500);
  let code = "";
  try {
    const parsed = JSON.parse(raw);
    message = parsed?.error?.message ?? message;
    code = parsed?.error?.code ?? "";
  } catch {
    // Mantém o trecho bruto apenas para classificação interna.
  }
  return { message, code };
}

function friendlyOpenAIError(status: number, raw: string) {
  const detail = parseOpenAIError(raw);
  const quota = detail.code === "insufficient_quota"
    || /exceeded your current quota|current quota|billing|current plan|insufficient quota/i.test(detail.message);

  if (status === 429 && quota) {
    return {
      status: 503,
      code: "AI_QUOTA",
      error: "O Nexus está temporariamente indisponível porque a cota da inteligência artificial foi atingida. Regularize o faturamento da API OpenAI e tente novamente.",
    };
  }

  if (status === 429) {
    return {
      status: 503,
      code: "AI_BUSY",
      error: "O Nexus recebeu muitas solicitações agora. Aguarde um instante e tente novamente.",
    };
  }

  if (status === 401 || status === 403) {
    return {
      status: 503,
      code: "AI_AUTH",
      error: "A integração do Nexus com a OpenAI precisa ser revisada pelo administrador.",
    };
  }

  return {
    status: 502,
    code: "AI_UNAVAILABLE",
    error: "O Nexus está temporariamente indisponível. Tente novamente em alguns instantes.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openai = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_POST_SALE_MODEL") ?? "gpt-5-mini";

  if (!url || !anon || !service || !openai) {
    return reply({ error: "Configuração interna indisponível", code: "CONFIG_MISSING" }, 503);
  }

  const auth = req.headers.get("authorization") ?? "";
  const user = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const { data: userData, error: authError } = await user.auth.getUser();
  if (authError || !userData.user) {
    return reply({ error: "Não autenticado", code: "AUTH_REQUIRED" }, 401);
  }

  let body: {
    business?: "supplements" | "fitness";
    batch_id?: string;
    customer_id?: string;
    user_context?: string;
  };

  try { body = await req.json(); }
  catch { return reply({ error: "JSON inválido", code: "INVALID_JSON" }, 400); }

  const business = body.business === "fitness" ? "fitness" : "supplements";
  const userContext = clean(body.user_context)?.slice(0, 3000) ?? null;

  const permissionRpc = business === "fitness" ? "can_write_fitness" : "can_write";
  const { data: canWrite, error: permissionError } = await user.rpc(permissionRpc);

  if (permissionError) {
    console.error("post-sale permission", permissionError.message);
    return reply({ error: "Não foi possível validar sua permissão", code: "PERMISSION_CHECK_FAILED" }, 500);
  }
  if (!canWrite) return reply({ error: "Sem permissão para operar o pós-venda", code: "FORBIDDEN" }, 403);

  if (business === "fitness" && !body.customer_id) {
    return reply({ error: "customer_id é obrigatório", code: "CUSTOMER_REQUIRED" }, 400);
  }
  if (business === "supplements" && !body.batch_id) {
    return reply({ error: "batch_id é obrigatório", code: "BATCH_REQUIRED" }, 400);
  }

  const contextRpc = business === "fitness" ? "fitness_post_sale_nexus_context" : "post_sale_nexus_context";
  const contextArgs = business === "fitness"
    ? { p_customer_id: body.customer_id }
    : { p_batch_id: body.batch_id };

  const { data: context, error: contextError } = await admin.rpc(contextRpc, contextArgs);

  if (contextError) {
    console.error("post-sale context", contextError.message);
    return reply({
      error: "Não foi possível carregar o contexto do pós-venda.",
      code: "CONTEXT_LOAD_FAILED",
      detail: contextError.message,
    }, 500);
  }

  if (!context) return reply({ error: "Acompanhamento de pós-venda não encontrado", code: "POST_SALE_NOT_FOUND" }, 404);

  const brand = business === "fitness" ? "Candinho Fitness" : "Candinho Suplementos";
  const voice = business === "fitness" ? "Giulia" : "Igor";

  const businessRules = business === "fitness"
    ? `Você escreve como a Giulia da Candinho Fitness. Faça um pós-venda genuíno sobre as peças compradas: conforto, material, caimento, transparência, tamanho ou experiência de uso somente quando fizer sentido para os produtos reais. Não invente características que não estejam no contexto. Se houver um CONTEXTO OPCIONAL (promoção, novidade ou assunto do dia), conecte-o naturalmente depois do pós-venda, sem transformar a mensagem inteira em anúncio. Evite mensagens genéricas como apenas "gostou do produto?". Varie abertura, pergunta e encerramento e não repita a mensagem anterior.`
    : `Você escreve como o Igor da Candinho Suplementos. Faça um pós-venda genuíno e consultivo sobre os produtos realmente comprados, perguntando de forma específica sobre adaptação, rotina ou percepção quando isso for seguro e fizer sentido. Não invente uso, sintomas ou resultados. Respeite sensibilidades, ansiedade/insônia e produtos proibidos presentes no contexto. Se houver um CONTEXTO OPCIONAL (promoção, novidade ou assunto do dia), conecte-o naturalmente depois do pós-venda, sem pressionar recompra. Varie abertura, pergunta e encerramento e não repita a mensagem anterior.`;

  const prompt = `Você é o Nexus, assistente comercial interno da ${brand}. Gere UMA mensagem curta e humana de pós-venda para WhatsApp ou Instagram usando somente os dados fornecidos. A mensagem deve soar como ${voice} falando de verdade, não como automação.

${businessRules}

REGRAS GERAIS:
- Priorize relacionamento antes de venda.
- Quando existirem várias compras no ciclo, una tudo em um único contato natural.
- Não invente fatos, resultados, preferências, diagnóstico ou promessas.
- O CONTEXTO OPCIONAL pode estar vazio; nesse caso gere normalmente sem mencionar que faltou contexto.
- Se houver contexto opcional, use apenas o que foi escrito e integre de modo orgânico.
- Evite emojis de coração.
- Analise previous_generated_message e previous_followups quando existirem e crie algo realmente diferente.
- Retorne SOMENTE JSON válido sem markdown no formato: {"message":"mensagem pronta","context_summary":"resumo interno em 1-3 frases","suggested_action":"próxima ação comercial opcional ou null","warnings":["alertas importantes"],"tone":"descrição curta do tom"}.

CONTEXTO OPCIONAL INFORMADO PELO OPERADOR:
${userContext ?? "Nenhum contexto adicional informado."}

CONTEXTO REAL DO CLIENTE E DAS COMPRAS:
${JSON.stringify(context)}`;

  let aiResponse: Response | null = null;
  let raw = "";

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      aiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${openai}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
        }),
      });
      raw = await aiResponse.text();

      if (aiResponse.ok) break;
      const detail = parseOpenAIError(raw);
      const isQuota = aiResponse.status === 429
        && (detail.code === "insufficient_quota"
          || /exceeded your current quota|current quota|billing|current plan|insufficient quota/i.test(detail.message));
      if (isQuota || ![429, 500, 502, 503, 504].includes(aiResponse.status) || attempt === 2) break;
      await sleep(700 * (attempt + 1));
    }

    if (!aiResponse || !aiResponse.ok) {
      const friendly = friendlyOpenAIError(aiResponse?.status ?? 500, raw);
      console.error("post-sale OpenAI", aiResponse?.status ?? 500, parseOpenAIError(raw).code);
      return reply({ error: friendly.error, code: friendly.code }, friendly.status);
    }

    const parsedResponse = JSON.parse(raw);
    const text = outputText(parsedResponse).trim();
    if (!text) throw new Error("O Nexus não retornou uma mensagem");

    const result = parseJson(text);
    const message = clean(result.message) ?? text;
    const metadata = {
      context_summary: clean(result.context_summary),
      suggested_action: clean(result.suggested_action),
      warnings: Array.isArray(result.warnings)
        ? result.warnings.filter((value: unknown) => typeof value === "string")
        : [],
      tone: clean(result.tone),
      user_context: userContext,
      business,
      model,
      generated_at: new Date().toISOString(),
    };

    const saveRpc = business === "fitness"
      ? "fitness_post_sale_nexus_save_result"
      : "post_sale_nexus_save_result";
    const saveArgs = business === "fitness"
      ? { p_customer_id: body.customer_id, p_message: message, p_metadata: metadata }
      : { p_batch_id: body.batch_id, p_message: message, p_metadata: metadata };

    const { error: saveError } = await admin.rpc(saveRpc, saveArgs);
    if (saveError) throw new Error(`Falha ao salvar resultado: ${saveError.message}`);

    return reply({ message, ...metadata });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar mensagem de pós-venda";
    console.error("post-sale generation", message);
    return reply({
      error: "Não foi possível gerar a mensagem do Nexus agora. Tente novamente em alguns instantes.",
      code: "GENERATION_FAILED",
    }, 500);
  }
});
