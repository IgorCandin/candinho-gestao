import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  deleteOpenAIFile,
  uploadOpenAIUserFile,
} from "@/lib/openai-file-input";

export const runtime = "nodejs";
export const maxDuration = 60;

type JsonRecord = Record<string, unknown>;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    goal: { type: ["string", "null"] },
    coach_name: { type: ["string", "null"] },
    starts_on: { type: ["string", "null"] },
    ends_on: { type: ["string", "null"] },
    notes: { type: ["string", "null"] },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day_label: { type: "string" },
          focus: { type: ["string", "null"] },
          notes: { type: ["string", "null"] },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                exercise_name: { type: "string" },
                sets_text: { type: ["string", "null"] },
                reps_text: { type: ["string", "null"] },
                rest_seconds: { type: ["integer", "null"] },
                technique: { type: ["string", "null"] },
                load_guidance: { type: ["string", "null"] },
                notes: { type: ["string", "null"] },
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
    summary: { type: "string" },
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

function outputText(payload: JsonRecord) {
  if (typeof payload.output_text === "string") {
    return payload.output_text.trim();
  }

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

function normalizeDate(value: unknown) {
  return typeof value === "string" &&
    datePattern.test(value)
    ? value
    : null;
}

function normalizeTraining(data: JsonRecord) {
  return {
    ...data,
    starts_on: normalizeDate(data.starts_on),
    ends_on: normalizeDate(data.ends_on),
  };
}

async function responseJson(
  response: Response,
): Promise<JsonRecord> {
  try {
    return (await response.json()) as JsonRecord;
  } catch {
    return {};
  }
}

function openAIError(
  status: number,
  raw: JsonRecord,
) {
  const apiError =
    raw.error && typeof raw.error === "object"
      ? (raw.error as JsonRecord)
      : null;

  const detail =
    typeof apiError?.message === "string"
      ? apiError.message
      : "";

  const code =
    typeof apiError?.code === "string"
      ? apiError.code
      : "";

  const quota =
    code === "insufficient_quota" ||
    /quota|billing|current plan|exceeded your current quota/i.test(
      detail,
    );

  if (status === 429 && quota) {
    return {
      quota: true,
      message:
        "O Nexus está temporariamente indisponível porque a cota da inteligência artificial foi atingida. Regularize o faturamento da API OpenAI e tente novamente.",
    };
  }

  if (status === 429) {
    return {
      quota: false,
      message:
        "O Nexus recebeu muitas solicitações agora. Aguarde um instante e tente novamente.",
    };
  }

  if (status === 401 || status === 403) {
    return {
      quota: false,
      message:
        "A integração do Nexus com a OpenAI precisa ser revisada pelo administrador.",
    };
  }

  return {
    quota: false,
    message: `Nexus temporariamente indisponível (${status}).`,
  };
}

async function callOpenAI(
  apiKey: string,
  file: File,
) {
  let openAIFileId: string | null = null;

  try {
    openAIFileId = await uploadOpenAIUserFile(
      apiKey,
      file,
    );

    const model =
      process.env.OPENAI_PHYSIQUE_MODEL || "gpt-5";

    const payload = {
      model,
      store: false,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Leia esta ficha de treino em PDF e transforme-a em estrutura de dias e exercícios.",
                "Preserve nomes, séries, repetições, descanso, técnica e orientação de carga somente quando constarem ou forem inequívocos.",
                "Não invente exercícios ou prescrições ausentes. Não dê orientação médica.",
                "Datas devem usar YYYY-MM-DD quando identificáveis.",
                "Se a ficha usar letras (A/B/C) ou dias da semana, preserve essa organização em day_label.",
                "Na summary, explique em português o que foi importado e qualquer ambiguidade relevante.",
              ].join("\n"),
            },
            {
              type: "input_file",
              file_id: openAIFileId,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "candinho_physique_training",
          strict: true,
          schema: OUTPUT_SCHEMA,
        },
      },
    };

    let lastMessage =
      "Não foi possível interpretar a ficha.";

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(45_000),
        },
      );

      const raw = await responseJson(response);

      if (response.ok) {
        const text = outputText(raw);

        if (!text) {
          throw new Error(
            "O Nexus não retornou a ficha estruturada.",
          );
        }

        let parsed: JsonRecord;

        try {
          parsed = JSON.parse(text) as JsonRecord;
        } catch {
          throw new Error(
            "O Nexus retornou uma ficha em formato inválido.",
          );
        }

        return {
          data: normalizeTraining(parsed),
          model,
        };
      }

      const friendly = openAIError(
        response.status,
        raw,
      );

      lastMessage = friendly.message;

      if (
        friendly.quota ||
        ![429, 500, 502, 503, 504].includes(
          response.status,
        ) ||
        attempt === 1
      ) {
        break;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1200 * (attempt + 1)),
      );
    }

    throw new Error(lastMessage);
  } finally {
    await deleteOpenAIFile(
      apiKey,
      openAIFileId,
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();

    if (!access.canManageUsers && access.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Sem permissão para interpretar fichas da Physique.",
        },
        { status: 403 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "A integração do Nexus com a OpenAI ainda não está configurada.",
        },
        { status: 503 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Envie um arquivo PDF." },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "O PDF enviado está vazio." },
        { status: 400 },
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
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

    const result = await callOpenAI(apiKey, file);

    return NextResponse.json({
      ...result.data,
      model: result.model,
      saved: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível interpretar a ficha.",
      },
      { status: 500 },
    );
  }
}
