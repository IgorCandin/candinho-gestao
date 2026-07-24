type JsonRecord = Record<string, unknown>;

async function safeJson(response: Response): Promise<JsonRecord> {
  try {
    return (await response.json()) as JsonRecord;
  } catch {
    return {};
  }
}

function apiMessage(raw: JsonRecord) {
  const error =
    raw.error && typeof raw.error === "object"
      ? (raw.error as JsonRecord)
      : null;

  return error && typeof error.message === "string"
    ? error.message
    : null;
}

export async function uploadOpenAIUserFile(
  apiKey: string,
  file: File,
): Promise<string> {
  const form = new FormData();
  form.set("purpose", "user_data");
  form.set(
    "file",
    file,
    file.name || "arquivo.pdf",
  );

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });

  const raw = await safeJson(response);

  if (!response.ok) {
    const detail = apiMessage(raw);

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "A integração do Nexus com a OpenAI precisa ser revisada pelo administrador.",
      );
    }

    throw new Error(
      detail
        ? `Não foi possível preparar o arquivo para o Nexus: ${detail}`
        : `Não foi possível preparar o arquivo para o Nexus (${response.status}).`,
    );
  }

  const fileId =
    typeof raw.id === "string"
      ? raw.id
      : "";

  if (!fileId) {
    throw new Error(
      "A OpenAI não retornou o identificador do arquivo enviado.",
    );
  }

  return fileId;
}

export async function deleteOpenAIFile(
  apiKey: string,
  fileId: string | null,
) {
  if (!fileId) return;

  try {
    await fetch(
      `https://api.openai.com/v1/files/${encodeURIComponent(fileId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch (error) {
    console.warn(
      "Não foi possível remover o arquivo temporário da OpenAI:",
      error,
    );
  }
}
