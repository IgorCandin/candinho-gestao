type JsonRecord = Record<string, unknown>;

export type NexusEdgeProvider =
  | "gemini"
  | "openai";

export class NexusEdgeError extends Error {
  code: string;
  status: number;
  provider?: NexusEdgeProvider;

  constructor(
    message: string,
    code = "AI_UNAVAILABLE",
    status = 503,
    provider?: NexusEdgeProvider,
  ) {
    super(message);
    this.name = "NexusEdgeError";
    this.code = code;
    this.status = status;
    this.provider = provider;
  }
}

type GenerateOptions = {
  prompt: string;
  system?: string;
  schema?: JsonRecord;
  webSearch?: boolean;
  geminiModel?: string;
  openAIModel?: string;
  timeoutMs?: number;
};

export type GenerateResult = {
  text: string;
  provider: NexusEdgeProvider;
  model: string;
  sources: string[];
};

function stringValue(value: unknown) {
  return typeof value === "string"
    ? value
    : "";
}

async function safeJson(
  response: Response,
): Promise<JsonRecord> {
  try {
    return (await response.json()) as JsonRecord;
  } catch {
    return {};
  }
}

function order(): NexusEdgeProvider[] {
  const preferred = (
    Deno.env.get("NEXUS_AI_PROVIDER") ||
    (Deno.env.get("GEMINI_API_KEY")
      ? "gemini"
      : "openai")
  ).toLowerCase();

  const allowOpenAI =
    Deno.env.get(
      "NEXUS_OPENAI_FALLBACK",
    ) !== "false";

  if (preferred === "openai") {
    return Deno.env.get(
      "GEMINI_API_KEY",
    )
      ? ["openai", "gemini"]
      : ["openai"];
  }

  return allowOpenAI
    ? ["gemini", "openai"]
    : ["gemini"];
}

function geminiText(raw: JsonRecord) {
  const candidates = Array.isArray(
    raw.candidates,
  )
    ? raw.candidates
    : [];

  return candidates
    .flatMap((candidate) => {
      if (
        !candidate ||
        typeof candidate !==
          "object"
      ) {
        return [];
      }

      const content = (
        candidate as JsonRecord
      ).content;

      if (
        !content ||
        typeof content !==
          "object"
      ) {
        return [];
      }

      const parts = (
        content as JsonRecord
      ).parts;

      return Array.isArray(parts)
        ? parts
        : [];
    })
    .map((part) =>
      part &&
      typeof part === "object"
        ? stringValue(
            (part as JsonRecord)
              .text,
          )
        : "",
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

function geminiSources(
  raw: JsonRecord,
) {
  const sources = new Set<string>();
  const candidates = Array.isArray(
    raw.candidates,
  )
    ? raw.candidates
    : [];

  for (const candidate of candidates) {
    if (
      !candidate ||
      typeof candidate !== "object"
    ) {
      continue;
    }

    const metadata = (
      candidate as JsonRecord
    ).groundingMetadata;

    if (
      !metadata ||
      typeof metadata !== "object"
    ) {
      continue;
    }

    const chunks = (
      metadata as JsonRecord
    ).groundingChunks;

    if (!Array.isArray(chunks)) {
      continue;
    }

    for (const chunk of chunks) {
      if (
        !chunk ||
        typeof chunk !== "object"
      ) {
        continue;
      }

      const web = (
        chunk as JsonRecord
      ).web;

      if (
        web &&
        typeof web === "object" &&
        typeof (
          web as JsonRecord
        ).uri === "string"
      ) {
        sources.add(
          String(
            (web as JsonRecord).uri,
          ),
        );
      }
    }
  }

  return [...sources].slice(0, 8);
}

async function gemini(
  options: GenerateOptions,
): Promise<GenerateResult> {
  const key = Deno.env.get(
    "GEMINI_API_KEY",
  );

  if (!key) {
    throw new NexusEdgeError(
      "GEMINI_API_KEY não configurada.",
      "AI_NOT_CONFIGURED",
      503,
      "gemini",
    );
  }

  const model =
    options.geminiModel ||
    Deno.env.get(
      "GEMINI_NEXUS_MODEL",
    ) ||
    "gemini-2.5-flash-lite";

  const payload: JsonRecord = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: options.prompt,
          },
        ],
      },
    ],
  };

  if (options.system) {
    payload.systemInstruction = {
      parts: [
        {
          text: options.system,
        },
      ],
    };
  }

  if (options.schema) {
    payload.generationConfig = {
      responseMimeType:
        "application/json",
      responseJsonSchema:
        options.schema,
    };
  }

  if (options.webSearch) {
    payload.tools = [
      {
        google_search: {},
      },
    ];
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": key,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(
        options.timeoutMs ?? 40_000,
      ),
    },
  );

  const raw = await safeJson(response);

  if (!response.ok) {
    const error =
      raw.error &&
      typeof raw.error === "object"
        ? (raw.error as JsonRecord)
        : null;

    const detail = stringValue(
      error?.message,
    );

    if (response.status === 429) {
      throw new NexusEdgeError(
        "O limite gratuito do Nexus foi atingido temporariamente. Aguarde a renovação da cota do Gemini ou tente novamente mais tarde.",
        "AI_FREE_TIER_LIMIT",
        503,
        "gemini",
      );
    }

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      throw new NexusEdgeError(
        "A chave gratuita do Gemini precisa ser configurada ou revisada.",
        "AI_AUTH",
        503,
        "gemini",
      );
    }

    throw new NexusEdgeError(
      detail ||
        `Gemini indisponível (${response.status}).`,
      "AI_UNAVAILABLE",
      502,
      "gemini",
    );
  }

  const text = geminiText(raw);

  if (!text) {
    throw new NexusEdgeError(
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
    sources: options.webSearch
      ? geminiSources(raw)
      : [],
  };
}

function openAIText(raw: JsonRecord) {
  if (
    typeof raw.output_text ===
    "string"
  ) {
    return raw.output_text.trim();
  }

  const output = Array.isArray(
    raw.output,
  )
    ? raw.output
    : [];

  return output
    .flatMap((item) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return [];
      }

      const content = (
        item as JsonRecord
      ).content;

      return Array.isArray(content)
        ? content
        : [];
    })
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        (item as JsonRecord).type ===
          "output_text",
    )
    .map((item) =>
      stringValue(
        (item as JsonRecord).text,
      ),
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

function openAISources(
  raw: JsonRecord,
) {
  const sources = new Set<string>();
  const output = Array.isArray(
    raw.output,
  )
    ? raw.output
    : [];

  for (const item of output) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      continue;
    }

    const record =
      item as JsonRecord;

    if (
      record.type ===
      "web_search_call"
    ) {
      const action =
        record.action &&
        typeof record.action ===
          "object"
          ? (record.action as JsonRecord)
          : null;

      const rows =
        action?.sources;

      if (Array.isArray(rows)) {
        for (const source of rows) {
          if (
            source &&
            typeof source ===
              "object" &&
            typeof (
              source as JsonRecord
            ).url === "string"
          ) {
            sources.add(
              String(
                (
                  source as JsonRecord
                ).url,
              ),
            );
          }
        }
      }
    }
  }

  return [...sources].slice(0, 8);
}

async function openai(
  options: GenerateOptions,
): Promise<GenerateResult> {
  const key = Deno.env.get(
    "OPENAI_API_KEY",
  );

  if (!key) {
    throw new NexusEdgeError(
      "OPENAI_API_KEY não configurada.",
      "AI_NOT_CONFIGURED",
      503,
      "openai",
    );
  }

  const model =
    options.openAIModel ||
    Deno.env.get(
      "OPENAI_NEXUS_MODEL",
    ) ||
    "gpt-5-mini";

  const payload: JsonRecord = {
    model,
    store: false,
    input: [
      ...(options.system
        ? [
            {
              role: "system",
              content:
                options.system,
            },
          ]
        : []),
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: options.prompt,
          },
        ],
      },
    ],
  };

  if (options.schema) {
    payload.text = {
      format: {
        type: "json_schema",
        name:
          "nexus_structured_output",
        schema: options.schema,
        strict: true,
      },
    };
  }

  if (options.webSearch) {
    payload.tools = [
      {
        type: "web_search",
      },
    ];
    payload.include = [
      "web_search_call.action.sources",
    ];
  }

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${key}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(
        options.timeoutMs ?? 40_000,
      ),
    },
  );

  const raw = await safeJson(response);

  if (!response.ok) {
    const error =
      raw.error &&
      typeof raw.error === "object"
        ? (raw.error as JsonRecord)
        : null;

    const detail = stringValue(
      error?.message,
    );

    const code = stringValue(
      error?.code,
    );

    if (
      response.status === 429 &&
      (code ===
        "insufficient_quota" ||
        /quota|billing|current plan|exceeded your current quota/i.test(
          detail,
        ))
    ) {
      throw new NexusEdgeError(
        "A cota da OpenAI foi atingida.",
        "AI_QUOTA",
        503,
        "openai",
      );
    }

    throw new NexusEdgeError(
      detail ||
        `OpenAI indisponível (${response.status}).`,
      "AI_UNAVAILABLE",
      502,
      "openai",
    );
  }

  const text = openAIText(raw);

  if (!text) {
    throw new NexusEdgeError(
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
}

export async function generateNexusEdge(
  options: GenerateOptions,
): Promise<GenerateResult> {
  const errors: NexusEdgeError[] =
    [];

  for (const provider of order()) {
    try {
      if (provider === "gemini") {
        if (
          !Deno.env.get(
            "GEMINI_API_KEY",
          )
        ) {
          continue;
        }

        return await gemini(
          options,
        );
      }

      if (
        !Deno.env.get(
          "OPENAI_API_KEY",
        )
      ) {
        continue;
      }

      return await openai(options);
    } catch (error) {
      const normalized =
        error instanceof NexusEdgeError
          ? error
          : new NexusEdgeError(
              error instanceof Error
                ? error.message
                : "Falha ao consultar a inteligência artificial.",
              "AI_UNAVAILABLE",
              502,
              provider,
            );

      errors.push(normalized);

      console.warn(
        `[Nexus] ${provider} falhou`,
        normalized.code,
      );
    }
  }

  if (errors.length === 0) {
    throw new NexusEdgeError(
      "Nenhum provedor de inteligência artificial está configurado. Configure GEMINI_API_KEY para usar o Nexus gratuitamente.",
      "AI_NOT_CONFIGURED",
      503,
    );
  }

  const geminiLimit =
    errors.find(
      (error) =>
        error.provider ===
          "gemini" &&
        error.code ===
          "AI_FREE_TIER_LIMIT",
    );

  if (geminiLimit) {
    throw geminiLimit;
  }

  throw errors[
    errors.length - 1
  ];
}
