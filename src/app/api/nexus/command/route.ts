import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  nexusCommandRoutesForAccess,
  type NexusCommandRoute,
} from "@/lib/nexus-command-catalog";
import {
  generateNexus,
  nexusErrorResponse,
  type JsonRecord,
} from "@/lib/nexus-ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 50;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: ["navigate", "create_task", "answer"],
    },
    message: { type: "string" },
    href: { type: ["string", "null"] },
    task: {
      type: "object",
      properties: {
        title: { type: ["string", "null"] },
        due_at: { type: ["string", "null"] },
        priority: { type: ["string", "null"] },
        operation_scope: { type: ["string", "null"] },
        notes: { type: ["string", "null"] },
      },
      required: [
        "title",
        "due_at",
        "priority",
        "operation_scope",
        "notes",
      ],
      additionalProperties: false,
    },
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
    confidence: { type: "string" },
  },
  required: [
    "intent",
    "message",
    "href",
    "task",
    "next_actions",
    "confidence",
  ],
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
      intent: "answer",
      message: normalized,
      href: null,
      task: {
        title: null,
        due_at: null,
        priority: null,
        operation_scope: null,
        notes: null,
      },
      next_actions: [],
      confidence: "média",
    };
  }
}

function safeHref(
  value: unknown,
  routes: NexusCommandRoute[],
) {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  const exact = routes.some((route) => route.href === value);
  return exact ? value.slice(0, 400) : null;
}

function taskScopeAllowed(
  scope: string,
  access: Awaited<ReturnType<typeof getCurrentUserAccess>>,
) {
  if (access.role === "admin") {
    return ["company", "supplements", "fitness", "marketing"].includes(scope);
  }
  if (scope === "supplements") return access.canWriteSupplements;
  if (scope === "fitness") return access.canWriteFitness;
  if (scope === "marketing") return access.canWriteMarketing;
  if (scope === "company") return access.canManageUsers;
  return false;
}

function cleanTask(
  value: unknown,
  access: Awaited<ReturnType<typeof getCurrentUserAccess>>,
) {
  const row =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const title =
    typeof row.title === "string" && row.title.trim()
      ? row.title.trim().slice(0, 180)
      : null;

  const dueRaw =
    typeof row.due_at === "string" && row.due_at.trim()
      ? row.due_at.trim()
      : null;

  const dueDate = dueRaw ? new Date(dueRaw) : null;
  const dueAt =
    dueDate && Number.isFinite(dueDate.getTime())
      ? dueDate.toISOString()
      : null;

  const priority =
    row.priority === "urgent" ||
    row.priority === "attention" ||
    row.priority === "normal"
      ? row.priority
      : "normal";

  const scope =
    typeof row.operation_scope === "string"
      ? row.operation_scope
      : "company";

  const operationScope = taskScopeAllowed(scope, access)
    ? (scope as "company" | "supplements" | "fitness" | "marketing")
    : null;

  const notes =
    typeof row.notes === "string" && row.notes.trim()
      ? row.notes.trim().slice(0, 700)
      : null;

  return {
    title,
    due_at: dueAt,
    priority,
    operation_scope: operationScope,
    notes,
  };
}

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();

    if (!access.active || access.role === "partner") {
      return NextResponse.json({ error: "Sem acesso ao comando." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const message =
      typeof body.message === "string"
        ? body.message.trim().slice(0, 1400)
        : "";
    const currentRoute =
      typeof body.current_route === "string"
        ? body.current_route.slice(0, 300)
        : "/dashboard";

    if (!message) {
      return NextResponse.json(
        { error: "Escreva um comando para o Nexus." },
        { status: 400 },
      );
    }

    const routes = nexusCommandRoutesForAccess(access);
    const supabase = await createClient();
    const { data: queueData } = await supabase.rpc("nexus_unified_queue_v1", {
      p_limit: 12,
    });

    const nowBrazil = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date());

    const prompt = `Você é o Nexus Command, interpretador de comandos rápidos do ERP Candinho.

DATA/HORA LOCAL:
${nowBrazil}
Fuso: America/Sao_Paulo (-03:00 quando aplicável).

ROTA ATUAL:
${currentRoute}

ROTAS QUE ESTE USUÁRIO PODE ABRIR:
${JSON.stringify(routes)}

FILA OPERACIONAL ATUAL:
${JSON.stringify(queueData ?? {})}

COMANDO:
${message}

Escolha apenas um intent:
1. navigate:
- Quando a pessoa quer abrir/ir/ver uma tela.
- href PRECISA ser exatamente um href da lista de rotas.
- Não invente URL.

2. create_task:
- Somente quando a pessoa explicitamente quer criar/agendar uma TAREFA operacional.
- Não use create_task para venda, pagamento, estoque, cobrança, fatura, empréstimo ou baixa.
- task.title precisa ser objetivo.
- task.due_at deve ser ISO 8601 completo.
- Interprete "hoje", "amanhã", dia da semana e horários usando a data local fornecida.
- Se a pessoa não informou data suficiente para saber o prazo, NÃO invente: use intent answer e peça a data.
- operation_scope permitido: company, supplements, fitness, marketing.
- Nunca crie tarefa Bank por este comando; para Bank, direcione à tela.

3. answer:
- Para "o que faço agora?", dúvida operacional curta ou quando faltam dados.
- Use a fila operacional para priorizar.
- Máximo 5 linhas na mensagem.
- Se a pergunta exigir CRM detalhado, histórico profundo ou recomendação complexa, direcione para /suplementos/nexus quando disponível.

SEGURANÇA:
- Você não executa a ação.
- Você não marca pagamento, não baixa estoque, não cria venda e não exclui registro.
- Tarefa ainda passará por preview humano.
- Diferencie obrigação urgente de simples informação.
- Não invente fatos.

Retorne JSON conforme o schema.`;

    const result = await generateNexus({
      system:
        "Você é o Nexus Command da Candinho Company. Interprete comandos curtos com conservadorismo e nunca execute ações críticas.",
      prompt,
      schema: OUTPUT_SCHEMA,
      geminiModel:
        process.env.GEMINI_NEXUS_COMMAND_MODEL ||
        process.env.GEMINI_NEXUS_OPERATING_MODEL ||
        "gemini-2.5-flash-lite",
      openAIModel:
        process.env.OPENAI_NEXUS_COMMAND_MODEL ||
        process.env.OPENAI_NEXUS_OPERATING_MODEL ||
        "gpt-5-mini",
      timeoutMs: 42_000,
    });

    const parsed = parseJson(result.text);
    const rawIntent =
      parsed.intent === "navigate" ||
      parsed.intent === "create_task" ||
      parsed.intent === "answer"
        ? parsed.intent
        : "answer";

    const href = safeHref(parsed.href, routes);
    const task = cleanTask(parsed.task, access);

    let intent = rawIntent;
    let responseMessage =
      typeof parsed.message === "string"
        ? parsed.message.slice(0, 1800)
        : "Comando interpretado.";

    if (intent === "navigate" && !href) {
      intent = "answer";
      responseMessage =
        "Não encontrei uma rota segura para esse comando. Tente escrever o nome da tela ou abra a Fila Única.";
    }

    if (
      intent === "create_task" &&
      (!task.title || !task.due_at || !task.operation_scope)
    ) {
      intent = "answer";
      responseMessage =
        "Consigo criar essa tarefa, mas preciso de um prazo claro e de uma operação válida antes de preparar o preview.";
    }

    const actions = Array.isArray(parsed.next_actions)
      ? parsed.next_actions
          .map((value: unknown) => {
            const row =
              value && typeof value === "object"
                ? (value as Record<string, unknown>)
                : {};
            return {
              label:
                typeof row.label === "string"
                  ? row.label.slice(0, 120)
                  : "Abrir",
              href: safeHref(row.href, routes),
              reason:
                typeof row.reason === "string"
                  ? row.reason.slice(0, 300)
                  : null,
            };
          })
          .filter((item) => item.href)
          .slice(0, 4)
      : [];

    return NextResponse.json({
      intent,
      message: responseMessage,
      href,
      task,
      next_actions: actions,
      confidence:
        typeof parsed.confidence === "string"
          ? parsed.confidence.slice(0, 60)
          : "média",
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    const friendly = nexusErrorResponse(error);
    return NextResponse.json(
      { error: friendly.error, code: friendly.code },
      { status: friendly.status },
    );
  }
}
