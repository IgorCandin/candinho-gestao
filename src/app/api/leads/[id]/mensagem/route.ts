import { NextResponse } from "next/server";
import { getCurrentUserAccess, getLeadDetails } from "@/lib/data";
import { generateNexus, nexusErrorResponse } from "@/lib/nexus-ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    context_summary: { type: ["string", "null"] },
    suggested_action: { type: ["string", "null"] },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    tone: { type: ["string", "null"] },
  },
  required: [
    "message",
    "context_summary",
    "suggested_action",
    "warnings",
    "tone",
  ],
  additionalProperties: false,
};

function clean(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function parseJson(text: string) {
  const normalized = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(normalized) as Record<string, unknown>;
  } catch {
    return { message: normalized };
  }
}

function oneRelation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return (value[0] as Record<string, unknown> | undefined) ?? null;
  }

  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !access.canAccessSupplements ||
    !access.canWriteSupplements
  ) {
    return NextResponse.json(
      { error: "Sem permissão para gerar mensagem de lead." },
      { status: 403 },
    );
  }

  const { id } = await params;

  let body: { additional_context?: string } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const additionalContext =
    clean(body.additional_context)?.slice(0, 3000) ?? null;

  const lead = await getLeadDetails(id);

  if (!lead) {
    return NextResponse.json(
      { error: "Lead não encontrado." },
      { status: 404 },
    );
  }

  const supabase = await createClient();
  const customerId = lead.customer_id;

  const [customerResult, interactionResult, saleResult, flavorResult] =
    await Promise.all([
      customerId
        ? supabase
            .from("customers")
            .select(
              "id,name,city,reference,notes,tags,sensitive_to_caffeine,anxiety_or_insomnia,prohibited_products,approach_preferences,last_contact_at,last_contact_outcome",
            )
            .eq("id", customerId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      customerId
        ? supabase
            .from("customer_interactions")
            .select(
              "interaction_type,status,channel,occurred_at,due_at,outcome,notes,created_at",
            )
            .eq("customer_id", customerId)
            .order("created_at", { ascending: false })
            .limit(8)
        : Promise.resolve({ data: [], error: null }),

      customerId
        ? supabase
            .from("sales")
            .select(
              "id,quoted_at,delivered_at,total_amount,notes,items:sale_items(quantity,product:products(name))",
            )
            .eq("customer_id", customerId)
            .eq("record_type", "sale")
            .neq("general_status", "cancelled")
            .order("quoted_at", { ascending: false })
            .limit(6)
        : Promise.resolve({ data: [], error: null }),

      supabase
        .from("sale_item_flavor_display")
        .select("sale_item_id,flavor_summary")
        .eq("sale_id", id),
    ]);

  if (customerResult.error) {
    return NextResponse.json(
      { error: "Não foi possível carregar o perfil do cliente." },
      { status: 500 },
    );
  }

  if (interactionResult.error) {
    return NextResponse.json(
      { error: "Não foi possível carregar o histórico de contatos." },
      { status: 500 },
    );
  }

  if (saleResult.error) {
    return NextResponse.json(
      { error: "Não foi possível carregar o histórico de compras." },
      { status: 500 },
    );
  }

  if (flavorResult.error) {
    return NextResponse.json(
      { error: "Não foi possível carregar os sabores do lead." },
      { status: 500 },
    );
  }

  const flavorByItem = new Map(
    (flavorResult.data ?? [])
      .filter(
        (row) =>
          typeof row.flavor_summary === "string" &&
          row.flavor_summary,
      )
      .map((row) => [
        String(row.sale_item_id),
        String(row.flavor_summary),
      ]),
  );

  const customer = customerResult.data ?? null;

  const leadContext = {
    id: lead.id,
    customer_name: lead.customer_name,
    status: lead.lead_status ?? lead.general_status,
    lead_at: lead.lead_at,
    city: lead.city,
    reference: lead.reference,
    notes: lead.notes,
    quote: lead.quote_id
      ? {
          number: lead.quote_number,
          status: lead.quote_status,
          total: lead.quote_total_amount,
        }
      : null,
    products: lead.items.map((item) => ({
      name: item.product_name,
      category: item.category,
      brand: item.brand,
      quantity: item.quantity,
      flavor: flavorByItem.get(item.id) ?? null,
    })),
  };

  const recentSales = (saleResult.data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const items = Array.isArray(record.items) ? record.items : [];

    return {
      quoted_at: record.quoted_at,
      delivered_at: record.delivered_at,
      total_amount: record.total_amount,
      notes: record.notes,
      products: items.map((item) => {
        const itemRecord = item as Record<string, unknown>;
        const product = oneRelation(itemRecord.product);

        return {
          name:
            typeof product?.name === "string"
              ? product.name
              : "Produto",
          quantity: Number(itemRecord.quantity ?? 0),
        };
      }),
    };
  });

  const context = {
    lead: leadContext,
    customer: customer
      ? {
          name: customer.name,
          city: customer.city,
          reference: customer.reference,
          notes: customer.notes,
          tags: customer.tags,
          sensitive_to_caffeine: customer.sensitive_to_caffeine,
          anxiety_or_insomnia: customer.anxiety_or_insomnia,
          prohibited_products: customer.prohibited_products,
          approach_preferences: customer.approach_preferences,
          last_contact_at: customer.last_contact_at,
          last_contact_outcome: customer.last_contact_outcome,
        }
      : null,
    recent_sales: recentSales,
    recent_interactions: interactionResult.data ?? [],
    additional_context: additionalContext,
  };

  const prompt = `Você é o Nexus, assistente comercial interno da Candinho Suplementos. Gere UMA mensagem curta, humana e natural para o Igor enviar a um LEAD por WhatsApp ou Instagram.

OBJETIVO:
Retomar ou continuar a conversa de forma prática e consultiva, ajudando a pessoa a avançar naturalmente sem pressão.

REGRAS:
- Escreva em português brasileiro coloquial, natural e curto.
- A mensagem deve soar como o Igor falando de verdade, não como atendimento automatizado.
- Use o nome do cliente se encaixar naturalmente.
- Considere status atual do lead, produtos de interesse, sabor, observações, orçamento e histórico do cliente.
- Se o lead estiver aguardando salário, fornecedor, decisão ou outro momento futuro, respeite isso.
- Se houver orçamento, você pode retomar o assunto sem inventar prazo, desconto ou condição.
- Não invente benefícios, resultados, estoque, preço, promoção, sabor, diagnóstico, sintomas ou preferências.
- Respeite sensibilidade à cafeína, ansiedade/insônia, produtos proibidos e preferências de abordagem presentes no contexto.
- Não faça afirmações médicas.
- Evite emojis de coração.
- Não use texto longo nem linguagem formal.
- Não use frases genéricas de vendedor se houver contexto específico.
- O CONTEXTO ADICIONAL é opcional e deve ser usado apenas quando fizer sentido.
- Retorne somente os campos do schema.

CONTEXTO REAL:
${JSON.stringify(context)}`;

  try {
    const result = await generateNexus({
      system:
        "Você é o Nexus comercial da Candinho Suplementos. Gere mensagens de lead humanas, consultivas, específicas e fiéis ao contexto real.",
      prompt,
      schema: OUTPUT_SCHEMA,
      geminiModel:
        process.env.GEMINI_LEAD_MODEL || "gemini-2.5-flash-lite",
      openAIModel:
        process.env.OPENAI_LEAD_MODEL || "gpt-5-mini",
    });

    const parsed = parseJson(result.text);
    const generatedMessage = clean(parsed.message) ?? result.text.trim();

    return NextResponse.json({
      message: generatedMessage,
      context_summary: clean(parsed.context_summary),
      suggested_action: clean(parsed.suggested_action),
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      tone: clean(parsed.tone),
      provider: result.provider,
      model: result.model,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    const normalized = nexusErrorResponse(error);

    return NextResponse.json(
      {
        error: normalized.error,
        code: normalized.code,
      },
      { status: normalized.status },
    );
  }
}
