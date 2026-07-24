import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  deleteOpenAIFile,
  uploadOpenAIUserFile,
} from "@/lib/openai-file-input";

export const runtime = "nodejs";
export const maxDuration = 60;

type JsonRecord = Record<string, unknown>;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    file_category: { type: "string" },
    summary: { type: "string" },
    extracted_facts: { type: "array", items: { type: "string" } },
    attention_points: { type: "array", items: { type: "string" } },
    normalized_context: { type: "string" },
    suggested_goal: { type: "string" },
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

function extractOutputText(payload: JsonRecord) {
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

async function responseJson(response: Response): Promise<JsonRecord> {
  try {
    return (await response.json()) as JsonRecord;
  } catch {
    return {};
  }
}

function openAIError(status: number, raw: JsonRecord) {
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
    /quota|billing|current plan|exceeded your current quota/i.test(detail);

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

export async function POST(request: Request) {
  let openAIFileId: string | null = null;

  try {
    const access = await getCurrentUserAccess();
    if (!access.canManageUsers && access.role !== "admin") {
      return NextResponse.json(
        { error: "Sem permissão para analisar arquivos do Physique." },
        { status: 403 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const fileType = String(form.get("file_type") ?? "other");
    const context = String(form.get("context") ?? "").trim();

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Selecione um arquivo válido." },
        { status: 400 },
      );
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "O arquivo deve ter no máximo 4 MB por importação." },
        { status: 413 },
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

    const prompt = [
      `Tipo informado pelo usuário: ${fileType}`,
      `Contexto complementar: ${context || "Não informado"}`,
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

    const content: Array<Record<string, unknown>> = [
      { type: "input_text", text: prompt },
    ];

    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      openAIFileId = await uploadOpenAIUserFile(apiKey, file);

      content.push({
        type: "input_file",
        file_id: openAIFileId,
      });
    } else if (file.type.startsWith("image/")) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const base64 = bytes.toString("base64");

      content.push({
        type: "input_image",
        image_url: `data:${file.type};base64,${base64}`,
      });
    } else {
      const bytes = Buffer.from(await file.arrayBuffer());

      content.push({
        type: "input_text",
        text: `Conteúdo do arquivo:\n${bytes
          .toString("utf8")
          .slice(0, 30000)}`,
      });
    }

    const body = JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: "system",
          content:
            "Você é o Nexus da Candinho Physique. Organize histórico de atletas com rigor factual, comparação futura e revisão humana.",
        },
        {
          role: "user",
          content,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "physique_athlete_file_analysis",
          schema: OUTPUT_SCHEMA,
          strict: true,
        },
      },
    });

    let lastMessage =
      "Não foi possível analisar o arquivo com o Nexus.";

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body,
          signal: AbortSignal.timeout(50_000),
        },
      );

      const raw = await responseJson(response);

      if (response.ok) {
        const outputText = extractOutputText(raw);

        if (!outputText) {
          throw new Error(
            "O Nexus não retornou uma análise estruturada.",
          );
        }

        try {
          return NextResponse.json({
            analysis: JSON.parse(outputText),
            model,
          });
        } catch {
          throw new Error(
            "O Nexus retornou a análise em formato inválido.",
          );
        }
      }

      const friendly = openAIError(response.status, raw);
      lastMessage = friendly.message;

      if (
        friendly.quota ||
        ![429, 500, 502, 503, 504].includes(response.status) ||
        attempt === 1
      ) {
        break;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1200 * (attempt + 1)),
      );
    }

    return NextResponse.json(
      { error: lastMessage },
      { status: 502 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível analisar o arquivo.",
      },
      { status: 500 },
    );
  } finally {
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      await deleteOpenAIFile(apiKey, openAIFileId);
    }
  }
}
