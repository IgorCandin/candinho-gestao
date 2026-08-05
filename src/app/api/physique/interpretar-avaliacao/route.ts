import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  generateNexus,
  nexusErrorResponse,
  type JsonRecord,
} from "@/lib/nexus-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    "assessed_on",
    "weight_kg",
    "height_cm",
    "body_fat_pct",
    "chest_cm",
    "waist_cm",
    "abdomen_cm",
    "hips_cm",
    "arm_left_cm",
    "arm_right_cm",
    "thigh_left_cm",
    "thigh_right_cm",
    "calf_left_cm",
    "calf_right_cm",
    "summary",
  ],
  additionalProperties: false,
} as const;

function normalizeDate(value: unknown) {
  return typeof value === "string" && datePattern.test(value) ? value : null;
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

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "O PDF enviado está vazio." }, { status: 400 });
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
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

    const result = await generateNexus({
      system:
        "Você é o Nexus da Candinho Physique. Extraia avaliações físicas com rigor factual, sem diagnóstico ou invenção de medidas.",
      prompt: [
        "Leia esta avaliação física em PDF e extraia somente valores que estejam realmente presentes no documento.",
        "Não estime medidas ausentes e não faça diagnóstico médico.",
        "Datas devem usar YYYY-MM-DD quando identificáveis.",
        "Na summary, resuma em português o que foi encontrado e sinalize campos relevantes que ficaram ausentes ou ambíguos.",
      ].join("\n"),
      schema: OUTPUT_SCHEMA as unknown as JsonRecord,
      files: [{ file, mimeType: "application/pdf" }],
      geminiModel:
        process.env.GEMINI_PHYSIQUE_MODEL || "gemini-2.5-flash-lite",
      openAIModel:
        process.env.OPENAI_PHYSIQUE_MODEL || "gpt-5-mini",
      timeoutMs: 50_000,
    });

    let parsed: JsonRecord;

    try {
      parsed = JSON.parse(result.text) as JsonRecord;
    } catch {
      throw new Error("O Nexus retornou uma avaliação em formato inválido.");
    }

    return NextResponse.json({
      ...parsed,
      assessed_on: normalizeDate(parsed.assessed_on),
      model: result.model,
      provider: result.provider,
      saved: false,
    });
  } catch (error) {
    const friendly = nexusErrorResponse(error);
    return NextResponse.json(
      { error: friendly.error, code: friendly.code },
      { status: friendly.status },
    );
  }
}
