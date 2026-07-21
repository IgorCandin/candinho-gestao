import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type JsonRecord = Record<string, unknown>;

type OpenAIWebSource = {
  title: string;
  url: string;
  type: string;
};

const MATCH_STATUSES = new Set([
  "exact",
  "probable",
  "ambiguous",
  "not_found",
]);

const OFFICIAL_SOURCE_CLASSES = new Set([
  "official_brand",
  "official_manufacturer",
  "official_document",
]);

const NUTRITION_SCHEMA = {
  type: "object",
  properties: {
    confirmed_product_name: { type: "string" },
    confirmed_brand: { type: "string" },
    variant_details: { type: "string" },
    product_match_status: {
      type: "string",
      enum: ["exact", "probable", "ambiguous", "not_found"],
    },
    confidence: {
      type: "integer",
      minimum: 0,
      maximum: 100,
    },
    source_classification: {
      type: "string",
      enum: [
        "official_brand",
        "official_manufacturer",
        "official_document",
        "retailer",
        "marketplace",
        "other",
        "not_found",
      ],
    },
    source_name: { type: "string" },
    source_title: { type: "string" },
    source_url: { type: "string" },
    serving_size: { type: "string" },
    servings_per_container: { type: "string" },
    nutrition_facts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          amount: { type: "string" },
          daily_value: { type: "string" },
        },
        required: ["label", "amount", "daily_value"],
        additionalProperties: false,
      },
    },
    ingredients: { type: "string" },
    allergens: { type: "string" },
    usage: { type: "string" },
    warnings: { type: "string" },
    variant_warning: { type: "string" },
    research_notes: { type: "string" },
    can_generate_image: { type: "boolean" },
  },
  required: [
    "confirmed_product_name",
    "confirmed_brand",
    "variant_details",
    "product_match_status",
    "confidence",
    "source_classification",
    "source_name",
    "source_title",
    "source_url",
    "serving_size",
    "servings_per_container",
    "nutrition_facts",
    "ingredients",
    "allergens",
    "usage",
    "warnings",
    "variant_warning",
    "research_notes",
    "can_generate_image",
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

function extractSources(payload: JsonRecord): OpenAIWebSource[] {
  const output = Array.isArray(payload.output) ? payload.output : [];
  const found: OpenAIWebSource[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const record = item as JsonRecord;
    if (record.type !== "web_search_call") continue;

    const action = record.action;
    if (!action || typeof action !== "object") continue;
    const sources = (action as JsonRecord).sources;
    if (!Array.isArray(sources)) continue;

    for (const source of sources) {
      if (!source || typeof source !== "object") continue;
      const value = source as JsonRecord;
      const url = typeof value.url === "string" ? value.url : "";
      if (!url) continue;

      found.push({
        title: typeof value.title === "string" ? value.title : "",
        url,
        type: typeof value.type === "string" ? value.type : "web",
      });
    }
  }

  return [...new Map(found.map((source) => [source.url, source])).values()];
}


function canonicalUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
  } catch {
    return value.trim().replace(/\/+$/, "");
  }
}

function sourceWasActuallyReturned(
  sourceUrl: string,
  sources: OpenAIWebSource[],
) {
  const target = canonicalUrl(sourceUrl);
  return sources.some((source) => canonicalUrl(source.url) === target);
}

function normalizeResearch(value: unknown): JsonRecord & {
  product_match_status: string;
  source_classification: string;
  source_url: string;
  confidence: number;
  nutrition_facts: unknown[];
  can_generate_image: boolean;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A IA retornou um resultado inválido.");
  }

  const result = value as JsonRecord;
  const matchStatus = String(result.product_match_status ?? "not_found");
  const sourceClassification = String(
    result.source_classification ?? "not_found",
  );
  const sourceUrl = String(result.source_url ?? "").trim();
  const facts = Array.isArray(result.nutrition_facts)
    ? result.nutrition_facts
    : [];
  const confidence = Math.max(
    0,
    Math.min(100, Math.round(Number(result.confidence ?? 0))),
  );

  if (!MATCH_STATUSES.has(matchStatus)) {
    throw new Error("A IA retornou um status de correspondência inválido.");
  }

  const safeCanGenerate =
    Boolean(result.can_generate_image) &&
    (matchStatus === "exact" || matchStatus === "probable") &&
    OFFICIAL_SOURCE_CLASSES.has(sourceClassification) &&
    Boolean(sourceUrl) &&
    facts.length > 0;

  return {
    ...result,
    product_match_status: matchStatus,
    source_classification: sourceClassification,
    source_url: sourceUrl,
    confidence,
    nutrition_facts: facts,
    can_generate_image: safeCanGenerate,
  };
}

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();

    if (!access.canWriteSupplements) {
      return NextResponse.json(
        { error: "Sem permissão para pesquisar produtos." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const productId =
      typeof body.productId === "string" ? body.productId : "";

    if (!productId) {
      return NextResponse.json(
        { error: "Produto não informado." },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY não está disponível neste deployment. Faça um novo redeploy depois de configurar a variável.",
        },
        { status: 503 },
      );
    }

    const supabase = await createClient();

    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        "id,name,sku,brand,category,image_url,restricted,active",
      )
      .eq("id", productId)
      .maybeSingle();

    if (productError) throw productError;

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 },
      );
    }

    const model =
      process.env.OPENAI_NUTRITION_MODEL || "gpt-5.6-terra";

    const productDescription = [
      `Produto no ERP: ${product.name}`,
      `SKU interno: ${product.sku ?? "não informado"}`,
      `Campo de marca/origem atual: ${product.brand ?? "não informado"}`,
      `Categoria: ${product.category}`,
      "",
      "IMPORTANTE: o campo de marca/origem do ERP pode conter o canal de compra (ex.: marketplace) em vez do fabricante real.",
      "Use o nome do produto e, principalmente, a imagem da embalagem como evidência para identificar a marca/fabricante correto.",
      "",
      "Pesquise na web a versão EXATA e ATUAL do produto.",
      "Priorize página oficial da marca, fabricante ou documento oficial do produto.",
      "Não use marketplace, loja varejista, blog, fórum ou agregador como fonte principal.",
      "Confirme gramatura, apresentação, sabor e versão.",
      "Se houver qualquer dúvida entre versões, marque como ambiguous e não autorize geração de imagem.",
      "Não invente números. Campo ausente na fonte deve ser string vazia.",
      "Extraia a declaração do rótulo exatamente como publicada, preservando unidades e %VD quando disponíveis.",
      "Para suplementos sem tabela nutricional tradicional, registre os ativos declarados em nutrition_facts.",
      "Retorne uma única fonte oficial principal em source_url e classifique corretamente a fonte.",
      "can_generate_image só pode ser true quando a identidade do produto e sua versão forem suficientemente seguras e a fonte principal for oficial.",
    ].join("\n");

    const userContent: Array<Record<string, string>> = [
      { type: "input_text", text: productDescription },
    ];

    if (product.image_url) {
      userContent.push({
        type: "input_image",
        image_url: product.image_url,
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
        reasoning: { effort: "medium" },
        tools: [
          {
            type: "web_search",
            search_context_size: "medium",
            filters: {
              blocked_domains: [
                "mercadolivre.com.br",
                "mercadolivre.com",
                "shopee.com.br",
                "shopee.com",
                "amazon.com.br",
                "amazon.com",
                "magazineluiza.com.br",
                "americanas.com.br",
                "casasbahia.com.br",
                "ebay.com",
                "wikipedia.org",
                "reddit.com",
              ],
            },
          },
        ],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"],
        input: [
          {
            role: "system",
            content:
              "Você é o pesquisador de cadastro da Candinho Suplementos. Identifique produtos com rigor, use pesquisa web e devolva dados de rótulo rastreáveis. Nunca trate marketplace como fabricante e nunca complete números por conhecimento geral. Quando a correspondência não for segura, bloqueie a geração da Imagem 2.",
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "candinho_product_nutrition_research",
            schema: NUTRITION_SCHEMA,
            strict: true,
          },
        },
      }),
      signal: AbortSignal.timeout(55_000),
    });

    const openAIResponse = (await response.json()) as JsonRecord;

    if (!response.ok) {
      const apiError = openAIResponse.error;
      const message =
        apiError &&
        typeof apiError === "object" &&
        typeof (apiError as JsonRecord).message === "string"
          ? String((apiError as JsonRecord).message)
          : "A pesquisa com IA falhou.";

      throw new Error(message);
    }

    const outputText = extractOutputText(openAIResponse);

    if (!outputText) {
      throw new Error(
        "A IA não retornou dados estruturados para este produto.",
      );
    }

    const research = normalizeResearch(JSON.parse(outputText));
    const sources = extractSources(openAIResponse);
    const responseId =
      typeof openAIResponse.id === "string" ? openAIResponse.id : "";

    const verifiedPrimarySource =
      Boolean(research.source_url) &&
      sourceWasActuallyReturned(String(research.source_url), sources);

    if (!verifiedPrimarySource) {
      research.can_generate_image = false;
      research.research_notes = [
        String(research.research_notes ?? "").trim(),
        "A URL principal informada pela IA não apareceu entre as fontes retornadas pela pesquisa web; geração automática bloqueada para revisão.",
      ]
        .filter(Boolean)
        .join(" ");
    }

    const { error: saveError } = await supabase.rpc(
      "save_product_nutrition_ai_research",
      {
        p_product_id: productId,
        p_payload: research,
        p_sources: sources,
        p_source_name: String(research.source_name ?? ""),
        p_source_url: String(research.source_url ?? ""),
        p_model: model,
        p_response_id: responseId,
        p_match_status: String(research.product_match_status),
        p_confidence: Number(research.confidence),
        p_variant_warning: String(research.variant_warning ?? ""),
      },
    );

    if (saveError) throw saveError;

    return NextResponse.json({
      ok: true,
      research,
      sources,
      model,
      responseId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível pesquisar o produto.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
