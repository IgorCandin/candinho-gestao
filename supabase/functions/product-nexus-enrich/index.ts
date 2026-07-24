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

const json = (
  body: unknown,
  status = 200,
) =>
  new Response(
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

const clean = (
  value: unknown,
) =>
  typeof value === "string" &&
  value.trim()
    ? value.trim()
    : null;

type JsonRecord =
  Record<string, unknown>;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    brand: { type: "string" },
    category: {
      type: "string",
    },
    description: {
      type: "string",
    },
    objective: {
      type: "string",
    },
    ideal_profile: {
      type: "string",
    },
    duration_days: {
      type: "integer",
      minimum: 0,
    },
    information: {
      type: "string",
    },
    quick_message: {
      type: "string",
    },
    keywords: {
      type: "string",
    },
    level: { type: "string" },
    confidence: {
      type: "string",
      enum: [
        "alta",
        "media",
        "baixa",
      ],
    },
    research_note: {
      type: "string",
    },
  },
  required: [
    "brand",
    "category",
    "description",
    "objective",
    "ideal_profile",
    "duration_days",
    "information",
    "quick_message",
    "keywords",
    "level",
    "confidence",
    "research_note",
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
    return json(
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

  if (!url || !anon) {
    return json(
      {
        error:
          "Configuração interna indisponível",
      },
      503,
    );
  }

  const auth =
    req.headers.get(
      "authorization",
    ) ?? "";

  const supabase = createClient(
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

  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();

  if (
    authError ||
    !userData.user
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
    data: canWrite,
    error: permissionError,
  } = await supabase.rpc(
    "can_write",
  );

  if (permissionError) {
    return json(
      {
        error:
          "Falha ao validar permissão",
      },
      500,
    );
  }

  if (!canWrite) {
    return json(
      {
        error:
          "Sem permissão",
      },
      403,
    );
  }

  let body: JsonRecord;

  try {
    body =
      (await req.json()) as JsonRecord;
  } catch {
    return json(
      {
        error:
          "JSON inválido",
      },
      400,
    );
  }

  const name = clean(
    body.name,
  );

  if (
    !name ||
    name.length < 3
  ) {
    return json(
      {
        error:
          "Informe um nome de produto mais completo.",
      },
      400,
    );
  }

  const existing =
    body.existing &&
    typeof body.existing ===
      "object"
      ? (body.existing as JsonRecord)
      : {};

  const categories =
    Array.isArray(
      body.categories,
    )
      ? body.categories
          .filter(
            (
              value,
            ): value is string =>
              typeof value ===
              "string",
          )
          .slice(0, 80)
      : [];

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
      const result =
        await generateNexusEdge(
          {
            system:
              "Você é o Nexus de cadastro da Candinho Suplementos. Seja útil e conservador: nunca invente dados técnicos, preço, estoque, fornecedor, SKU ou ABCZ.",
            prompt:
              `${baseRules}\nPesquise primeiro na web e priorize fabricante ou página oficial.`,
            schema: OUTPUT_SCHEMA,
            webSearch: true,
            geminiModel:
              Deno.env.get(
                "GEMINI_PRODUCT_ENRICH_MODEL",
              ) ||
              "gemini-2.5-flash-lite",
            openAIModel:
              Deno.env.get(
                "OPENAI_PRODUCT_ENRICH_MODEL",
              ) ||
              "gpt-5",
          },
        );

      const p =
        JSON.parse(
          result.text,
        ) as JsonRecord;

      return json({
        suggestions: {
          brand: clean(p.brand),
          category: clean(
            p.category,
          ),
          description: clean(
            p.description,
          ),
          objective: clean(
            p.objective,
          ),
          ideal_profile: clean(
            p.ideal_profile,
          ),
          duration_days:
            Number(
              p.duration_days,
            ) > 0
              ? Number(
                  p.duration_days,
                )
              : null,
          information: clean(
            p.information,
          ),
          quick_message: clean(
            p.quick_message,
          ),
          keywords: clean(
            p.keywords,
          ),
          level: clean(p.level),
        },
        confidence: [
          "alta",
          "media",
          "baixa",
        ].includes(
          String(
            p.confidence,
          ),
        )
          ? p.confidence
          : "baixa",
        research_note: clean(
          p.research_note,
        ),
        sources:
          result.sources,
        fallback_used: false,
        saved: false,
        provider:
          result.provider,
        model: result.model,
      });
    } catch (primaryError) {
      const result =
        await generateNexusEdge(
          {
            system:
              "Você é o Nexus de cadastro da Candinho Suplementos. Gere somente conteúdo descritivo seguro e nunca invente fatos técnicos.",
            prompt:
              `${baseRules}\nA pesquisa externa falhou ou foi limitada. Use somente o nome e os campos atuais.`,
            schema: OUTPUT_SCHEMA,
            webSearch: false,
            geminiModel:
              Deno.env.get(
                "GEMINI_PRODUCT_ENRICH_MODEL",
              ) ||
              "gemini-2.5-flash-lite",
            openAIModel:
              Deno.env.get(
                "OPENAI_PRODUCT_ENRICH_MODEL",
              ) ||
              "gpt-5",
          },
        );

      const p =
        JSON.parse(
          result.text,
        ) as JsonRecord;

      return json({
        suggestions: {
          brand: clean(p.brand),
          category: clean(
            p.category,
          ),
          description: clean(
            p.description,
          ),
          objective: clean(
            p.objective,
          ),
          ideal_profile: clean(
            p.ideal_profile,
          ),
          duration_days:
            Number(
              p.duration_days,
            ) > 0
              ? Number(
                  p.duration_days,
                )
              : null,
          information: clean(
            p.information,
          ),
          quick_message: clean(
            p.quick_message,
          ),
          keywords: clean(
            p.keywords,
          ),
          level: clean(p.level),
        },
        confidence: "baixa",
        research_note:
          clean(
            p.research_note,
          ) ??
          (primaryError instanceof
          Error
            ? primaryError.message
            : "Pesquisa externa indisponível"),
        sources: [],
        fallback_used: true,
        saved: false,
        provider:
          result.provider,
        model: result.model,
      });
    }
  } catch (error) {
    if (
      error instanceof
      NexusEdgeError
    ) {
      return json(
        {
          error: error.message,
          code: error.code,
        },
        error.status,
      );
    }

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao pesquisar produto",
        code:
          "AI_UNAVAILABLE",
      },
      502,
    );
  }
});
