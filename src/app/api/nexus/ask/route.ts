import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  getCustomerNetworkContext,
  getNexusBrief,
} from "@/lib/nexus-operating-context";
import {
  generateNexus,
  nexusErrorResponse,
  type JsonRecord,
} from "@/lib/nexus-ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type HistoryItem = {
  role?: unknown;
  content?: unknown;
};

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    next_actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          href: { type: ["string", "null"] },
          reason: { type: ["string", "null"] },
        },
        required: ["label", "href", "reason"],
        additionalProperties: false,
      },
    },
    assumptions: {
      type: "array",
      items: { type: "string" },
    },
    confidence: { type: "string" },
  },
  required: ["message", "next_actions", "assumptions", "confidence"],
  additionalProperties: false,
};

function parseJson(text: string) {
  const normalized = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(normalized) as Record<string, unknown>;
  } catch {
    return {
      message: normalized,
      next_actions: [],
      assumptions: [],
      confidence: "média",
    };
  }
}

function safeHref(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) return null;

  const allowed = [
    "/suplementos",
    "/vendas",
    "/orcamentos",
    "/leads",
    "/clientes",
    "/agenda",
    "/pos-venda",
    "/estoque",
    "/produtos",
    "/pedidos-fornecedor",
    "/pedidos-pendentes",
    "/parceiros",
    "/suplementos/painel",
  ];

  return allowed.some((prefix) => value === prefix || value.startsWith(`${prefix}/`) || value.startsWith(`${prefix}?`))
    ? value.slice(0, 400)
    : null;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();

    if (!(access.active && (access.role === "admin" || access.canWriteSupplements))) {
      return NextResponse.json(
        { error: "Sem permissão para usar o Nexus operacional." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const message =
      typeof body.message === "string" ? body.message.trim().slice(0, 7000) : "";
    const customerId =
      typeof body.customer_id === "string" && body.customer_id
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
    const briefPromise = getNexusBrief({ refresh: true, signalLimit: 35 });

    const [
      relationshipGraphResult,
      recentSalesResult,
      leadsResult,
      stockResult,
      incomingResult,
      supplierResult,
      auditResult,
      customerResult,
      interactionResult,
      customerSalesResult,
      customerLeadResult,
    ] = await Promise.all([
      supabase.rpc("get_nexus_relationship_graph_v1", { p_limit: 300 }),
      supabase
        .from("sales_history")
        .select(
          "id,customer_id,customer_name,business_date,total_amount,total_profit,product_summary,payment_status,delivery_status,partner_name",
        )
        .order("business_date", { ascending: false })
        .limit(30),
      supabase
        .from("leads_history")
        .select(
          "id,customer_id,customer_name,lead_date,lead_status,general_status,city,notes,product_summary",
        )
        .order("lead_date", { ascending: false })
        .limit(40),
      supabase
        .from("sale_stock_availability")
        .select(
          "product_id,product_name,category,brand,cost_price,sale_price,available_quantity,physical_quantity,reserved_quantity",
        )
        .limit(700),
      supabase
        .from("product_incoming_stock")
        .select("product_id,incoming_quantity,awaiting_sales_quantity")
        .limit(300),
      supabase
        .from("supplier_order_summary")
        .select(
          "id,supplier_name,ordered_on,status,pending_units,order_total,product_summary,waiting_sales_count",
        )
        .order("ordered_on", { ascending: false })
        .limit(25),
      supabase
        .from("audit_events")
        .select("entity_type,entity_id,action,details,created_at")
        .order("created_at", { ascending: false })
        .limit(40),
      customerId
        ? supabase
            .from("customers")
            .select(
              "id,name,phone,city,reference,email,notes,crm_status,next_contact_at,last_contact_at,last_contact_outcome,tags,sensitive_to_caffeine,anxiety_or_insomnia,prohibited_products,approach_preferences",
            )
            .eq("id", customerId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      customerId
        ? supabase
            .from("customer_interactions")
            .select(
              "interaction_type,status,channel,occurred_at,due_at,completed_at,outcome,notes",
            )
            .eq("customer_id", customerId)
            .order("created_at", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [], error: null }),
      customerId
        ? supabase
            .from("sales_history")
            .select(
              "id,business_date,total_amount,total_profit,product_summary,payment_status,delivery_status,partner_name",
            )
            .eq("customer_id", customerId)
            .order("business_date", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [], error: null }),
      customerId
        ? supabase
            .from("leads_history")
            .select("id,lead_date,lead_status,notes,product_summary")
            .eq("customer_id", customerId)
            .order("lead_date", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const brief = await briefPromise;

    const incomingByProduct = new Map<string, { incoming: number; waiting: number }>();
    for (const row of incomingResult.data ?? []) {
      incomingByProduct.set(String(row.product_id), {
        incoming: numberValue(row.incoming_quantity),
        waiting: numberValue(row.awaiting_sales_quantity),
      });
    }

    const stockByProduct = new Map<
      string,
      {
        product_id: string;
        product_name: string;
        category: string | null;
        brand: string | null;
        cost_price: number;
        sale_price: number;
        available: number;
        physical: number;
        reserved: number;
        incoming: number;
        awaiting_sales: number;
      }
    >();

    for (const row of stockResult.data ?? []) {
      const id = String(row.product_id);
      const current = stockByProduct.get(id) ?? {
        product_id: id,
        product_name: String(row.product_name ?? "Produto"),
        category: typeof row.category === "string" ? row.category : null,
        brand: typeof row.brand === "string" ? row.brand : null,
        cost_price: numberValue(row.cost_price),
        sale_price: numberValue(row.sale_price),
        available: 0,
        physical: 0,
        reserved: 0,
        incoming: 0,
        awaiting_sales: 0,
      };

      current.available += numberValue(row.available_quantity);
      current.physical += numberValue(row.physical_quantity);
      current.reserved += numberValue(row.reserved_quantity);
      stockByProduct.set(id, current);
    }

    for (const [id, incoming] of incomingByProduct) {
      const current = stockByProduct.get(id);
      if (current) {
        current.incoming = incoming.incoming;
        current.awaiting_sales = incoming.waiting;
      }
    }

    const selectedNetwork = customerId
      ? await getCustomerNetworkContext(customerId).catch(() => null)
      : null;

    const sanitizedHistory = history
      .map((item) => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content:
          typeof item.content === "string" ? item.content.slice(0, 3000) : "",
      }))
      .filter((item) => item.content);

    const operatingContext = {
      generated_at: brief.generatedAt,
      priorities: brief.signals,
      counts: brief.counts,
      learned_usage: brief.usage,
      common_transitions: brief.transitions,
      relationship_graph: relationshipGraphResult.error
        ? { relationships: [], partner_affiliations: [] }
        : relationshipGraphResult.data,
      commercial_summary: brief.commercial,
      agenda_summary: brief.agenda,
      post_sale_summary: brief.postSale,
      recent_sales: recentSalesResult.data ?? [],
      open_or_recent_leads: leadsResult.data ?? [],
      stock: [...stockByProduct.values()].sort(
        (a, b) => b.available - a.available,
      ),
      supplier_orders: supplierResult.data ?? [],
      recent_business_events: auditResult.data ?? [],
      selected_customer: customerResult.data ?? null,
      selected_customer_network: selectedNetwork,
      selected_customer_interactions: interactionResult.data ?? [],
      selected_customer_sales: customerSalesResult.data ?? [],
      selected_customer_leads: customerLeadResult.data ?? [],
      conversation_history: sanitizedHistory,
    };

    const prompt = `Você é o Nexus, a camada de inteligência operacional da Candinho Suplementos.
Você não é apenas um chatbot de produtos: você conecta comercial, CRM, leads, cobranças, entregas, pós-venda, estoque, compras, parceiros e o padrão de navegação do usuário.

OBJETIVO:
Responder a pergunta atual usando apenas os fatos do contexto do ERP, reduzir trabalho mental e apontar a próxima ação mais útil.

REGRAS IMPORTANTES:
- Responda em português brasileiro, claro e prático.
- Não invente venda, cliente, relação familiar, estoque, preço, pagamento, data, promoção ou comportamento.
- Relações pessoais só existem quando estão explicitamente cadastradas em relationship_graph ou selected_customer_network. Nunca deduza casamento, parentesco, amizade ou vínculo com parceiro por nome/telefone/comportamento.
- relationship_graph permite responder sobre redes explicitamente cadastradas (por exemplo alunos de um parceiro, indicações e relações familiares). Se o vínculo não estiver ali, trate como desconhecido.
- A telemetria de navegação significa apenas frequência de uso de rotas; não trate isso como intenção pessoal nem como verdade sobre preferência.
- Diferencie fato, padrão e hipótese. Quando faltar informação, diga.
- Priorize o que está vencido/urgente, depois oportunidade comercial e depois melhoria operacional.
- Não execute venda, cobrança, exclusão, baixa de estoque, envio de mensagem ou alteração financeira. Você pode sugerir e apontar a tela correta.
- Pode propor mensagens internas ou comerciais, mas nunca exponha para um cliente dados privados de outro cliente relacionado.
- Respeite sensibilidades/restrições de saúde cadastradas. Não faça diagnóstico ou prescrição.
- Se a pergunta pedir comparação de mês, margem ou resultado, use os números reais fornecidos.
- Se a pergunta for "o que faço agora?", entregue uma sequência curta de execução.
- Se a pergunta for sobre rotina de outra pessoa assumir a operação, explique a partir dos sinais e do fluxo, não da memória do Igor.
- Em next_actions, use no máximo 4 ações e somente URLs coerentes com as telas existentes.

CONTEXTO DO ERP:
${JSON.stringify(operatingContext)}

PERGUNTA ATUAL:
${message}`;

    const result = await generateNexus({
      system:
        "Você é o Nexus Operacional da Candinho Suplementos. Use somente dados reais fornecidos, conecte módulos e seja conservador com ações e saúde.",
      prompt,
      schema: OUTPUT_SCHEMA,
      geminiModel:
        process.env.GEMINI_NEXUS_OPERATING_MODEL || "gemini-2.5-flash-lite",
      openAIModel:
        process.env.OPENAI_NEXUS_OPERATING_MODEL || "gpt-5-mini",
      timeoutMs: 50_000,
    });

    const parsed = parseJson(result.text);
    const actions = Array.isArray(parsed.next_actions)
      ? parsed.next_actions
          .map((value: unknown) => {
            const row =
              value && typeof value === "object"
                ? (value as Record<string, unknown>)
                : {};
            return {
              label:
                typeof row.label === "string" ? row.label.slice(0, 120) : "Abrir",
              href: safeHref(row.href),
              reason:
                typeof row.reason === "string" ? row.reason.slice(0, 300) : null,
            };
          })
          .slice(0, 4)
      : [];

    return NextResponse.json({
      message:
        typeof parsed.message === "string" ? parsed.message : result.text.trim(),
      next_actions: actions,
      assumptions: Array.isArray(parsed.assumptions)
        ? parsed.assumptions
            .filter((value): value is string => typeof value === "string")
            .slice(0, 6)
        : [],
      confidence:
        typeof parsed.confidence === "string" ? parsed.confidence : "média",
      provider: result.provider,
      model: result.model,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    const friendly = nexusErrorResponse(error);
    return NextResponse.json(
      { error: friendly.error, code: friendly.code },
      { status: friendly.status },
    );
  }
}
