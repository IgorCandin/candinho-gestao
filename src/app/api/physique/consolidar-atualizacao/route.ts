import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type JsonRecord = Record<string, unknown>;

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
    extracted_facts: { type: "array", items: { type: "string" } },
    visual_notes: { type: "array", items: { type: "string" } },
    attention_points: { type: "array", items: { type: "string" } },
    inconsistencies: { type: "array", items: { type: "string" } },
    missing_information: { type: "array", items: { type: "string" } },
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

function extractOutputText(payload: JsonRecord) {
  if (typeof payload.output_text === "string") return payload.output_text.trim();

  const output = Array.isArray(payload.output) ? payload.output : [];
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as JsonRecord).content;
      return Array.isArray(content) ? content : [];
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

async function responseJson(response: Response): Promise<JsonRecord> {
  try {
    return (await response.json()) as JsonRecord;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();
    if (!access.canManageUsers && access.role !== "admin") {
      return NextResponse.json(
        { error: "Sem permissão para consolidar o dossiê do Physique." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const sessionId =
      typeof body.session_id === "string" ? body.session_id.trim() : "";

    if (!sessionId) {
      return NextResponse.json(
        { error: "Atualização do atleta não identificada." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from("physique_athlete_import_sessions")
      .select("id,athlete_id,title,status,context,created_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session || session.status !== "open") {
      return NextResponse.json(
        { error: "A atualização aberta do atleta não foi encontrada." },
        { status: 404 },
      );
    }

    const [
      { data: importedFiles, error: filesError },
      { data: previousSession, error: previousError },
    ] = await Promise.all([
      supabase
        .from("physique_athlete_import_files")
        .select("id,file_type,file_name,ai_payload,ai_summary,created_at")
        .eq("session_id", sessionId)
        .order("created_at"),
      supabase
        .from("physique_athlete_import_sessions")
        .select("id,title,context,ai_summary,ai_payload,completed_at")
        .eq("athlete_id", session.athlete_id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (filesError) throw filesError;
    if (previousError) throw previousError;

    const files = importedFiles ?? [];
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos um arquivo antes de consolidar a atualização." },
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

    const model = process.env.OPENAI_PHYSIQUE_MODEL || "gpt-5";

    const currentPayload = {
      title: session.title,
      context: session.context ?? {},
      files: files.map((file) => ({
        type: file.file_type,
        name: file.file_name,
        summary: file.ai_summary,
        analysis: file.ai_payload ?? {},
      })),
    };

    const previousPayload = previousSession
      ? {
          title: previousSession.title,
          context: previousSession.context ?? {},
          summary: previousSession.ai_summary,
          analysis: previousSession.ai_payload ?? {},
          completed_at: previousSession.completed_at,
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
      "- Fotos: descreva apenas diferenças visuais gerais que estejam realmente sustentadas pelas análises individuais.",
      "- Alimentação e suplementação: organize o que foi informado, sem transformar em recomendação clínica.",
      "- Treino: resuma divisão, foco e exercícios quando existirem nos dados; não invente itens ausentes.",
      "- comparison_with_previous deve explicar mudanças apenas quando houver estado anterior comparável. Se for a primeira atualização, deixe claro que é a linha de base.",
      "- recommended_primary_goal só deve trazer um objetivo curto quando estiver explícito ou fortemente sustentado; caso contrário use string vazia.",
      "- inconsistencies deve listar conflitos entre arquivos/contexto e dados que precisam de conferência.",
      "- missing_information deve listar informações que aumentariam a qualidade do próximo acompanhamento.",
      "",
      `ATUALIZAÇÃO ATUAL:\n${JSON.stringify(currentPayload)}`,
      "",
      `ATUALIZAÇÃO ANTERIOR:\n${JSON.stringify(previousPayload ?? "Nenhuma. Esta é a primeira atualização consolidada.")}`,
    ].join("\n");

    const requestBody = JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: "system",
          content:
            "Você é o Nexus da Candinho Physique. Consolide dossiês de atletas com rigor factual, comparação temporal e revisão humana obrigatória.",
        },
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "physique_dossier_consolidation",
          schema: OUTPUT_SCHEMA,
          strict: true,
        },
      },
    });

    let lastMessage = "Não foi possível consolidar a atualização com o Nexus.";

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
        signal: AbortSignal.timeout(50_000),
      });

      const raw = await responseJson(response);

      if (response.ok) {
        const outputText = extractOutputText(raw);
        if (!outputText) {
          throw new Error("O Nexus não retornou uma consolidação estruturada.");
        }

        try {
          return NextResponse.json({
            analysis: JSON.parse(outputText),
            model,
            file_count: files.length,
            compared_with_previous: Boolean(previousSession),
          });
        } catch {
          throw new Error("O Nexus retornou a consolidação em formato inválido.");
        }
      }

      const apiError =
        raw.error && typeof raw.error === "object"
          ? (raw.error as JsonRecord)
          : null;

      lastMessage =
        apiError && typeof apiError.message === "string"
          ? apiError.message
          : `Nexus indisponível (${response.status}).`;

      if (
        ![429, 500, 502, 503, 504].includes(response.status) ||
        attempt === 1
      ) {
        break;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1200 * (attempt + 1)),
      );
    }

    return NextResponse.json({ error: lastMessage }, { status: 502 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível consolidar o dossiê.",
      },
      { status: 500 },
    );
  }
}
