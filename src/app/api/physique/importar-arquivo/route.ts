import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  generateNexus,
  nexusErrorResponse,
  type JsonRecord,
} from "@/lib/nexus-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    file_category: { type: "string" },
    summary: { type: "string" },
    extracted_facts: {
      type: "array",
      items: { type: "string" },
    },
    attention_points: {
      type: "array",
      items: { type: "string" },
    },
    normalized_context: {
      type: "string",
    },
    suggested_goal: {
      type: "string",
    },
  },
  required: [
    "file_category",
    "summary",
    "extracted_facts",
    "attention_points",
    "normalized_context",
    "suggested_goal",
  ],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();

    if (
      !access.canManageUsers &&
      access.role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para analisar arquivos do Physique.",
        },
        { status: 403 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const fileType = String(
      form.get("file_type") ?? "other",
    );
    const context = String(
      form.get("context") ?? "",
    ).trim();

    if (
      !(file instanceof File) ||
      file.size === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Selecione um arquivo válido.",
        },
        { status: 400 },
      );
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        {
          error:
            "O arquivo deve ter no máximo 4 MB por importação.",
        },
        { status: 413 },
      );
    }

    const prompt = [
      `Tipo informado pelo usuário: ${fileType}`,
      `Contexto complementar: ${
        context || "Não informado"
      }`,
      "",
      "Analise o arquivo como parte do histórico de um atleta da Candinho Physique.",
      "Extraia somente informações presentes ou claramente inferíveis do arquivo e do contexto fornecido.",
      "Não invente medidas, diagnóstico, lesões, composição corporal, dose, prescrição ou dado clínico.",
      "Se houver treino, registre divisão, exercícios e objetivo identificáveis sem inventar informações ausentes.",
      "Se houver avaliação física, destaque medidas e indicadores identificáveis sem criar valores ausentes.",
      "Se houver fotos corporais, descreva apenas aspectos visuais gerais úteis para comparação futura, sem diagnóstico médico.",
      "Se houver alimentação ou suplementação, registre o que a pessoa informou sem prescrever tratamento.",
      "attention_points deve apontar inconsistências, lacunas ou itens que merecem revisão humana.",
      "suggested_goal só deve ser preenchido se o objetivo estiver explícito ou muito claro; caso contrário use string vazia.",
      "normalized_context deve reescrever o contexto do usuário de forma organizada, preservando o significado.",
    ].join("\n");

    const result = await generateNexus({
      system:
        "Você é o Nexus da Candinho Physique. Organize histórico de atletas com rigor factual, comparação futura e revisão humana.",
      prompt,
      schema:
        OUTPUT_SCHEMA as unknown as JsonRecord,
      files: [
        {
          file,
          mimeType:
            file.type ||
            (file.name
              .toLowerCase()
              .endsWith(".pdf")
              ? "application/pdf"
              : undefined),
        },
      ],
      geminiModel:
        process.env.GEMINI_PHYSIQUE_MODEL ||
        "gemini-2.5-flash-lite",
      openAIModel:
        process.env.OPENAI_PHYSIQUE_MODEL ||
        "gpt-5",
      timeoutMs: 50_000,
    });

    let analysis: JsonRecord;

    try {
      analysis = JSON.parse(
        result.text,
      ) as JsonRecord;
    } catch {
      throw new Error(
        "O Nexus retornou a análise em formato inválido.",
      );
    }

    return NextResponse.json({
      analysis,
      model: result.model,
      provider: result.provider,
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
