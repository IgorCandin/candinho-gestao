import { NextResponse } from "next/server";
import {
  getPublicCatalogAdvisorSnapshot,
  getPublicProductPage,
} from "@/lib/public-product-page-data";
import {
  generateNexus,
  nexusErrorResponse,
} from "@/lib/nexus-ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    needs_human: { type: "boolean" },
    human_reason: { type: ["string", "null"] },
    next_question: { type: ["string", "null"] },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slug: { type: "string" },
          reason: { type: "string" },
        },
        required: ["slug", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "message",
    "needs_human",
    "human_reason",
    "next_question",
    "recommendations",
  ],
  additionalProperties: false,
};

const COMPLEX_HEALTH_PATTERN =
  /\b(gr[aá]vida|gestante|amament|lacta|menor de idade|crian[cç]a|adolescente|rem[eé]dio|medicamento|controlado|prescri[cç][aã]o|hipertens|press[aã]o alta|diabet|doen[cç]a|problema renal|problema hep[aá]tico|card[ií]ac|palpita[cç][aã]o|desmaio|dor no peito|reação|alergia|tratamento|diagn[oó]stico)\b/i;

const SYMPTOM_TREATMENT_PATTERN =
  /\b(curar|tratar|tratamento para|rem[eé]dio para|sintoma|dor|doente|doen[cç]a|ansiedade forte|ins[oô]nia forte)\b/i;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseJson(text: string) {
  const normalized = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(normalized) as Record<string, unknown>;
  } catch {
    return { message: normalized };
  }
}

function session(value: unknown) {
  return typeof value === "string" ? value.slice(0, 120) : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, 1200) : "";

  const sessionId = session(body.session_id);

  const productSlug =
    typeof body.product_slug === "string"
      ? body.product_slug.trim().slice(0, 120)
      : null;

  const history = Array.isArray(body.history)
    ? body.history
        .slice(-6)
        .map((value: unknown) => object(value))
        .map((row) => ({
          role: row.role === "assistant" ? "assistant" : "user",
          text:
            typeof row.text === "string"
              ? row.text.trim().slice(0, 500)
              : "",
        }))
        .filter((row) => row.text)
    : [];

  if (message.length < 2) {
    return NextResponse.json(
      { error: "Conte um pouco do que você está procurando." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  if (sessionId) {
    const { data: count } = await supabase.rpc(
      "public_catalog_question_count_v1",
      {
        p_session_id: sessionId,
        p_minutes: 60,
      },
    );

    if (Number(count ?? 0) >= 18) {
      return NextResponse.json(
        {
          error:
            "Você já conversou bastante com o Nexus nesta hora. Se quiser, peça atendimento humano para continuar.",
        },
        { status: 429 },
      );
    }
  }

  await supabase.rpc("public_catalog_track_event_v1", {
    p_session_id: sessionId || null,
    p_event_type: "nexus_question",
    p_product_id: null,
    p_metadata: { placement: productSlug ? "product_page" : "catalog" },
  });

  if (
    COMPLEX_HEALTH_PATTERN.test(message) ||
    SYMPTOM_TREATMENT_PATTERN.test(message)
  ) {
    await supabase.rpc("public_catalog_track_event_v1", {
      p_session_id: sessionId || null,
      p_event_type: "human_handoff",
      p_product_id: null,
      p_metadata: { placement: productSlug ? "product_page" : "catalog" },
    });

    return NextResponse.json({
      message:
        "Nesse caso prefiro não te indicar um suplemento automaticamente. Posso organizar o que você contou e chamar alguém da Candinho para avaliar com mais cuidado.",
      needs_human: true,
      human_reason:
        "A conversa envolve saúde, medicamento, gestação, idade ou sintomas e merece atendimento humano.",
      next_question: null,
      recommendations: [],
    });
  }

  const [catalog, currentProduct] = await Promise.all([
    getPublicCatalogAdvisorSnapshot(),
    productSlug ? getPublicProductPage(productSlug) : Promise.resolve(null),
  ]);

  const candidateProducts = catalog.products.slice(0, 80);

  const context = {
    current_product: currentProduct
      ? {
          id: currentProduct.product.id,
          slug: currentProduct.product.slug,
          name: currentProduct.product.name,
          category: currentProduct.product.category,
          brand: currentProduct.product.brand,
          description: currentProduct.product.description,
          objective: currentProduct.product.objective,
          ideal_profile: currentProduct.product.ideal_profile,
          available: currentProduct.product.available,
          available_quantity: currentProduct.product.available_quantity,
          price:
            currentProduct.promotion?.promotional_price ??
            currentProduct.product.sale_price,
        }
      : null,
    products: candidateProducts.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      brand: product.brand,
      description: product.description,
      objective: product.objective,
      ideal_profile: product.ideal_profile,
      available_quantity: product.available_quantity,
      incoming_quantity: product.incoming_quantity,
      priority_index: product.priority_index,
      current_price: product.promotional_price ?? product.sale_price,
      promotion_name: product.promotion_name,
    })),
    history,
    user_message: message,
  };

  const prompt = `Você é o Nexus Guia da Candinho Suplementos, uma camada de ajuda comercial do catálogo público.

OBJETIVO:
Ajudar a pessoa a entender quais opções do catálogo combinam melhor com o objetivo informado, sem agir como médico ou nutricionista e sem inventar informações.

REGRAS DE RECOMENDAÇÃO:
- Recomende SOMENTE produtos presentes em CONTEXTO REAL.
- Priorize primeiro compatibilidade com o objetivo da pessoa.
- Entre opções compatíveis, priorize produtos com estoque disponível.
- Os produtos do contexto já chegam ordenados por disponibilidade e histórico de giro da operação. Entre opções igualmente compatíveis, prefira o menor priority_index.
- Não revele priority_index, números de giro, custo, lucro ou lógica interna de ranking. Você pode dizer apenas se uma opção está disponível.
- Não diga que um suplemento é "o melhor" ou "o mais indicado" de forma absoluta. Use linguagem como "pode fazer mais sentido", "vale olhar", "uma opção".
- Não diagnostique, trate doenças ou prometa resultados.
- Se faltar contexto para escolher bem, faça UMA pergunta curta em next_question em vez de forçar indicação.
- Se o cenário exigir avaliação humana, marque needs_human=true e não recomende produtos.
- No máximo 3 recomendações.
- Se o produto atual estiver esgotado, você pode sugerir alternativa compatível disponível.
- Responda em português brasileiro simples, direto e humano.
- Não use emojis de coração.
- Não invente preço, sabor, promoção, ingrediente, pureza ou benefício que não esteja no contexto.

CONTEXTO REAL:
${JSON.stringify(context)}`;

  try {
    const result = await generateNexus({
      system:
        "Você é o Nexus Guia do catálogo da Candinho. Ajude a comparar opções reais do catálogo, seja conservador em saúde e encaminhe casos complexos para atendimento humano.",
      prompt,
      schema: OUTPUT_SCHEMA,
      geminiModel:
        process.env.GEMINI_PUBLIC_CATALOG_MODEL ||
        process.env.GEMINI_NEXUS_MODEL ||
        "gemini-2.5-flash-lite",
      openAIModel:
        process.env.OPENAI_PUBLIC_CATALOG_MODEL ||
        process.env.OPENAI_NEXUS_MODEL ||
        "gpt-5-mini",
      timeoutMs: 40_000,
    });

    const parsed = parseJson(result.text);
    const bySlug = new Map(candidateProducts.map((product) => [product.slug, product]));
    const rawRecommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : [];

    const recommendations = rawRecommendations
      .map((value: unknown) => object(value))
      .map((row) => {
        const slug = typeof row.slug === "string" ? row.slug : "";
        const product = bySlug.get(slug);

        if (!product) return null;

        return {
          product_id: product.id,
          slug: product.slug,
          name: product.name,
          image_url: product.image_url,
          category: product.category,
          brand: product.brand,
          price: product.promotional_price ?? product.sale_price,
          regular_price: product.sale_price,
          promotion_name: product.promotion_name,
          available: product.available_quantity > 0,
          reason:
            typeof row.reason === "string"
              ? row.reason.trim().slice(0, 320)
              : "",
        };
      })
      .filter(
        (
          value,
        ): value is {
          product_id: string;
          slug: string;
          name: string;
          image_url: string | null;
          category: string | null;
          brand: string | null;
          price: number;
          regular_price: number;
          promotion_name: string | null;
          available: boolean;
          reason: string;
        } => Boolean(value),
      )
      .slice(0, 3);

    const needsHuman = parsed.needs_human === true;

    return NextResponse.json({
      message:
        typeof parsed.message === "string"
          ? parsed.message.trim()
          : result.text.trim(),
      needs_human: needsHuman,
      human_reason:
        typeof parsed.human_reason === "string"
          ? parsed.human_reason.trim()
          : null,
      next_question:
        typeof parsed.next_question === "string"
          ? parsed.next_question.trim()
          : null,
      recommendations: needsHuman ? [] : recommendations,
    });
  } catch (error) {
    const normalized = nexusErrorResponse(error);

    return NextResponse.json(
      { error: normalized.error, code: normalized.code },
      { status: normalized.status },
    );
  }
}
