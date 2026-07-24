import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  generateNexus,
  nexusErrorResponse,
  type JsonRecord,
} from "@/lib/nexus-ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    current_state: { type: "string" },
    comparison_with_previous: { type: "string" },
    objective_summary: { type: "string" },
    recommended_primary_goal: { type: "string" },
    training_summary: { type: "string" },
    supplementation_summary: { type: "string" },
    nutrition_summary: { type: "string" },
    extracted_facts: {
      type: "array",
      items: { type: "string" },
    },
    visual_notes: {
      type: "array",
      items: { type: "string" },
    },
    attention_points: {
      type: "array",
      items: { type: "string" },
    },
    inconsistencies: {
      type: "array",
      items: { type: "string" },
    },
    missing_information: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "summary",
    "current_state",
    "comparison_with_previous",
    "objective_summary",
    "recommended_primary_goal",
    "training_summary",
    "supplementation_summary",
    "nutrition_summary",
    "extracted_facts",
    "visual_notes",
    "attention_points",
    "inconsistencies",
    "missing_information",
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
            "Sem permissão para consolidar o dossiê do Physique.",
        },
        { status: 403 },
      );
    }

    const body = (await request
      .json()
      .catch(() => ({}))) as JsonRecord;

    const sessionId =
      typeof body.session_id === "string"
        ? body.session_id.trim()
        : "";

    if (!sessionId) {
      return NextResponse.json(
        {
          error:
            "Atualização do atleta não identificada.",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: session,
      error: sessionError,
    } = await supabase
      .from(
        "physique_athlete_import_sessions",
      )
      .select(
        "id,athlete_id,title,status,context,created_at",
      )
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (
      !session ||
      session.status !== "open"
    ) {
      return NextResponse.json(
        {
          error:
            "A atualização aberta do atleta não foi encontrada.",
        },
        { status: 404 },
      );
    }

    const [
      {
        data: importedFiles,
        error: filesError,
      },
      {
        data: previousSession,
        error: previousError,
      },
    ] = await Promise.all([
      supabase
        .from(
          "physique_athlete_import_files",
        )
        .select(
          "id,file_type,file_name,ai_payload,ai_summary,created_at",
        )
        .eq("session_id", sessionId)
        .order("created_at"),
      supabase
        .from(
          "physique_athlete_import_sessions",
        )
        .select(
          "id,title,context,ai_summary,ai_payload,completed_at",
        )
        .eq(
          "athlete_id",
          session.athlete_id,
        )
        .eq("status", "completed")
        .order("completed_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),
    ]);

    if (filesError) {
      throw new Error(filesError.message);
    }

    if (previousError) {
      throw new Error(
        previousError.message,
      );
    }

    const imported = importedFiles ?? [];

    if (imported.length === 0) {
      return NextResponse.json(
        {
          error:
            "Adicione pelo menos um arquivo antes de consolidar a atualização.",
        },
        { status: 400 },
      );
    }

    const currentPayload = {
      title: session.title,
      context: session.context ?? {},
      files: imported.map((file) => ({
        type: file.file_type,
        name: file.file_name,
        summary: file.ai_summary,
        analysis: file.ai_payload ?? {},
      })),
    };

    const previousPayload =
      previousSession
        ? {
            title:
              previousSession.title,
            context:
              previousSession.context ??
              {},
            summary:
              previousSession.ai_summary,
            analysis:
              previousSession.ai_payload ??
              {},
            completed_at:
              previousSession.completed_at,
          }
        : null;

    const prompt = [
      "Consolide esta ATUALIZAÇÃO DO ATLETA da Candinho Physique.",
      "Você está recebendo análises individuais de vários arquivos da mesma atualização: avaliação física, treino, fotos, alimentação, suplementação, exames ou outros.",
      "",
      "OBJETIVO:",
      "- Transformar as análises individuais em um único estado atual organizado do atleta.",
      "- Comparar com a atualização consolidada anterior quando ela existir.",
      "- Preservar fatos e apontar inconsistências ou lacunas para revisão humana.",
      "- Não apagar a história anterior e não tratar inferências como fatos.",
      "",
      "REGRAS:",
      "- Não invente medidas, composição corporal, lesões, diagnóstico, medicamento, dose, prescrição ou resultado.",
      "- Não faça prescrição médica, nutricional ou de suplementação.",
      "- Fotos: descreva apenas diferenças visuais gerais sustentadas pelas análises individuais.",
      "- Alimentação e suplementação: organize o que foi informado, sem transformar em recomendação clínica.",
      "- Treino: resuma divisão, foco e exercícios quando existirem nos dados; não invente itens ausentes.",
      "- comparison_with_previous deve explicar mudanças apenas quando houver estado anterior comparável. Se for a primeira atualização, deixe claro que é a linha de base.",
      "- recommended_primary_goal só deve trazer um objetivo curto quando estiver explícito ou fortemente sustentado; caso contrário use string vazia.",
      "- inconsistencies deve listar conflitos entre arquivos/contexto e dados que precisam de conferência.",
      "- missing_information deve listar informações que aumentariam a qualidade do próximo acompanhamento.",
      "",
      `ATUALIZAÇÃO ATUAL:\n${JSON.stringify(
        currentPayload,
      )}`,
      "",
      `ATUALIZAÇÃO ANTERIOR:\n${JSON.stringify(
        previousPayload ??
          "Nenhuma. Esta é a primeira atualização consolidada.",
      )}`,
    ].join("\n");

    const result = await generateNexus({
      system:
        "Você é o Nexus da Candinho Physique. Consolide dossiês de atletas com rigor factual, comparação temporal e revisão humana obrigatória.",
      prompt,
      schema:
        OUTPUT_SCHEMA as unknown as JsonRecord,
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
        "O Nexus retornou a consolidação em formato inválido.",
      );
    }

    return NextResponse.json({
      analysis,
      model: result.model,
      provider: result.provider,
      file_count: imported.length,
      compared_with_previous:
        Boolean(previousSession),
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
