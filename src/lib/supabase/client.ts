import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase ainda não foi configurado.");
  }

  const client = createBrowserClient(url, key);
  const originalInvoke = client.functions.invoke.bind(client.functions);

  client.functions.invoke = (async (
    functionName: string,
    options?: { body?: unknown },
  ) => {
    if (functionName !== "product-nexus-enrich") {
      return originalInvoke(
        functionName,
        options as Parameters<typeof originalInvoke>[1],
      );
    }

    try {
      let imageUrl: string | null = null;

      if (typeof window !== "undefined") {
        const match = window.location.pathname.match(
          /^\/produtos\/([^/]+)\/editar\/?$/,
        );

        if (match?.[1]) {
          const productId = decodeURIComponent(match[1]);

          const { data } = await client
            .from("product_management_details")
            .select("image_url")
            .eq("id", productId)
            .maybeSingle();

          imageUrl =
            data && typeof data.image_url === "string"
              ? data.image_url
              : null;
        }
      }

      const body =
        options?.body &&
        typeof options.body === "object" &&
        !Array.isArray(options.body)
          ? (options.body as Record<string, unknown>)
          : {};

      const response = await fetch("/api/produtos/completar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...body,
          image_url: imageUrl,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        return {
          data: null,
          error: new Error(
            typeof payload.error === "string"
              ? payload.error
              : "Não foi possível completar as informações do produto.",
          ),
        };
      }

      return {
        data: payload,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error("Não foi possível completar as informações do produto."),
      };
    }
  }) as typeof client.functions.invoke;

  return client;
}
