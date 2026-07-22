import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";

export const runtime = "nodejs";
export const maxDuration = 60;

type JsonRecord = Record<string, unknown>;

const nullableNumber = { type: ["number", "null"] } as const;
const nullableString = { type: ["string", "null"] } as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    assessed_on: nullableString,
    weight_kg: nullableNumber,
    height_cm: nullableNumber,
    body_fat_pct: nullableNumber,
    chest_cm: nullableNumber,
    waist_cm: nullableNumber,
    abdomen_cm: nullableNumber,
    hips_cm: nullableNumber,
    arm_left_cm: nullableNumber,
    arm_right_cm: nullableNumber,
    thigh_left_cm: nullableNumber,
    thigh_right_cm: nullableNumber,
    calf_left_cm: nullableNumber,
    calf_right_cm: nullableNumber,
    summary: { type: "string" },
  },
  required: [
    "assessed_on", "weight_kg", "height_cm", "body_fat_pct", "chest_cm",
    "waist_cm", "abdomen_cm", "hips_cm", "arm_left_cm", "arm_right_cm",
    "thigh_left_cm", "thigh_right_cm", "calf_left_cm", "calf_right_cm", "summary",
  ],
  additionalProperties: false,
} as const;

function outputText(payload: JsonRecord) {
  if (typeof payload.output_text === "string") return payload.output_text.trim();
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as JsonRecord).content;
      return Array.isArray(content) ? content : [];
    })
    .filter((item) => item && typeof item === "object" && (item as JsonRecord).type === "output_text")
    .map((item) => String((item as JsonRecord).text ?? ""))
    .join("\n")
    .trim();
}

function normalizeAssessment(data: JsonRecord) {
  const assessedOn = typeof data.assessed_on === "string" && datePattern.test(data.assessed_on)
    ? data.assessed_on
    : null;
  return { ...data, assessed_on: assessedOn };
}

async function responseJson(response: Response): Promise<JsonRecord> {
  try {
    return (await response.json()) as JsonRecord;
  } catch {
    return {};
  }
}

async function callOpenAI(apiKey: string, file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const model = process.env.OPENAI_PHYSIQUE_MODEL || "gpt-5";
  const payload = {
    model,
    store: false,
    input: [{
      role: "user",
      content: [
        {
          type: "input_text",
          text: [
            "Leia esta avaliação física em PDF e extraia somente valores que estejam realmente presentes no documento.",
            "Não estime medidas ausentes e não faça diagnóstico médico.",
            "Datas devem usar YYYY-MM-DD quando identificáveis.",
            "Na summary, resuma em português o que foi encontrado e sinalize campos relevantes que ficaram ausentes ou ambíguos.",
          ].join("\n"),
        },
        { type: "input_file", filename: file.name || "avaliacao.pdf", file_data: base64 },
      ],
    }],
    text: {
      format: {
        type: "json_schema",
        name: "candinho_physique_assessment",
        strict: true,
        schema: OUTPUT_SCHEMA,
      },
    },
  };

  let lastMessage = "Não foi possível interpretar o PDF.";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45_000),
    });
    const raw = await responseJson(response);

    if (response.ok) {
      const text = outputText(raw);
      if (!text) throw new Error("O Nexus não retornou dados estruturados da avaliação.");
      let parsed: JsonRecord;
      try {
        parsed = JSON.parse(text) as JsonRecord;
      } catch {
        throw new Error("O Nexus retornou uma avaliação em formato inválido.");
      }
      return { data: normalizeAssessment(parsed), model };
    }

    const apiError = raw.error && typeof raw.error === "object" ? raw.error as JsonRecord : null;
    lastMessage = typeof apiError?.message === "string"
      ? apiError.message
      : `Nexus indisponível (${response.status}).`;

    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
  }

  throw new Error(lastMessage);
}

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();
    if (!access.canManageUsers && access.role !== "admin") {
      return NextResponse.json(
        { error: "Sem permissão para interpretar avaliações da Physique." },
        { status: 403 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não está disponível neste deployment." },
        { status: 503 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "O PDF enviado está vazio." }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "A leitura do Nexus aceita PDF nesta etapa." },
        { status: 400 },
      );
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "O PDF deve ter no máximo 4 MB para leitura pelo Nexus." },
        { status: 413 },
      );
    }

    const result = await callOpenAI(apiKey, file);
    return NextResponse.json({ ...result.data, model: result.model, saved: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível interpretar a avaliação." },
      { status: 500 },
    );
  }
}
