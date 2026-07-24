import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  generateNexusEdge,
  NexusEdgeError,
} from "../_shared/nexus-ai.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

function reply(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...cors,
        "content-type":
          "application/json; charset=utf-8",
      },
    },
  );
}

function clean(value: unknown) {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function parseJson(text: string) {
  const normalized = text
    .replace(
      /^```json\s*/i,
      "",
    )
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(
      normalized,
    );
  } catch {
    return {
      message: normalized,
    };
  }
}

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    context_summary: {
      type: [
        "string",
        "null",
      ],
    },
    suggested_action: {
      type: [
        "string",
        "null",
      ],
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    tone: {
      type: [
        "string",
        "null",
      ],
    },
  },
  required: [
    "message",
    "context_summary",
    "suggested_action",
    "warnings",
    "tone",
  ],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: cors,
    });
  }

  if (req.method !== "POST") {
    return reply(
      {
        error:
          "Método não permitido",
      },
      405,
    );
  }

  const url = Deno.env.get(
    "SUPABASE_URL",
  );
  const anon = Deno.env.get(
    "SUPABASE_ANON_KEY",
  );
  const service = Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  );

  if (
    !url ||
    !anon ||
    !service
  ) {
    return reply(
      {
        error:
          "Configuração interna indisponível",
        code: "CONFIG_MISSING",
      },
      503,
    );
  }

  const auth =
    req.headers.get(
      "authorization",
    ) ?? "";

  const user = createClient(
    url,
    anon,
    {
      global: {
        headers: {
          Authorization: auth,
        },
      },
      auth: {
        persistSession: false,
      },
    },
  );

  const admin = createClient(
    url,
    service,
    {
      auth: {
        persistSession: false,
      },
    },
  );

  const {
    data: userData,
    error: authError,
  } = await user.auth.getUser();

  if (
    authError ||
    !userData.user
  ) {
    return reply(
      {
        error: "Não autenticado",
        code: "AUTH_REQUIRED",
      },
      401,
    );
  }

  let body: {
    business?:
      | "supplements"
      | "fitness";
    batch_id?: string;
    customer_id?: string;
    user_context?: string;
  };

  try {
    body = await req.json();
  } catch {
    return reply(
      {
        error: "JSON inválido",
        code: "INVALID_JSON",
      },
      400,
    );
  }

  const business =
    body.business === "fitness"
      ? "fitness"
      : "supplements";

  const userContext =
    clean(
      body.user_context,
    )?.slice(0, 3000) ??
    null;

  const permissionRpc =
    business === "fitness"
      ? "can_write_fitness"
      : "can_write";

  const {
    data: canWrite,
    error: permissionError,
  } = await user.rpc(
    permissionRpc,
  );

  if (permissionError) {
    return reply(
      {
        error:
          "Não foi possível validar sua permissão",
        code:
          "PERMISSION_CHECK_FAILED",
      },
      500,
    );
  }

  if (!canWrite) {
    return reply(
      {
        error:
          "Sem permissão para operar o pós-venda",
        code: "FORBIDDEN",
      },
      403,
    );
  }

  if (
    business === "fitness" &&
    !body.customer_id
  ) {
    return reply(
      {
        error:
          "customer_id é obrigatório",
        code:
          "CUSTOMER_REQUIRED",
      },
      400,
    );
  }

  if (
    business === "supplements" &&
    !body.batch_id
  ) {
    return reply(
      {
        error:
          "batch_id é obrigatório",
        code: "BATCH_REQUIRED",
      },
      400,
    );
  }

  const contextRpc =
    business === "fitness"
      ? "fitness_post_sale_nexus_context"
      : "post_sale_nexus_context";

  const contextArgs =
    business === "fitness"
      ? {
          p_customer_id:
            body.customer_id,
        }
      : {
          p_batch_id:
            body.batch_id,
        };

  const {
    data: context,
    error: contextError,
  } = await admin.rpc(
    contextRpc,
    contextArgs,
  );

  if (contextError) {
    return reply(
      {
        error:
          "Não foi possível carregar o contexto do pós-venda.",
        code:
          "CONTEXT_LOAD_FAILED",
        detail:
          contextError.message,
      },
      500,
    );
  }

  if (!context) {
    return reply(
      {
        error:
          "Acompanhamento de pós-venda não encontrado",
        code:
          "POST_SALE_NOT_FOUND",
      },
      404,
    );
  }

  const brand =
    business === "fitness"
      ? "Candinho Fitness"
      : "Candinho Suplementos";

  const voice =
    business === "fitness"
      ? "Giulia"
      : "Igor";

  const businessRules =
    business === "fitness"
      ? "Você escreve como a Giulia da Candinho Fitness. Faça um pós-venda genuíno sobre as peças compradas: conforto, material, caimento, transparência, tamanho ou experiência de uso somente quando fizer sentido para os produtos reais. Não invente características. Se houver CONTEXTO OPCIONAL, conecte-o naturalmente depois do pós-venda. Varie abertura, pergunta e encerramento."
      : "Você escreve como o Igor da Candinho Suplementos. Faça um pós-venda genuíno e consultivo sobre os produtos realmente comprados. Não invente uso, sintomas ou resultados. Respeite sensibilidades, ansiedade/insônia e produtos proibidos. Se houver CONTEXTO OPCIONAL, conecte-o naturalmente sem pressionar recompra.";

  const prompt = `Você é o Nexus, assistente comercial interno da ${brand}. Gere UMA mensagem curta e humana de pós-venda para WhatsApp ou Instagram usando somente os dados fornecidos. A mensagem deve soar como ${voice} falando de verdade.

${businessRules}

REGRAS GERAIS:
- Priorize relacionamento antes de venda.
- Quando existirem várias compras no ciclo, una tudo em um único contato natural.
- Não invente fatos, resultados, preferências, diagnóstico ou promessas.
- O CONTEXTO OPCIONAL pode estar vazio.
- Evite emojis de coração.
- Analise previous_generated_message e previous_followups e crie algo realmente diferente.

CONTEXTO OPCIONAL:
${userContext ?? "Nenhum contexto adicional informado."}

CONTEXTO REAL:
${JSON.stringify(context)}`;

  try {
    const result =
      await generateNexusEdge(
        {
          system:
            "Você é o Nexus de pós-venda da Candinho Company. Seja humano, específico e fiel ao contexto real.",
          prompt,
          schema: OUTPUT_SCHEMA,
          geminiModel:
            Deno.env.get(
              "GEMINI_POST_SALE_MODEL",
            ) ||
            "gemini-2.5-flash-lite",
          openAIModel:
            Deno.env.get(
              "OPENAI_POST_SALE_MODEL",
            ) ||
            "gpt-5-mini",
        },
      );

    const parsed =
      parseJson(result.text);

    const message =
      clean(parsed.message) ??
      result.text;

    const metadata = {
      context_summary: clean(
        parsed.context_summary,
      ),
      suggested_action: clean(
        parsed.suggested_action,
      ),
      warnings: Array.isArray(
        parsed.warnings,
      )
        ? parsed.warnings.filter(
            (
              value: unknown,
            ): value is string =>
              typeof value ===
              "string",
          )
        : [],
      tone: clean(parsed.tone),
      user_context: userContext,
      business,
      provider:
        result.provider,
      model: result.model,
      generated_at:
        new Date().toISOString(),
    };

    const saveRpc =
      business === "fitness"
        ? "fitness_post_sale_nexus_save_result"
        : "post_sale_nexus_save_result";

    const saveArgs =
      business === "fitness"
        ? {
            p_customer_id:
              body.customer_id,
            p_message: message,
            p_metadata: metadata,
          }
        : {
            p_batch_id:
              body.batch_id,
            p_message: message,
            p_metadata: metadata,
          };

    const {
      error: saveError,
    } = await admin.rpc(
      saveRpc,
      saveArgs,
    );

    if (saveError) {
      throw new Error(
        `Falha ao salvar resultado: ${saveError.message}`,
      );
    }

    return reply({
      message,
      ...metadata,
    });
  } catch (error) {
    if (
      error instanceof
      NexusEdgeError
    ) {
      return reply(
        {
          error: error.message,
          code: error.code,
        },
        error.status,
      );
    }

    return reply(
      {
        error:
          "Não foi possível gerar a mensagem do Nexus agora.",
        code:
          "GENERATION_FAILED",
      },
      500,
    );
  }
});
