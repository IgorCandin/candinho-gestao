type PublicRpcError = {
  message: string;
  code?: string | null;
};

export type PublicRpcResult<T> = {
  data: T | null;
  error: PublicRpcError | null;
};

function environment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase público ainda não foi configurado.");
  }

  return { url, key };
}

function queryString(args: Record<string, unknown>) {
  const params = new URLSearchParams();

  for (const [key, raw] of Object.entries(args)) {
    if (raw === undefined) continue;

    if (raw === null) {
      params.set(key, "null");
      continue;
    }

    if (typeof raw === "boolean") {
      params.set(key, raw ? "true" : "false");
      continue;
    }

    params.set(key, String(raw));
  }

  return params.toString();
}

export async function publicSupabaseRpc<T>(
  functionName: string,
  args: Record<string, unknown> = {},
  revalidateSeconds = 10,
): Promise<PublicRpcResult<T>> {
  const { url, key } = environment();
  const query = queryString(args);
  const endpoint =
    `${url}/rest/v1/rpc/${encodeURIComponent(functionName)}` +
    (query ? `?${query}` : "");

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      next: {
        revalidate: Math.max(1, revalidateSeconds),
        tags: [
          "public-catalog-v45-36",
          `public-rpc:${functionName}`,
        ],
      },
    });

    const payload = (await response.json().catch(() => null)) as
      | T
      | {
          message?: string;
          code?: string;
        }
      | null;

    if (!response.ok) {
      const source =
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload)
          ? (payload as { message?: string; code?: string })
          : null;

      return {
        data: null,
        error: {
          message:
            source?.message ??
            `Falha ao consultar ${functionName}.`,
          code: source?.code ?? null,
        },
      };
    }

    return {
      data: payload as T,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message:
          error instanceof Error
            ? error.message
            : `Falha ao consultar ${functionName}.`,
      },
    };
  }
}
