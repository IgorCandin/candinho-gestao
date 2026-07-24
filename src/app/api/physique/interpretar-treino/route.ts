import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  generateNexus,
  nexusErrorResponse,
  type JsonRecord,
} from "@/lib/nexus-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const datePattern =
  /^\d{4}-\d{2}-\d{2}$/;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    goal: {
      type: ["string", "null"],
    },
    coach_name: {
      type: ["string", "null"],
    },
    starts_on: {
      type: ["string", "null"],
    },
    ends_on: {
      type: ["string", "null"],
    },
    notes: {
      type: ["string", "null"],
    },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day_label: {
            type: "string",
          },
          focus: {
            type: ["string", "null"],
          },
          notes: {
            type: ["string", "null"],
          },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                exercise_name: {
                  type: "string",
                },
                sets_text: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                reps_text: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                rest_seconds: {
                  type: [
                    "integer",
                    "null",
                  ],
                },
                technique: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                load_guidance: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                notes: {
                  type: [
                    "string",
                    "null",
                  ],
                },
              },
              required: [
                "exercise_name",
                "sets_text",
                "reps_text",
                "rest_seconds",
                "technique",
                "load_guidance",
                "notes",
              ],
              additionalProperties: false,
            },
          },
        },
        required: [
          "day_label",
          "focus",
          "notes",
          "exercises",
        ],
        additionalProperties: false,
      },
    },
    summary: {
      type: "string",
    },
  },
  required: [
    "title",
    "goal",
    "coach_name",
    "starts_on",
    "ends_on",
    "notes",
    "days",
    "summary",
  ],
  additionalProperties: false,
} as const;

function normalizeDate(
  value: unknown,
) {
  return typeof value === "string" &&
    datePattern.test(value)
    ? value
    : null;
}

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
            "Sem permissão para interpretar fichas da Physique.",
        },
        { status: 403 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Envie um arquivo PDF.",
        },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          error:
            "O PDF enviado está vazio.",
        },
        { status: 400 },
      );
    }

    if (
      file.type !==
        "application/pdf" &&
      !file.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      return NextResponse.json(
        {
          error:
            "A importação automática aceita PDF nesta etapa.",
        },
        { status: 400 },
      );
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        {
          error:
            "O PDF deve ter no máximo 4 MB para leitura pelo Nexus.",
        },
        { status: 413 },
      );
    }

    const prompt = [
      "Leia esta ficha de treino em PDF e transforme-a em estrutura de dias e exercícios.",
      "Preserve nomes, séries, repetições, descanso, técnica e orientação de carga somente quando constarem ou forem inequívocos.",
      "Não invente exercícios ou prescrições ausentes. Não dê orientação médica.",
      "Datas devem usar YYYY-MM-DD quando identificáveis.",
      "Se a ficha usar letras (A/B/C) ou dias da semana, preserve essa organização em day_label.",
      "Na summary, explique em português o que foi importado e qualquer ambiguidade relevante.",
    ].join("\n");

    const result = await generateNexus({
      system:
        "Você é o Nexus da Candinho Physique. Extraia fichas de treino com rigor factual e revisão humana obrigatória.",
      prompt,
      schema:
        OUTPUT_SCHEMA as unknown as JsonRecord,
      files: [
        {
          file,
          mimeType:
            "application/pdf",
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

    let parsed: JsonRecord;

    try {
      parsed = JSON.parse(
        result.text,
      ) as JsonRecord;
    } catch {
      throw new Error(
        "O Nexus retornou uma ficha em formato inválido.",
      );
    }

    return NextResponse.json({
      ...parsed,
      starts_on: normalizeDate(
        parsed.starts_on,
      ),
      ends_on: normalizeDate(
        parsed.ends_on,
      ),
      model: result.model,
      provider: result.provider,
      saved: false,
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
