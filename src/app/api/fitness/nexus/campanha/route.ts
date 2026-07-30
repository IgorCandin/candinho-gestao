import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  fitnessSignalCopy,
  getFitnessNexusSnapshot,
} from "@/lib/fitness-nexus-data";
import {
  generateNexus,
  nexusErrorResponse,
} from "@/lib/nexus-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    campaign_name: { type: "string" },
    strategy: { type: "string" },
    story_frames: {
      type: "array",
      items: { type: "string" },
    },
    caption: { type: "string" },
    cta: { type: "string" },
    price_note: { type: ["string", "null"] },
  },
  required: [
    "campaign_name",
    "strategy",
    "story_frames",
    "caption",
    "cta",
    "price_note",
  ],
  additionalProperties: false,
};

function parseJson(text: string) {
  const normalized = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(normalized) as Record<string, unknown>;
  } catch {
    return { caption: normalized };
  }
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !(access.canAccessFitness || access.role === "admin") ||
    !(access.canWriteFitness || access.role === "admin")
  ) {
    return NextResponse.json(
      { error: "Sem permissão para gerar campanha Fitness." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const productId =
    typeof body.product_id === "string" ? body.product_id : "";

  const extraContext =
    typeof body.additional_context === "string"
      ? body.additional_context.trim().slice(0, 1200)
      : null;

  const snapshot = await getFitnessNexusSnapshot();
  const product = snapshot.products.find(
    (item) => item.product_id === productId,
  );

  if (!product) {
    return NextResponse.json(
      { error: "Produto Fitness não encontrado." },
      { status: 404 },
    );
  }

  const signal = fitnessSignalCopy(product);

  const factualPriceSuggestion =
    product.suggested_discount_pct > 0 && product.suggested_price != null
      ? {
          discount_pct: product.suggested_discount_pct,
          suggested_price: product.suggested_price,
          current_price: product.min_sale_price,
          cost_complete: product.cost_complete,
        }
      : null;

  const prompt = `Você é o Nexus Fitness, copiloto comercial da Candinho Fitness.

Crie uma campanha simples para a Giulia executar com facilidade, usando somente os fatos abaixo.

PRODUTO:
${JSON.stringify({
  name: product.name,
  category: product.category,
  available_quantity: product.available_quantity,
  incoming_quantity: product.incoming_quantity,
  sold_30d: product.sold_30d,
  sold_90d: product.sold_90d,
  signal: signal.label,
  signal_reason: signal.body,
  current_price: product.min_sale_price,
  factual_price_suggestion: factualPriceSuggestion,
  additional_context: extraContext,
})}

REGRAS:
- Português brasileiro natural, leve e feminino sem exagerar.
- Campanha simples de executar.
- 2 a 4 frames de Story.
- CTA curto.
- Não invente cor, tamanho, preço, desconto ou estoque.
- Se factual_price_suggestion for null, NÃO invente desconto; faça campanha de conteúdo/urgência/novidade sem baixar preço.
- Se cost_complete=false, trate qualquer sugestão de desconto como rascunho para revisão antes de publicar.
- Se o sinal for "Não promover agora", faça conteúdo sem desconto e explique a estratégia.
- Não prometa resultado corporal.
- Não use linguagem apelativa.

Retorne apenas o JSON do schema.`;

  try {
    const result = await generateNexus({
      system:
        "Você é o Nexus Fitness. Gere campanhas simples, seguras e executáveis usando apenas estoque, giro e preço fornecidos.",
      prompt,
      schema: OUTPUT_SCHEMA,
      geminiModel:
        process.env.GEMINI_FITNESS_MODEL ||
        process.env.GEMINI_NEXUS_MODEL ||
        "gemini-2.5-flash-lite",
      openAIModel:
        process.env.OPENAI_FITNESS_MODEL ||
        process.env.OPENAI_NEXUS_MODEL ||
        "gpt-5-mini",
    });

    const parsed = parseJson(result.text);

    return NextResponse.json({
      campaign_name:
        typeof parsed.campaign_name === "string"
          ? parsed.campaign_name
          : `Campanha · ${product.name}`,
      strategy:
        typeof parsed.strategy === "string"
          ? parsed.strategy
          : signal.body,
      story_frames: Array.isArray(parsed.story_frames)
        ? parsed.story_frames.filter(
            (value: unknown): value is string => typeof value === "string",
          )
        : [],
      caption:
        typeof parsed.caption === "string" ? parsed.caption : result.text,
      cta:
        typeof parsed.cta === "string" ? parsed.cta : "Chama a gente!",
      price_note:
        typeof parsed.price_note === "string" ? parsed.price_note : null,
      product,
      signal,
      factual_price_suggestion: factualPriceSuggestion,
    });
  } catch (error) {
    const normalized = nexusErrorResponse(error);
    return NextResponse.json(
      { error: normalized.error, code: normalized.code },
      { status: normalized.status },
    );
  }
}
