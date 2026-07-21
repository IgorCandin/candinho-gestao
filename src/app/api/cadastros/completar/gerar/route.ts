import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ModuleName = "supplements" | "fitness";
type BatchItem = { module: ModuleName; entityId: string };
type JsonRecord = Record<string, unknown>;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    suggested_name: { type: "string" },
    suggested_brand: { type: "string" },
    suggested_category: { type: "string" },
    description: { type: "string" },
    objective: { type: "string" },
    ideal_profile: { type: "string" },
    information: { type: "string" },
    quick_message: { type: "string" },
    keywords: { type: "string" },
    normalization_notes: { type: "string" },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: [
    "suggested_name",
    "suggested_brand",
    "suggested_category",
    "description",
    "objective",
    "ideal_profile",
    "information",
    "quick_message",
    "keywords",
    "normalization_notes",
    "confidence",
  ],
  additionalProperties: false,
} as const;

function extractOutputText(payload: JsonRecord) {
  const output = Array.isArray(payload.output) ? payload.output : [];

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as JsonRecord;
      if (record.type !== "message" || !Array.isArray(record.content)) return [];
      return record.content;
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

function nonEmpty(value: unknown) {
  return Boolean(String(value ?? "").trim());
}

async function loadItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  item: BatchItem,
) {
  if (item.module === "supplements") {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,name,sku,category,brand,description,image_url,objective,ideal_profile,information,quick_message,keywords",
      )
      .eq("id", item.entityId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Produto de Suplementos não encontrado.");

    return { module: "supplements" as const, data, variants: [] };
  }

  const [productResult, variantsResult] = await Promise.all([
    supabase
      .from("fitness_products")
      .select("id,name,category,description,image_url")
      .eq("id", item.entityId)
      .maybeSingle(),
    supabase
      .from("fitness_variants")
      .select("size,color,sku")
      .eq("product_id", item.entityId)
      .eq("active", true),
  ]);

  if (productResult.error) throw productResult.error;
  if (variantsResult.error) throw variantsResult.error;
  if (!productResult.data) throw new Error("Produto Fitness não encontrado.");

  return {
    module: "fitness" as const,
    data: productResult.data,
    variants: variantsResult.data ?? [],
  };
}

function generatedFields(
  module: ModuleName,
  current: JsonRecord,
  suggestion: JsonRecord,
) {
  const result: string[] = [];

  if (
    !nonEmpty(current.category) &&
    nonEmpty(suggestion.suggested_category)
  ) {
    result.push("Categoria");
  }

  if (
    !nonEmpty(current.description) &&
    nonEmpty(suggestion.description)
  ) {
    result.push("Descrição");
  }

  if (module === "supplements") {
    if (!nonEmpty(current.brand) && nonEmpty(suggestion.suggested_brand)) {
      result.push("Marca");
    }

    const fields = [
      ["objective", "Objetivo"],
      ["ideal_profile", "Perfil ideal"],
      ["information", "Informativo"],
      ["quick_message", "Mensagem rápida"],
      ["keywords", "Palavras-chave"],
    ] as const;

    for (const [key, label] of fields) {
      if (!nonEmpty(current[key]) && nonEmpty(suggestion[key])) {
        result.push(label);
      }
    }
  }

  return result;
}

async function generateOne(
  apiKey: string,
  model: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  item: BatchItem,
) {
  const loaded = await loadItem(supabase, item);
  const product = loaded.data as JsonRecord;

  const variantsText = loaded.variants.length
    ? loaded.variants
        .map((variant) => `${variant.size} / ${variant.color}`)
        .join(", ")
    : "não informado";

  const moduleRules =
    loaded.module === "supplements"
      ? [
          "Módulo: Candinho Suplementos.",
          "Gere textos curtos, comerciais e neutros, adequados para ficha de catálogo.",
          "Não faça promessa de cura, diagnóstico, tratamento ou resultado garantido.",
          "Não invente composição, dose, ingrediente ou benefício técnico que não esteja evidente no nome ou na embalagem.",
          "Objetivo e perfil ideal devem ser descritos de forma geral e prudente.",
          "Mensagem rápida deve ter linguagem natural de atendimento.",
          "Palavras-chave devem ser separadas por vírgula.",
        ]
      : [
          "Módulo: Candinho Fitness.",
          `Variações cadastradas: ${variantsText}.`,
          "A descrição deve falar somente da peça/modelo, estilo e uso geral.",
          "Não invente tecido, compressão, transparência, tecnologia ou característica que não esteja visível na imagem ou informada no nome.",
          "Os campos de suplemento devem retornar string vazia.",
        ];

  const instruction = [
    `Nome atual: ${String(product.name ?? "")}`,
    `Categoria atual: ${String(product.category ?? "")}`,
    loaded.module === "supplements"
      ? `Marca/origem atual: ${String(product.brand ?? "")}`
      : "",
    `Descrição atual: ${String(product.description ?? "")}`,
    "",
    ...moduleRules,
    "",
    "PADRONIZAÇÃO:",
    "Sugira um nome limpo e consistente em suggested_name.",
    "Sugira a marca/fabricante em suggested_brand somente quando houver evidência suficiente.",
    "Sugira uma categoria curta e consistente em suggested_category.",
    "Essas três sugestões são apenas para revisão humana e não devem presumir dados sem evidência.",
    "",
    "PREENCHIMENTO:",
    "Preencha apenas textos plausíveis com base no nome, dados atuais e imagem.",
    "Quando não houver evidência suficiente, retorne string vazia naquele campo.",
    "Não tente gerar URL de imagem.",
  ]
    .filter(Boolean)
    .join("\n");

  const content: Array<Record<string, string>> = [
    { type: "input_text", text: instruction },
  ];

  if (nonEmpty(product.image_url)) {
    content.push({
      type: "input_image",
      image_url: String(product.image_url),
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content:
            "Você organiza cadastros de produtos da Candinho Company. Seja conservador: nunca invente especificações. Produza sugestões úteis para revisão humana, não decisões automáticas.",
        },
        { role: "user", content },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "candinho_catalog_completion",
          schema: OUTPUT_SCHEMA,
          strict: true,
        },
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });

  const payload = (await response.json()) as JsonRecord;

  if (!response.ok) {
    const apiError = payload.error;
    const message =
      apiError &&
      typeof apiError === "object" &&
      typeof (apiError as JsonRecord).message === "string"
        ? String((apiError as JsonRecord).message)
        : "A IA não conseguiu gerar a sugestão.";
    throw new Error(message);
  }

  const outputText = extractOutputText(payload);
  if (!outputText) throw new Error("A IA retornou uma resposta vazia.");

  const suggestion = JSON.parse(outputText) as JsonRecord;
  const fields = generatedFields(item.module, product, suggestion);

  const { error: saveError } = await supabase.rpc(
    "save_catalog_completion_draft",
    {
      p_module: item.module,
      p_entity_id: item.entityId,
      p_payload: suggestion,
      p_generated_fields: fields,
      p_model: model,
    },
  );

  if (saveError) throw saveError;

  return {
    module: item.module,
    entityId: item.entityId,
    name: String(product.name ?? ""),
    generatedFields: fields,
    suggestion,
  };
}

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();

    const body = (await request.json().catch(() => ({}))) as {
      items?: BatchItem[];
    };

    const items = Array.isArray(body.items) ? body.items.slice(0, 3) : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Selecione pelo menos um produto." },
        { status: 400 },
      );
    }

    for (const item of items) {
      if (item.module === "supplements" && !access.canWriteSupplements) {
        return NextResponse.json(
          { error: "Sem permissão para completar Suplementos." },
          { status: 403 },
        );
      }

      if (item.module === "fitness" && !access.canWriteFitness) {
        return NextResponse.json(
          { error: "Sem permissão para completar Fitness." },
          { status: 403 },
        );
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não está disponível neste deployment." },
        { status: 503 },
      );
    }

    const model =
      process.env.OPENAI_CATALOG_COMPLETION_MODEL || "gpt-5.6-luna";

    const supabase = await createClient();
    const results = [];

    for (const item of items) {
      try {
        const result = await generateOne(apiKey, model, supabase, item);
        results.push({ ok: true, ...result });
      } catch (error) {
        results.push({
          ok: false,
          module: item.module,
          entityId: item.entityId,
          error:
            error instanceof Error
              ? error.message
              : "Falha ao gerar sugestão.",
        });
      }
    }

    return NextResponse.json({
      ok: results.some((item) => item.ok),
      results,
      model,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível processar a fila.",
      },
      { status: 500 },
    );
  }
}
