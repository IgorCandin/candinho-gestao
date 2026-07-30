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

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();

  if (!access.active || !(access.canAccessFitness || access.role === "admin")) {
    return NextResponse.json(
      { error: "Sem acesso ao Nexus Fitness." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const question =
    typeof body.question === "string"
      ? body.question.trim().slice(0, 1600)
      : "";

  if (question.length < 2) {
    return NextResponse.json(
      { error: "Digite uma pergunta para o Nexus Fitness." },
      { status: 400 },
    );
  }

  const snapshot = await getFitnessNexusSnapshot();

  const context = {
    summary: snapshot.summary,
    priorities: snapshot.products.slice(0, 16).map((product) => ({
      ...product,
      interpretation: fitnessSignalCopy(product),
    })),
  };

  const prompt = `Você é o Nexus Fitness, copiloto da Candinho Fitness.

A pessoa responsável quer uma resposta simples e prática sobre a operação Fitness.

PERGUNTA:
${question}

DADOS REAIS:
${JSON.stringify(context)}

REGRAS:
- Use somente os dados fornecidos.
- Seja direto.
- Priorize o que merece ação hoje.
- Quando sugerir promoção, respeite suggested_discount_pct e suggested_price. Se forem zero/null, não invente desconto.
- Não invente tamanho, cor, fornecedor, estoque ou venda.
- Diferencie "promover" de "repor" e de "não promover agora".
- Se a pergunta pedir campanha, dê um rascunho simples.
- Responda em português brasileiro.`;

  try {
    const result = await generateNexus({
      system:
        "Você é o Nexus Fitness, um copiloto operacional simples focado em estoque, giro, vendas, reposição e campanha.",
      prompt,
      geminiModel:
        process.env.GEMINI_FITNESS_MODEL ||
        process.env.GEMINI_NEXUS_MODEL ||
        "gemini-2.5-flash-lite",
      openAIModel:
        process.env.OPENAI_FITNESS_MODEL ||
        process.env.OPENAI_NEXUS_MODEL ||
        "gpt-5-mini",
    });

    return NextResponse.json({ answer: result.text.trim() });
  } catch (error) {
    const normalized = nexusErrorResponse(error);
    return NextResponse.json(
      { error: normalized.error, code: normalized.code },
      { status: normalized.status },
    );
  }
}
