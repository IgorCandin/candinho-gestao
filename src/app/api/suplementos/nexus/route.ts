import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  generateNexus,
  nexusErrorResponse,
  type JsonRecord,
} from "@/lib/nexus-ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type HistoryItem = {
  role?: unknown;
  content?: unknown;
};

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();

    if (
      !(
        access.role === "admin" ||
        access.canWriteSupplements
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para usar o Nexus da operação de Suplementos.",
        },
        { status: 403 },
      );
    }

    const body = (await request
      .json()
      .catch(() => ({}))) as JsonRecord;

    const message =
      typeof body.message === "string"
        ? body.message.trim().slice(0, 6000)
        : "";

    const customerId =
      typeof body.customer_id === "string" &&
      body.customer_id
        ? body.customer_id
        : null;

    const history = Array.isArray(body.history)
      ? (body.history as HistoryItem[]).slice(-8)
      : [];

    if (!message) {
      return NextResponse.json(
        { error: "Escreva uma pergunta para o Nexus." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const [productsResult, stockResult] =
      await Promise.all([
        supabase
          .from("products")
          .select(
            "id,name,sku,category,brand,description,sale_price,restricted,objective,ideal_profile,information,keywords,level,flavor_tracking_enabled",
          )
          .eq("active", true)
          .order("name"),
        supabase
          .from("stock_balances")
          .select("product_id,quantity"),
      ]);

    if (productsResult.error) {
      throw new Error(productsResult.error.message);
    }

    if (stockResult.error) {
      throw new Error(stockResult.error.message);
    }

    const stockByProduct = new Map<string, number>();

    for (const row of stockResult.data ?? []) {
      const id = String(row.product_id);
      stockByProduct.set(
        id,
        (stockByProduct.get(id) ?? 0) +
          Number(row.quantity ?? 0),
      );
    }

    const catalog = (productsResult.data ?? []).map(
      (product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        brand: product.brand,
        sale_price: product.sale_price,
        restricted: product.restricted,
        objective: product.objective,
        ideal_profile: product.ideal_profile,
        information: product.information,
        keywords: product.keywords,
        level: product.level,
        available_units:
          stockByProduct.get(String(product.id)) ?? 0,
      }),
    );

    const productName = new Map(
      catalog.map((product) => [
        String(product.id),
        String(product.name),
      ]),
    );

    let customer: JsonRecord | null = null;
    let recentPurchases: Array<
      Record<string, unknown>
    > = [];

    if (customerId) {
      const customerResult = await supabase
        .from("customers")
        .select(
          "id,name,city,notes,sensitive_to_caffeine,anxiety_or_insomnia,prohibited_products,approach_preferences,crm_status,tags",
        )
        .eq("id", customerId)
        .maybeSingle();

      if (customerResult.error) {
        throw new Error(customerResult.error.message);
      }

      customer =
        customerResult.data as JsonRecord | null;

      const salesResult = await supabase
        .from("sales")
        .select(
          "id,quoted_at,delivered_at,total_amount",
        )
        .eq("customer_id", customerId)
        .eq("record_type", "sale")
        .neq("general_status", "cancelled")
        .order("quoted_at", { ascending: false })
        .limit(10);

      if (salesResult.error) {
        throw new Error(salesResult.error.message);
      }

      const saleIds = (salesResult.data ?? []).map(
        (sale) => String(sale.id),
      );

      if (saleIds.length > 0) {
        const itemsResult = await supabase
          .from("sale_items")
          .select(
            "sale_id,product_id,quantity",
          )
          .in("sale_id", saleIds);

        if (!itemsResult.error) {
          recentPurchases = (
            salesResult.data ?? []
          ).map((sale) => ({
            date:
              sale.delivered_at ??
              sale.quoted_at,
            total_amount: sale.total_amount,
            products: (
              itemsResult.data ?? []
            )
              .filter(
                (item) =>
                  String(item.sale_id) ===
                  String(sale.id),
              )
              .map((item) => ({
                name:
                  productName.get(
                    String(item.product_id),
                  ) ?? "Produto",
                quantity: item.quantity,
              })),
          }));
        }
      }
    }

    const sanitizedHistory = history
      .map((item) => ({
        role:
          item.role === "assistant"
            ? "assistant"
            : "user",
        content:
          typeof item.content === "string"
            ? item.content.slice(0, 3000)
            : "",
      }))
      .filter((item) => item.content);

    const prompt = [
      "Você é o Nexus, assistente interno da Candinho Suplementos. Ajude Igor a decidir quais produtos REAIS do catálogo fazem sentido para uma cliente.",
      "Responda em português do Brasil, de forma prática e humana.",
      "REGRAS:",
      "- Recomende somente produtos que existam no CATÁLOGO REAL fornecido.",
      "- Priorize produtos com available_units > 0. Se citar um sem estoque, diga explicitamente que está sem estoque.",
      "- Respeite sensibilidade à cafeína, ansiedade/insônia, produtos proibidos e observações do CRM.",
      "- Não invente composição, dose, contraindicação, benefício, resultado ou característica que não esteja no contexto.",
      "- Não faça diagnóstico médico nem prometa cura, emagrecimento ou ganho de massa.",
      "- Em gestação/amamentação, doença renal, uso de medicamentos, menores ou situações clínicas relevantes, sinalize que a decisão deve ser validada por profissional de saúde quando necessário.",
      "- Quando faltar informação essencial, faça 1 a 3 perguntas objetivas antes de recomendar.",
      "- Quando houver base suficiente, entregue de 1 a 3 opções em ordem de adequação, explicando o motivo e qualquer alerta.",
      "- Não crie venda, não altere estoque e não trate a resposta como prescrição.",
      "",
      `CLIENTE SELECIONADA: ${
        customer
          ? JSON.stringify(customer)
          : "Nenhuma. Trate como consulta geral."
      }`,
      `COMPRAS RECENTES: ${JSON.stringify(
        recentPurchases,
      )}`,
      `CATÁLOGO REAL E ESTOQUE: ${JSON.stringify(
        catalog,
      )}`,
      `HISTÓRICO DA CONVERSA: ${JSON.stringify(
        sanitizedHistory,
      )}`,
      `PERGUNTA ATUAL DO IGOR: ${message}`,
    ].join("\n");

    const result = await generateNexus({
      system:
        "Você é o Nexus da Candinho Suplementos. Use somente o contexto fornecido, seja conservador com saúde e nunca invente dados de produto.",
      prompt,
      geminiModel:
        process.env
          .GEMINI_SUPPLEMENTS_NEXUS_MODEL ||
        "gemini-2.5-flash-lite",
      openAIModel:
        process.env
          .OPENAI_SUPPLEMENTS_NEXUS_MODEL ||
        "gpt-5-mini",
      timeoutMs: 45_000,
    });

    return NextResponse.json({
      message: result.text,
      model: result.model,
      provider: result.provider,
    });
  } catch (error) {
    const friendly = nexusErrorResponse(error);

    return NextResponse.json(
      {
        error: friendly.error,
        code: friendly.code,
      },
      { status: friendly.status },
    );
  }
}
