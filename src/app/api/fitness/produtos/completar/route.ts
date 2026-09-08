import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { generateNexus, nexusErrorResponse, type JsonRecord } from "@/lib/nexus-ai";

export const runtime = "nodejs";
export const maxDuration = 45;

const schema = {
  type: "object",
  properties: {
    category: { type: "string" },
    description: { type: "string" },
    sizes: { type: "array", items: { type: "string" }, maxItems: 10 },
    colors: { type: "array", items: { type: "string" }, maxItems: 8 },
    sales_tip: { type: "string" },
  },
  required: ["category", "description", "sizes", "colors", "sales_tip"],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();
    if (!access.canWriteFitness && access.role !== "admin") return NextResponse.json({ error: "Sem permissão para completar produtos Fitness." }, { status: 403 });
    const body = await request.json().catch(() => ({})) as JsonRecord;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 3) return NextResponse.json({ error: "Informe um nome de produto mais completo." }, { status: 400 });
    const result = await generateNexus({
      system: "Você é o Nexus de cadastro da Candinho Fitness. Organize cadastros de roupas e acessórios sem inventar tecido, composição, tecnologia, preço ou estoque.",
      prompt: [`Produto: ${name}`, `Categoria atual: ${typeof body.category === "string" ? body.category : ""}`, `Descrição atual: ${typeof body.description === "string" ? body.description : ""}`, `Categorias existentes: ${JSON.stringify(Array.isArray(body.categories) ? body.categories.slice(0, 60) : [])}`, "Sugira categoria curta, descrição comercial objetiva, tamanhos plausíveis e cores básicas. Preserve a categoria e descrição atuais quando já forem úteis. A dica de venda deve ser interna, curta e sem promessa."].join("\n"),
      schema: schema as unknown as JsonRecord,
      webSearch: false,
      geminiModel: process.env.GEMINI_FITNESS_MODEL || "gemini-3.5-flash-lite",
      openAIModel: process.env.OPENAI_FITNESS_MODEL || process.env.OPENAI_NEXUS_MODEL || "gpt-5-mini",
      timeoutMs: 30_000,
    });
    const parsed = JSON.parse(result.text) as JsonRecord;
    return NextResponse.json({ category: String(parsed.category ?? ""), description: String(parsed.description ?? ""), sizes: Array.isArray(parsed.sizes) ? parsed.sizes.filter((value): value is string => typeof value === "string") : [], colors: Array.isArray(parsed.colors) ? parsed.colors.filter((value): value is string => typeof value === "string") : [], salesTip: String(parsed.sales_tip ?? ""), provider: result.provider });
  } catch (error) {
    const friendly = nexusErrorResponse(error);
    return NextResponse.json({ error: friendly.error, code: friendly.code }, { status: friendly.status });
  }
}
