import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  generateNexus,
  nexusErrorResponse,
} from "@/lib/nexus-ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCHEMA = {
  type: "object",
  properties: {
    public_title: { type: "string" },
    short_description: { type: "string" },
    long_description: { type: "string" },
    highlights: {
      type: "array",
      items: { type: "string" },
    },
    faq: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
        additionalProperties: false,
      },
    },
    meta_title: { type: "string" },
    meta_description: { type: "string" },
    whatsapp_message_template: { type: "string" },
  },
  required: [
    "public_title",
    "short_description",
    "long_description",
    "highlights",
    "faq",
    "meta_title",
    "meta_description",
    "whatsapp_message_template",
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
    return {};
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !(access.canWriteSupplements || access.role === "admin")
  ) {
    return NextResponse.json(
      { error: "Sem permissão para gerar conteúdo público." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      "id,name,category,brand,description,sale_price,installment_price,objective,ideal_profile,duration_days,information,quick_message,keywords,level,sales_category,restricted,active",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `Não foi possível carregar o produto: ${error.message}` },
      { status: 500 },
    );
  }

  if (!product) {
    return NextResponse.json(
      { error: "Produto não encontrado." },
      { status: 404 },
    );
  }

  const prompt = `Você é o Nexus, ajudando a preparar um RASCUNHO de página pública de venda para a Candinho Suplementos.

O rascunho será revisado por uma pessoa antes de ser publicado.

DADOS CADASTRADOS DO PRODUTO:
${JSON.stringify(product)}

REGRAS:
- Use somente fatos presentes nos dados acima.
- Não invente pureza, dose, ingrediente, certificação, laudo, sabor, quantidade de porções, benefício ou fabricante.
- Não transforme objetivo comercial em promessa de resultado.
- Não faça afirmações médicas, terapêuticas ou de tratamento.
- Não diga "garantido", "comprovado", "o melhor" ou equivalentes absolutos.
- Se algum dado parecer contraditório ou insuficiente, simplesmente não use esse detalhe.
- Escreva português brasileiro natural e comercial.
- short_description: até 220 caracteres.
- long_description: 1 a 3 parágrafos curtos.
- highlights: 3 a 6 pontos curtos baseados apenas nos dados.
- FAQ: 2 a 5 perguntas simples. Não invente modo de uso, contraindicação ou composição.
- meta_title: conciso.
- meta_description: até 160 caracteres.
- whatsapp_message_template: uma frase curta como "Oi! Vi [produto] no catálogo da Candinho e tenho interesse."
- NÃO gere usage_text ou warnings_text. Esses campos exigem revisão/manual ou fonte segura.
- Retorne somente o JSON do schema.`;

  try {
    const result = await generateNexus({
      system:
        "Você cria rascunhos comerciais conservadores para páginas públicas de suplementos. Fatos não presentes no cadastro devem ser omitidos.",
      prompt,
      schema: SCHEMA,
      geminiModel:
        process.env.GEMINI_PRODUCT_COPY_MODEL ||
        process.env.GEMINI_NEXUS_MODEL ||
        "gemini-2.5-flash-lite",
      openAIModel:
        process.env.OPENAI_PRODUCT_COPY_MODEL ||
        process.env.OPENAI_NEXUS_MODEL ||
        "gpt-5-mini",
    });

    const parsed = parseJson(result.text);

    return NextResponse.json({
      public_title:
        typeof parsed.public_title === "string"
          ? parsed.public_title.trim()
          : product.name,
      short_description:
        typeof parsed.short_description === "string"
          ? parsed.short_description.trim()
          : "",
      long_description:
        typeof parsed.long_description === "string"
          ? parsed.long_description.trim()
          : "",
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.filter(
            (value: unknown): value is string => typeof value === "string",
          )
        : [],
      faq: Array.isArray(parsed.faq) ? parsed.faq : [],
      meta_title:
        typeof parsed.meta_title === "string" ? parsed.meta_title.trim() : "",
      meta_description:
        typeof parsed.meta_description === "string"
          ? parsed.meta_description.trim()
          : "",
      whatsapp_message_template:
        typeof parsed.whatsapp_message_template === "string"
          ? parsed.whatsapp_message_template.trim()
          : `Oi! Vi ${product.name} no catálogo da Candinho e tenho interesse.`,
    });
  } catch (caught) {
    const normalized = nexusErrorResponse(caught);
    return NextResponse.json(
      { error: normalized.error, code: normalized.code },
      { status: normalized.status },
    );
  }
}
