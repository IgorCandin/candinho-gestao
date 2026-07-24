import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  generateNexus,
  nexusErrorResponse,
  type JsonRecord,
} from "@/lib/nexus-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

type SuggestionPayload = {
  brand: string;
  category: string;
  description: string;
  objective: string;
  ideal_profile: string;
  duration_days: number;
  information: string;
  quick_message: string;
  keywords: string;
  level: string;
  confidence:
    | "alta"
    | "media"
    | "baixa";
  research_note: string;
};

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    brand: { type: "string" },
    category: { type: "string" },
    description: { type: "string" },
    objective: { type: "string" },
    ideal_profile: { type: "string" },
    duration_days: {
      type: "integer",
      minimum: 0,
    },
    information: { type: "string" },
    quick_message: { type: "string" },
    keywords: { type: "string" },
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
} as const;

function clean(value: unknown) {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : "";
}

function normalizeSuggestion(
  value: unknown,
): SuggestionPayload {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new Error(
      "O Nexus retornou uma resposta inválida.",
    );
  }

  const row = value as JsonRecord;
  const confidence = clean(
    row.confidence,
  );

  return {
    brand: clean(row.brand),
    category: clean(row.category),
    description: clean(
      row.description,
    ),
    objective: clean(row.objective),
    ideal_profile: clean(
      row.ideal_profile,
    ),
    duration_days: Math.max(
      0,
      Number(
        row.duration_days ?? 0,
      ) || 0,
    ),
    information: clean(
      row.information,
    ),
    quick_message: clean(
      row.quick_message,
    ),
    keywords: clean(row.keywords),
    level: clean(row.level),
    confidence:
      confidence === "alta" ||
      confidence === "media"
        ? confidence
        : "baixa",
    research_note: clean(
      row.research_note,
    ),
  };
}

function usefulTextCount(
  value: SuggestionPayload,
) {
  return [
    value.description,
    value.objective,
    value.ideal_profile,
    value.information,
    value.quick_message,
    value.keywords,
    value.level,
  ].filter(Boolean).length;
}

function mergeSuggestions(
  primary: SuggestionPayload | null,
  fallback: SuggestionPayload,
): SuggestionPayload {
  if (!primary) return fallback;

  return {
    brand:
      primary.brand ||
      fallback.brand,
    category:
      primary.category ||
      fallback.category,
    description:
      primary.description ||
      fallback.description,
    objective:
      primary.objective ||
      fallback.objective,
    ideal_profile:
      primary.ideal_profile ||
      fallback.ideal_profile,
    duration_days:
      primary.duration_days > 0
        ? primary.duration_days
        : fallback.duration_days,
    information:
      primary.information ||
      fallback.information,
    quick_message:
      primary.quick_message ||
      fallback.quick_message,
    keywords:
      primary.keywords ||
      fallback.keywords,
    level:
      primary.level ||
      fallback.level,
    confidence:
      primary.confidence ===
        "alta" ||
      primary.confidence ===
        "media"
        ? primary.confidence
        : fallback.confidence,
    research_note: [
      primary.research_note,
      fallback.research_note,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();

    if (!access.canWriteSupplements) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para completar produtos.",
        },
        { status: 403 },
      );
    }

    const body = (await request
      .json()
      .catch(() => ({}))) as JsonRecord;

    const name = clean(body.name);

    if (name.length < 3) {
      return NextResponse.json(
        {
          error:
            "Informe um nome de produto mais completo.",
        },
        { status: 400 },
      );
    }

    const existing =
      body.existing &&
      typeof body.existing === "object"
        ? (body.existing as JsonRecord)
        : {};

    const categories =
      Array.isArray(body.categories)
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

    const category = clean(
      existing.category,
    );

    const isAccessory =
      category
        .toLocaleLowerCase(
          "pt-BR",
        )
        .includes("acess");

    const baseRules = [
      `Produto: ${name}`,
      `Campos atuais: ${JSON.stringify(
        existing,
      )}`,
      `Categorias existentes no sistema: ${JSON.stringify(
        categories,
      )}`,
      "",
      "REGRAS OBRIGATÓRIAS:",
      "- O objetivo é completar SOMENTE campos vazios; campos já preenchidos servem como contexto.",
      "- Nunca sugira preço, estoque, fornecedor, SKU ou categoria ABCZ.",
      "- Marca só pode ser preenchida quando estiver explícita no nome ou confirmada por fonte confiável. Se houver dúvida, retorne string vazia.",
      "- Duração/doses só pode ser preenchida quando houver informação explícita e verificável. Se houver dúvida, retorne 0.",
      "- Mesmo sem fonte oficial, preencha de forma útil os campos descritivos seguros: descrição, objetivo, perfil ideal, informativo, mensagem rápida, palavras-chave e nível.",
      "- Nos textos de fallback, não invente composição, ingredientes, concentração, dose, tecnologia ou promessa de resultado.",
      "- Não faça promessa de cura, diagnóstico ou tratamento.",
      "- Descrição: curta e objetiva, adequada ao catálogo.",
      "- Objetivo: finalidade geral do tipo de produto, sem promessa garantida.",
      "- Perfil ideal: público geral que costuma buscar esse tipo de produto, sem orientação médica individual.",
      "- Informativo: texto neutro para atendimento, recomendando conferir rótulo quando detalhes técnicos não forem confirmados.",
      "- Mensagem rápida: natural, curta e pronta para WhatsApp, sem pressão de venda.",
      "- Palavras-chave: termos separados por vírgula.",
      "- Nível: use um rótulo curto e comercial apenas quando fizer sentido; caso contrário, string vazia.",
      ...(isAccessory
        ? [
            "- Este produto é um ACESSÓRIO GENÉRICO: brand deve ser string vazia e duration_days deve ser 0.",
          ]
        : []),
      "",
      "Na research_note, explique em uma frase se os dados vieram de pesquisa confirmada ou de fallback descritivo seguro.",
    ].join("\n");

    async function callModel(
      webSearch: boolean,
    ) {
      const result =
        await generateNexus({
          system:
            "Você é o Nexus de cadastro da Candinho Suplementos. Complete cadastros com utilidade prática, seja conservador com fatos técnicos e nunca invente dados de rótulo.",
          prompt: [
            baseRules,
            webSearch
              ? "Pesquise primeiro na web. Priorize fabricante, marca e página oficial."
              : "A pesquisa externa não pôde ser usada. Gere somente textos cadastrais seguros a partir do nome, categoria e campos existentes.",
          ].join("\n\n"),
          schema:
            OUTPUT_SCHEMA as unknown as JsonRecord,
          webSearch,
          geminiModel:
            process.env
              .GEMINI_PRODUCT_ENRICH_MODEL ||
            "gemini-2.5-flash-lite",
          openAIModel:
            process.env
              .OPENAI_PRODUCT_ENRICH_MODEL ||
            "gpt-5",
          timeoutMs: webSearch
            ? 40_000
            : 25_000,
        });

      return {
        suggestion:
          normalizeSuggestion(
            JSON.parse(
              result.text,
            ),
          ),
        sources: result.sources,
        provider:
          result.provider,
        model: result.model,
      };
    }

    let primary:
      | Awaited<
          ReturnType<
            typeof callModel
          >
        >
      | null = null;

    let primaryError:
      | string
      | null = null;

    try {
      primary =
        await callModel(true);
    } catch (error) {
      primaryError =
        error instanceof Error
          ? error.message
          : "Pesquisa web indisponível.";
    }

    let finalSuggestion =
      primary?.suggestion ?? null;

    const sources =
      primary?.sources ?? [];

    const usedFallback =
      !primary ||
      usefulTextCount(
        primary.suggestion,
      ) < 2;

    let fallbackProvider:
      | string
      | null = null;

    let fallbackModel:
      | string
      | null = null;

    if (usedFallback) {
      const fallback =
        await callModel(false);

      finalSuggestion =
        mergeSuggestions(
          finalSuggestion,
          fallback.suggestion,
        );

      fallbackProvider =
        fallback.provider;

      fallbackModel =
        fallback.model;

      if (primaryError) {
        finalSuggestion.research_note =
          [
            "A pesquisa web não pôde ser concluída; foi usado fallback descritivo seguro.",
            finalSuggestion.research_note,
          ]
            .filter(Boolean)
            .join(" ");
      }
    }

    if (!finalSuggestion) {
      throw new Error(
        "Não foi possível gerar sugestões para este produto.",
      );
    }

    if (isAccessory) {
      finalSuggestion.brand = "";
      finalSuggestion.duration_days = 0;
    }

    return NextResponse.json({
      suggestions: {
        brand:
          finalSuggestion.brand ||
          null,
        category:
          finalSuggestion.category ||
          null,
        description:
          finalSuggestion.description ||
          null,
        objective:
          finalSuggestion.objective ||
          null,
        ideal_profile:
          finalSuggestion.ideal_profile ||
          null,
        duration_days:
          finalSuggestion.duration_days >
          0
            ? finalSuggestion.duration_days
            : null,
        information:
          finalSuggestion.information ||
          null,
        quick_message:
          finalSuggestion.quick_message ||
          null,
        keywords:
          finalSuggestion.keywords ||
          null,
        level:
          finalSuggestion.level ||
          null,
      },
      confidence:
        finalSuggestion.confidence,
      research_note:
        finalSuggestion.research_note ||
        (usedFallback
          ? "Conteúdo descritivo seguro gerado sem confirmação de fonte externa."
          : "Pesquisa concluída."),
      sources,
      fallback_used:
        usedFallback,
      saved: false,
      provider:
        primary?.provider ||
        fallbackProvider,
      model:
        primary?.model ||
        fallbackModel,
    });
  } catch (error) {
    const friendly =
      nexusErrorResponse(error);

    return NextResponse.json(
      {
        error: friendly.error,
        code: friendly.code,
      },
      { status: friendly.status },
    );
  }
}
