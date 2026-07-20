import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

function outputText(
  response: any,
) {
  if (
    typeof response?.output_text ===
    "string"
  ) {
    return response.output_text;
  }

  for (const item of Array.isArray(
    response?.output,
  )
    ? response.output
    : []) {
    for (const content of Array.isArray(
      item?.content,
    )
      ? item.content
      : []) {
      if (
        content?.type ===
          "output_text" &&
        typeof content.text ===
          "string"
      ) {
        return content.text;
      }
    }
  }

  return "";
}

function clean(value: unknown) {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function parseJson(text: string) {
  const normalized = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(normalized);
  } catch {
    return {
      message: normalized,
    };
  }
}

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

  const url =
    Deno.env.get(
      "SUPABASE_URL",
    );

  const anon =
    Deno.env.get(
      "SUPABASE_ANON_KEY",
    );

  const service =
    Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

  const openai =
    Deno.env.get(
      "OPENAI_API_KEY",
    );

  const model =
    Deno.env.get(
      "OPENAI_POST_SALE_MODEL",
    ) ?? "gpt-5-mini";

  if (
    !url ||
    !anon ||
    !service ||
    !openai
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
        error:
          "Não autenticado",
        code: "AUTH_REQUIRED",
      },
      401,
    );
  }

  const {
    data: canWrite,
    error: permissionError,
  } = await user.rpc(
    "can_write",
  );

  if (permissionError) {
    console.error(
      "post-sale-nexus-suggest permission",
      permissionError.message,
    );

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

  let body: {
    batch_id?: string;
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

  if (!body.batch_id) {
    return reply(
      {
        error:
          "batch_id é obrigatório",
        code: "BATCH_REQUIRED",
      },
      400,
    );
  }

  const {
    data: context,
    error: contextError,
  } = await admin.rpc(
    "post_sale_nexus_context",
    {
      p_batch_id:
        body.batch_id,
    },
  );

  if (contextError) {
    console.error(
      "post-sale-nexus-suggest context",
      contextError.message,
    );

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
          "BATCH_NOT_FOUND",
      },
      404,
    );
  }

  const prompt = `Você é o Nexus, assistente comercial interno da Candinho Suplementos. Gere uma mensagem humana de pós-venda para WhatsApp usando SOMENTE os dados fornecidos. A mensagem deve soar como Igor falando, natural, curta e consultiva, sem parecer automação. Pergunte como a pessoa está se saindo com os produtos e adapte a pergunta ao que ela realmente comprou. Quando houver várias compras próximas, trate tudo em um único contato de forma natural. Não invente uso, sintomas, resultados ou preferências. Não faça diagnóstico ou promessa médica. Respeite campos de sensibilidade à cafeína, ansiedade/insônia e produtos proibidos. Não pressione recompra; cross-sell só pode aparecer em suggested_action, nunca forçado na mensagem. Evite emojis de coração, especialmente em mensagens para mulheres. Retorne SOMENTE JSON válido sem markdown no formato: {"message":"mensagem pronta","context_summary":"resumo interno em 1-3 frases","suggested_action":"próxima ação comercial opcional ou null","warnings":["alertas importantes"],"tone":"descrição curta do tom"}.

CONTEXTO:
${JSON.stringify(context)}`;

  try {
    const aiResponse =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${openai}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            model,
            input: [
              {
                role: "user",
                content: [
                  {
                    type:
                      "input_text",
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        },
      );

    const raw =
      await aiResponse.text();

    if (!aiResponse.ok) {
      let detail =
        raw.slice(0, 500);

      try {
        detail =
          JSON.parse(raw)?.error
            ?.message ?? detail;
      } catch {
        // Mantém trecho bruto.
      }

      throw new Error(
        `OpenAI ${aiResponse.status}: ${detail}`,
      );
    }

    const parsedResponse =
      JSON.parse(raw);

    const text =
      outputText(
        parsedResponse,
      ).trim();

    if (!text) {
      throw new Error(
        "O Nexus não retornou uma mensagem",
      );
    }

    const result =
      parseJson(text);

    const message =
      clean(result.message) ??
      text;

    const metadata = {
      context_summary: clean(
        result.context_summary,
      ),
      suggested_action: clean(
        result.suggested_action,
      ),
      warnings: Array.isArray(
        result.warnings,
      )
        ? result.warnings.filter(
            (
              value: unknown,
            ) =>
              typeof value ===
              "string",
          )
        : [],
      tone: clean(
        result.tone,
      ),
      model,
      generated_at:
        new Date().toISOString(),
    };

    const {
      error: saveError,
    } = await admin.rpc(
      "post_sale_nexus_save_result",
      {
        p_batch_id:
          body.batch_id,
        p_message: message,
        p_metadata: metadata,
      },
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
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao gerar mensagem de pós-venda";

    console.error(
      "post-sale-nexus-suggest generation",
      message,
    );

    return reply(
      {
        error: message,
        code:
          "GENERATION_FAILED",
      },
      500,
    );
  }
});
