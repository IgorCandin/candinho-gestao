import { createBrowserClient } from "@supabase/ssr";

const SALE_DELIVERY_DRAFT_KEY = "candinho:sale:delivery-attribution:v1";
const SALE_DELIVERY_DRAFT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

type RpcErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null;

type RpcResultLike = {
  data: unknown;
  error: RpcErrorLike;
  count?: number | null;
  status?: number;
  statusText?: string;
};

type RpcCaller = (
  functionName: string,
  args?: Record<string, unknown>,
  options?: Record<string, unknown>,
) => Promise<RpcResultLike>;

type SaleDeliveryDraft = {
  partnerId?: string;
  text?: string;
  savedAt?: number;
};

function readSaleDeliveryDraft() {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(SALE_DELIVERY_DRAFT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SaleDeliveryDraft;
    const savedAt = Number(parsed.savedAt ?? 0);

    if (!savedAt || Date.now() - savedAt > SALE_DELIVERY_DRAFT_MAX_AGE_MS) {
      window.sessionStorage.removeItem(SALE_DELIVERY_DRAFT_KEY);
      return null;
    }

    const partnerId = String(parsed.partnerId ?? "").trim();
    const text = String(parsed.text ?? "").trim();

    if (!partnerId && !text) {
      window.sessionStorage.removeItem(SALE_DELIVERY_DRAFT_KEY);
      return null;
    }

    return {
      partnerId: partnerId || null,
      text: partnerId ? null : text || null,
    };
  } catch {
    window.sessionStorage.removeItem(SALE_DELIVERY_DRAFT_KEY);
    return null;
  }
}

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

  /*
   * A tela atual de Nova Venda confirma o orçamento por RPC. Para manter o
   * pacote pequeno e sem reescrever o formulário inteiro, guardamos o campo
   * opcional "Entregue por" em sessionStorage e o aplicamos imediatamente
   * após confirm_budget_quote_v4 retornar o UUID da venda.
   *
   * Se a atualização logística falhar, devolvemos o erro para a própria tela.
   * A confirmação é idempotente, então o usuário pode tentar novamente sem
   * duplicar a venda.
   */
  const originalRpc = client.rpc.bind(client) as unknown as RpcCaller;

  const wrappedRpc: RpcCaller = async (functionName, args, options) => {
    const result = await originalRpc(functionName, args, options);

    if (
      functionName !== "confirm_budget_quote_v4" ||
      result.error ||
      typeof result.data !== "string"
    ) {
      return result;
    }

    const draft = readSaleDeliveryDraft();
    if (!draft) return result;

    const logistics = await originalRpc("sale_update_logistics_v1", {
      p_sale_id: result.data,
      p_location_id: null,
      p_delivered_by_partner_id: draft.partnerId,
      p_delivered_by_text: draft.text,
      p_reason: "Informado no cadastro da venda",
    });

    if (logistics.error) {
      return {
        ...result,
        error: logistics.error,
      };
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SALE_DELIVERY_DRAFT_KEY);
    }

    return result;
  };

  client.rpc = wrappedRpc as unknown as typeof client.rpc;

  return client;
}
