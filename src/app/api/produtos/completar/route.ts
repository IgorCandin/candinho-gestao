import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";

export const runtime = "nodejs";
export const maxDuration = 60;

type JsonRecord = Record<string, unknown>;

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
  confidence: "alta" | "media" | "baixa";
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
    duration_days: { type: "integer", minimum: 0 },
    information: { type: "string" },
    quick_message: { type: "string" },
    keywords: { type: "string" },
    level: { type: "string" },
    confidence: {
      type: "string",
      enum: ["alta", "media", "baixa"],
    },
    research_note: { type: "string" },
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
  return typeof value === "string" && value.trim()
    ? value.trim()
    : "";
}

function extractOutputText(payload: JsonRecord) {
  if (typeof payload.output_text === "string") {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload.output) ? payload.output : [];

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as JsonRecord;
      return Array.isArray(record.content) ? record.content : [];
    })
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        (item as JsonRecord).type === "output_text",
    )
    .map((item) => String((item as JsonRecord).text ?? ""))
    .join("\n")
    .trim();
}

function extractSources(payload: JsonRecord) {
  const sources = new Set<string>();
  const output = Array.isArray(payload.output) ? payload.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const record = item as JsonRecord;

    if (record.type === "web_search_call") {
      const action =
        record.action && typeof record.action === "object"
          ? (record.action as JsonRecord)
          : null;

      if (action && Array.isArray(action.sources)) {
        for (const source of action.sources) {
          if (!source || typeof source !== "object") continue;
          const url = (source as JsonRecord).url;
          if (typeof url === "string" && url) sources.add(url);
        }
      }
    }

    if (!Array.isArray(record.content)) continue;

    for (const content of record.content) {
      if (!content || typeof content !== "object") continue;
      const annotations = (content as JsonRecord).annotations;
      if (!Array.isArray(annotations)) continue;

      for (const annotation of annotations) {
        if (!annotation || typeof annotation !== "object") continue;
        const value = annotation as JsonRecord;

        if (typeof value.url === "string") {
          sources.add(value.url);
          continue;
        }

        if (
          value.url_citation &&
          typeof value.url_citation === "object" &&
          typeof (value.url_citation as JsonRecord).url === "string"
        ) {
          sources.add(String((value.url_citation as JsonRecord).url));
        }
      }
    }
  }

  return [...sources].slice(0, 8);
}

function normalizeSuggestion(value: unknown): SuggestionPayload {
  if (!value || typeof value !== "object") {
    throw new Error("O Nexus retornou uma resposta inválida.");
  }

  const row = value as JsonRecord;
  const confidence = clean(row.confidence);

  return {
    brand: clean(row.brand),
    category: clean(row.category),
    description: clean(row.description),
    objective: clean(row.objective),
    ideal_profile: clean(row.ideal_profile),
    duration_days: Math.max(0, Number(row.duration_days ?? 0) || 0),
    information: clean(row.information),
    quick_message: clean(row.quick_message),
    keywords: clean(row.keywords),
    level: clean(row.level),
    confidence:
      confidence === "alta" || confidence === "media"
        ? confidence
        : "baixa",
    research_note: clean(row.research_note),
  };
}

function usefulTextCount(value: SuggestionPayload) {
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
    brand: primary.brand || fallback.brand,
    category: primary.category || fallback.category,
    description: primary.description || fallback.description,
    objective: primary.objective || fallback.objective,
    ideal_profile: primary.ideal_profile || fallback.ideal_profile,
    duration_days:
      primary.duration_days > 0
        ? primary.duration_days
        : fallback.duration_days,
    information: primary.information || fallback.information,
    quick_message: primary.quick_message || fallback.quick_message,
    keywords: primary.keywords || fallback.keywords,
    level: primary.level || fallback.level,
    confidence:
      primary.confidence === "alta" || primary.confidence === "media"
        ? primary.confidence
        : fallback.confidence,
    research_note: [primary.research_note, fallback.research_note]
      .filter(Boolean)
      .join(" "),
  };
}

function nullable(value: string) {
  return value || null;
}

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();

    if (!access.canWriteSupplements) {
      return NextResponse.json(
        { error: "Sem permissão para completar produtos." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const name = clean(body.name);

    if (name.length < 3) {
      return NextResponse.json(
        { error: "Informe um nome de produto mais completo." },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não está disponível neste deployment." },
        { status: 503 },
      );
    }

    const existing =
      body.existing && typeof body.existing === "object"
        ? (body.existing as JsonRecord)
        : {};

    const categories = Array.isArray(body.categories)
      ? body.categories
          .filter((value): value is string => typeof value === "string")
          .slice(0, 80)
      : [];

    const imageUrl = clean(body.image_url);
    const category = clean(existing.category);
    const isAccessory = category
      .toLocaleLowerCase("pt-BR")
      .includes("acess");

    const model = process.env.OPENAI_PRODUCT_ENRICH_MODEL || "gpt-5";

    async function callModel(useWeb: boolean) {
      const modeInstruction = useWeb
        ? "Pesquise primeiro na web. Priorize fabricante, marca e página oficial."
        : "A pesquisa externa não encontrou dados suficientes. Gere somente textos cadastrais seguros a partir do nome, categoria, campos existentes e imagem disponível.";

      const prompt = [
        `Produto: ${name}`,
        `Campos atuais: ${JSON.stringify(existing)}`,
        `Categorias existentes no sistema: ${JSON.stringify(categories)}`,
        "",
        modeInstruction,
        "",
        "REGRAS OBRIGATÓRIAS:",
        "- O objetivo é completar SOMENTE campos vazios; campos já preenchidos servem como contexto.",
        "- Nunca sugira preço, estoque, fornecedor, SKU ou categoria ABCZ.",
        "- Marca só pode ser preenchida quando estiver explícita no nome, na imagem ou confirmada por fonte confiável. Se houver dúvida, retorne string vazia.",
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

      const content: Array<Record<string, string>> = [
        {
          type: "input_text",
          text: prompt,
        },
      ];

      if (/^https?:\/\//i.test(imageUrl)) {
        content.push({
          type: "input_image",
          image_url: imageUrl,
        });
      }

      const payload: JsonRecord = {
        model,
        store: false,
        input: [
          {
            role: "system",
            content:
              "Você é o Nexus de cadastro da Candinho Suplementos. Complete cadastros com utilidade prática, mas seja conservador com fatos técnicos e nunca invente dados de rótulo.",
          },
          {
            role: "user",
            content,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "candinho_product_enrichment",
            schema: OUTPUT_SCHEMA,
            strict: true,
          },
        },
      };

      if (useWeb) {
        payload.tools = [{ type: "web_search" }];
        payload.include = ["web_search_call.action.sources"];
      }

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(useWeb ? 35_000 : 20_000),
      });

      const raw = (await response.json()) as JsonRecord;

      if (!response.ok) {
        const apiError = raw.error;
        const message =
          apiError &&
          typeof apiError === "object" &&
          typeof (apiError as JsonRecord).message === "string"
            ? String((apiError as JsonRecord).message)
            : `Pesquisa falhou (${response.status}).`;

        throw new Error(message);
      }

      const outputText = extractOutputText(raw);

      if (!outputText) {
        throw new Error("O Nexus não retornou dados estruturados.");
      }

      return {
        suggestion: normalizeSuggestion(JSON.parse(outputText)),
        sources: useWeb ? extractSources(raw) : [],
      };
    }

    let primary: Awaited<ReturnType<typeof callModel>> | null = null;
    let primaryError: string | null = null;

    try {
      primary = await callModel(true);
    } catch (error) {
      primaryError =
        error instanceof Error ? error.message : "Pesquisa web indisponível.";
    }

    let finalSuggestion = primary?.suggestion ?? null;
    let sources = primary?.sources ?? [];
    let usedFallback = !primary || usefulTextCount(primary.suggestion) < 2;

    if (usedFallback) {
      const fallback = await callModel(false);
      finalSuggestion = mergeSuggestions(finalSuggestion, fallback.suggestion);

      if (primaryError) {
        finalSuggestion.research_note = [
          `A pesquisa web não pôde ser concluída: ${primaryError}`,
          finalSuggestion.research_note,
        ]
          .filter(Boolean)
          .join(" ");
      }
    }

    if (!finalSuggestion) {
      throw new Error("Não foi possível gerar sugestões para este produto.");
    }

    if (isAccessory) {
      finalSuggestion.brand = "";
      finalSuggestion.duration_days = 0;
    }

    return NextResponse.json({
      suggestions: {
        brand: nullable(finalSuggestion.brand),
        category: nullable(finalSuggestion.category),
        description: nullable(finalSuggestion.description),
        objective: nullable(finalSuggestion.objective),
        ideal_profile: nullable(finalSuggestion.ideal_profile),
        duration_days:
          finalSuggestion.duration_days > 0
            ? finalSuggestion.duration_days
            : null,
        information: nullable(finalSuggestion.information),
        quick_message: nullable(finalSuggestion.quick_message),
        keywords: nullable(finalSuggestion.keywords),
        level: nullable(finalSuggestion.level),
      },
      confidence: usedFallback
        ? finalSuggestion.confidence === "alta"
          ? "media"
          : finalSuggestion.confidence
        : finalSuggestion.confidence,
      research_note: finalSuggestion.research_note || null,
      sources,
      saved: false,
      fallback_used: usedFallback,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível completar o produto.",
      },
      { status: 500 },
    );
  }
}
