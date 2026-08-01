import {
  deleteOpenAIFile,
  uploadOpenAIUserFile,
} from "@/lib/openai-file-input";

export type NexusProvider = "gemini" | "openai";
export type JsonRecord = Record<string, unknown>;

export type NexusFileInput = {
  file: File;
  mimeType?: string;
};

export type NexusGenerateOptions = {
  prompt: string;
  system?: string;
  schema?: JsonRecord;
  files?: NexusFileInput[];
  webSearch?: boolean;
  geminiModel?: string;
  openAIModel?: string;
  timeoutMs?: number;
};

export type NexusGenerateResult = {
  text: string;
  provider: NexusProvider;
  model: string;
  sources: string[];
};

export class NexusAIError extends Error {
  code: string;
  status: number;
  provider?: NexusProvider;

  constructor(
    message: string,
    code = "AI_UNAVAILABLE",
    status = 503,
    provider?: NexusProvider,
  ) {
    super(message);
    this.name = "NexusAIError";
    this.code = code;
    this.status = status;
    this.provider = provider;
  }
}

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

const LEGACY_GEMINI_MODELS = new Set([
  "gemini-2.5-flash-lite",
  "models/gemini-2.5-flash-lite",
]);

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeGeminiModel(value?: string | null) {
  const requested = value?.trim();

  if (!requested) {
    return DEFAULT_GEMINI_MODEL;
  }

  if (LEGACY_GEMINI_MODELS.has(requested)) {
    return DEFAULT_GEMINI_MODEL;
  }

  return requested.replace(/^models\//, "");
}

async function safeJson(response: Response): Promise<JsonRecord> {
  try {
    return (await response.json()) as JsonRecord;
  } catch {
    return {};
  }
}

function providerOrder(): NexusProvider[] {
  const preferred = (
    process.env.NEXUS_AI_PROVIDER ||
    (process.env.GEMINI_API_KEY ? "gemini" : "openai")
  ).toLowerCase();

  const allowOpenAIFallback =
    process.env.NEXUS_OPENAI_FALLBACK !== "false";

  if (preferred === "openai") {
    return process.env.GEMINI_API_KEY
      ? ["openai", "gemini"]
      : ["openai"];
  }

  return allowOpenAIFallback
    ? ["gemini", "openai"]
    : ["gemini"];
}

function geminiText(raw: JsonRecord) {
  const candidates = Array.isArray(raw.candidates)
    ? raw.candidates
    : [];

  return candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object") return [];

      const content = (candidate as JsonRecord).content;
      if (!content || typeof content !== "object") return [];

      const parts = (content as JsonRecord).parts;
      return Array.isArray(parts) ? parts : [];
    })
    .map((part) =>
      part && typeof part === "object"
        ? safeString((part as JsonRecord).text)
        : "",
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

function geminiSources(raw: JsonRecord) {
  const result = new Set<string>();
  const candidates = Array.isArray(raw.candidates)
    ? raw.candidates
    : [];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;

    const metadata = (candidate as JsonRecord).groundingMetadata;
    if (!metadata || typeof metadata !== "object") continue;

    const chunks = (metadata as JsonRecord).groundingChunks;
    if (!Array.isArray(chunks)) continue;

    for (const chunk of chunks) {
      if (!chunk || typeof chunk !== "object") continue;

      const web = (chunk as JsonRecord).web;

      if (
        web &&
        typeof web === "object" &&
        typeof (web as JsonRecord).uri === "string"
      ) {
        result.add(String((web as JsonRecord).uri));
      }
    }
  }

  return [...result].slice(0, 8);
}

function geminiError(
  status: number,
  raw: JsonRecord,
): NexusAIError {
  const error =
    raw.error && typeof raw.error === "object"
      ? (raw.error as JsonRecord)
      : null;

  const detail = safeString(error?.message);
  const statusText = safeString(error?.status);

  if (
    status === 429 ||
    statusText === "RESOURCE_EXHAUSTED"
  ) {
    return new NexusAIError(
      "O limite gratuito do Nexus foi atingido temporariamente. Tente novamente mais tarde.",
      "AI_FREE_TIER_LIMIT",
      503,
      "gemini",
    );
  }

  if (status === 401 || status === 403) {
    return new NexusAIError(
      "A integração do Nexus com a inteligência artificial precisa ser revisada.",
      "AI_AUTH",
      503,
      "gemini",
    );
  }

  if (
    /no longer available|not found|deprecated|unsupported model|model.*unavailable/i.test(
      detail,
    )
  ) {
    return new NexusAIError(
      "O modelo de inteligência artificial do Nexus está temporariamente indisponível.",
      "AI_MODEL_UNAVAILABLE",
      503,
      "gemini",
    );
  }

  return new NexusAIError(
    "O Gemini está temporariamente indisponível.",
    "AI_UNAVAILABLE",
    status >= 500 ? 502 : 503,
    "gemini",
  );
}

async function callGemini(
  options: NexusGenerateOptions,
): Promise<NexusGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new NexusAIError(
      "GEMINI_API_KEY não está configurada.",
      "AI_NOT_CONFIGURED",
      503,
      "gemini",
    );
  }

  const model = normalizeGeminiModel(
    options.geminiModel ||
      process.env.GEMINI_NEXUS_MODEL,
  );

  const parts: JsonRecord[] = [{ text: options.prompt }];

  for (const item of options.files ?? []) {
    const bytes = Buffer.from(await item.file.arrayBuffer());

    parts.push({
      inline_data: {
        mime_type:
          item.mimeType ||
          item.file.type ||
          "application/octet-stream",
        data: bytes.toString("base64"),
      },
    });
  }

  const payload: JsonRecord = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  };

  if (options.system) {
    payload.systemInstruction = {
      parts: [{ text: options.system }],
    };
  }

  if (options.schema) {
    payload.generationConfig = {
      responseMimeType: "application/json",
      responseJsonSchema: options.schema,
    };
  }

  if (options.webSearch) {
    payload.tools = [{ google_search: {} }];
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(options.timeoutMs ?? 50_000),
    },
  );

  const raw = await safeJson(response);

  if (!response.ok) {
    throw geminiError(response.status, raw);
  }

  const text = geminiText(raw);

  if (!text) {
    throw new NexusAIError(
      "O Gemini não retornou uma resposta válida.",
      "AI_EMPTY_RESPONSE",
      502,
      "gemini",
    );
  }

  return {
    text,
    provider: "gemini",
    model,
    sources: options.webSearch ? geminiSources(raw) : [],
  };
}

function openAIText(raw: JsonRecord) {
  if (typeof raw.output_text === "string") {
    return raw.output_text.trim();
  }

  const output = Array.isArray(raw.output)
    ? raw.output
    : [];

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
    .map((item) => safeString((item as JsonRecord).text))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function openAISources(raw: JsonRecord) {
  const result = new Set<string>();
  const output = Array.isArray(raw.output)
    ? raw.output
    : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;

    const record = item as JsonRecord;

    if (record.type !== "web_search_call") continue;

    const action =
      record.action && typeof record.action === "object"
        ? (record.action as JsonRecord)
        : null;

    const sources = action?.sources;

    if (!Array.isArray(sources)) continue;

    for (const source of sources) {
      if (
        source &&
        typeof source === "object" &&
        typeof (source as JsonRecord).url === "string"
      ) {
        result.add(String((source as JsonRecord).url));
      }
    }
  }

  return [...result].slice(0, 8);
}

function openAIError(
  status: number,
  raw: JsonRecord,
): NexusAIError {
  const error =
    raw.error && typeof raw.error === "object"
      ? (raw.error as JsonRecord)
      : null;

  const detail = safeString(error?.message);
  const code = safeString(error?.code);

  const quota =
    code === "insufficient_quota" ||
    /quota|billing|current plan|exceeded your current quota/i.test(
      detail,
    );

  if (status === 429 && quota) {
    return new NexusAIError(
      "A cota da OpenAI foi atingida.",
      "AI_QUOTA",
      503,
      "openai",
    );
  }

  if (status === 429) {
    return new NexusAIError(
      "A OpenAI está temporariamente ocupada.",
      "AI_BUSY",
      503,
      "openai",
    );
  }

  if (status === 401 || status === 403) {
    return new NexusAIError(
      "A integração do Nexus com a OpenAI precisa ser revisada.",
      "AI_AUTH",
      503,
      "openai",
    );
  }

  return new NexusAIError(
    "A OpenAI está temporariamente indisponível.",
    "AI_UNAVAILABLE",
    status >= 500 ? 502 : 503,
    "openai",
  );
}

async function callOpenAI(
  options: NexusGenerateOptions,
): Promise<NexusGenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new NexusAIError(
      "OPENAI_API_KEY não está configurada.",
      "AI_NOT_CONFIGURED",
      503,
      "openai",
    );
  }

  const model =
    options.openAIModel ||
    process.env.OPENAI_NEXUS_MODEL ||
    "gpt-5-mini";

  const uploadedFiles: string[] = [];

  try {
    const content: JsonRecord[] = [
      {
        type: "input_text",
        text: options.prompt,
      },
    ];

    for (const item of options.files ?? []) {
      const mime =
        item.mimeType ||
        item.file.type ||
        "application/octet-stream";

      if (
        mime === "application/pdf" ||
        item.file.name.toLowerCase().endsWith(".pdf")
      ) {
        const id = await uploadOpenAIUserFile(
          apiKey,
          item.file,
        );

        uploadedFiles.push(id);
        content.push({
          type: "input_file",
          file_id: id,
        });
      } else if (mime.startsWith("image/")) {
        const bytes = Buffer.from(
          await item.file.arrayBuffer(),
        );

        content.push({
          type: "input_image",
          image_url: `data:${mime};base64,${bytes.toString("base64")}`,
        });
      } else {
        const bytes = Buffer.from(
          await item.file.arrayBuffer(),
        );

        content.push({
          type: "input_text",
          text: `Conteúdo do arquivo ${item.file.name}:\n${bytes
            .toString("utf8")
            .slice(0, 30000)}`,
        });
      }
    }

    const payload: JsonRecord = {
      model,
      store: false,
      input: [
        ...(options.system
          ? [
              {
                role: "system",
                content: options.system,
              },
            ]
          : []),
        {
          role: "user",
          content,
        },
      ],
    };

    if (options.schema) {
      payload.text = {
        format: {
          type: "json_schema",
          name: "nexus_structured_output",
          schema: options.schema,
          strict: true,
        },
      };
    }

    if (options.webSearch) {
      payload.tools = [{ type: "web_search" }];
      payload.include = [
        "web_search_call.action.sources",
      ];
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(
          options.timeoutMs ?? 50_000,
        ),
      },
    );

    const raw = await safeJson(response);

    if (!response.ok) {
      throw openAIError(response.status, raw);
    }

    const text = openAIText(raw);

    if (!text) {
      throw new NexusAIError(
        "A OpenAI não retornou uma resposta válida.",
        "AI_EMPTY_RESPONSE",
        502,
        "openai",
      );
    }

    return {
      text,
      provider: "openai",
      model,
      sources: options.webSearch
        ? openAISources(raw)
        : [],
    };
  } finally {
    await Promise.all(
      uploadedFiles.map((id) =>
        deleteOpenAIFile(apiKey, id),
      ),
    );
  }
}

export async function generateNexus(
  options: NexusGenerateOptions,
): Promise<NexusGenerateResult> {
  const errors: NexusAIError[] = [];

  for (const provider of providerOrder()) {
    try {
      if (provider === "gemini") {
        if (!process.env.GEMINI_API_KEY) continue;
        return await callGemini(options);
      }

      if (!process.env.OPENAI_API_KEY) continue;
      return await callOpenAI(options);
    } catch (error) {
      const normalized =
        error instanceof NexusAIError
          ? error
          : new NexusAIError(
              error instanceof Error
                ? error.message
                : "Falha ao consultar a inteligência artificial.",
              "AI_UNAVAILABLE",
              502,
              provider,
            );

      errors.push(normalized);

      console.warn(
        `[Nexus] ${provider} falhou:`,
        normalized.code,
        normalized.message,
      );
    }
  }

  if (errors.length === 0) {
    throw new NexusAIError(
      "Nenhum provedor de inteligência artificial está configurado.",
      "AI_NOT_CONFIGURED",
      503,
    );
  }

  const geminiLimit = errors.find(
    (error) =>
      error.provider === "gemini" &&
      error.code === "AI_FREE_TIER_LIMIT",
  );

  if (geminiLimit) {
    throw geminiLimit;
  }

  const last = errors[errors.length - 1];

  throw new NexusAIError(
    errors.length > 1
      ? "Os provedores de inteligência artificial do Nexus estão temporariamente indisponíveis."
      : last.message,
    last.code,
    last.status,
    last.provider,
  );
}

export function nexusErrorResponse(error: unknown) {
  if (error instanceof NexusAIError) {
    if (
      error.code === "AI_MODEL_UNAVAILABLE" ||
      error.code === "AI_UNAVAILABLE" ||
      error.code === "AI_EMPTY_RESPONSE"
    ) {
      return {
        error:
          "O Nexus está temporariamente indisponível. Tente novamente em instantes.",
        code: error.code,
        status: error.status,
      };
    }

    if (
      error.code === "AI_AUTH" ||
      error.code === "AI_NOT_CONFIGURED"
    ) {
      return {
        error:
          "A inteligência do Nexus precisa de uma revisão de configuração.",
        code: error.code,
        status: error.status,
      };
    }

    return {
      error: error.message,
      code: error.code,
      status: error.status,
    };
  }

  return {
    error:
      "Não foi possível consultar o Nexus agora. Tente novamente em instantes.",
    code: "AI_UNAVAILABLE",
    status: 500,
  };
}
