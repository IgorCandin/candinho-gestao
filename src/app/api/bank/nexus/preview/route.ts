import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { getBankNexusContext } from "@/lib/bank-nexus-context";
import {
  BANK_NEXUS_ACTION_TYPES,
  type BankNexusPlan,
} from "@/lib/bank-nexus-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const planSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    summary: { type: "string" },
    can_apply: { type: "boolean" },
    actions: {
      type: "array",
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: {
            type: "string",
            enum: BANK_NEXUS_ACTION_TYPES,
          },
          entity_id: { type: "string" },
          entity_name: { type: "string" },
          amount: {
            anyOf: [{ type: "number" }, { type: "null" }],
          },
          reference_month: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          date: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          label: { type: "string" },
          before: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          after: { type: "string" },
          reason: { type: "string" },
          requires_attention: { type: "boolean" },
        },
        required: [
          "type",
          "entity_id",
          "entity_name",
          "amount",
          "reference_month",
          "date",
          "label",
          "before",
          "after",
          "reason",
          "requires_attention",
        ],
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "reply",
    "summary",
    "can_apply",
    "actions",
    "warnings",
  ],
} as const;

function outputText(payload: Record<string, unknown>) {
  const output = Array.isArray(payload.output) ? payload.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray(
      (item as Record<string, unknown>).content,
    )
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const row = part as Record<string, unknown>;

      if (
        row.type === "output_text" &&
        typeof row.text === "string"
      ) {
        return row.text;
      }
    }
  }

  return null;
}

function validatePlan(value: unknown): value is BankNexusPlan {
  if (!value || typeof value !== "object") return false;

  const plan = value as Record<string, unknown>;

  return (
    typeof plan.reply === "string" &&
    typeof plan.summary === "string" &&
    typeof plan.can_apply === "boolean" &&
    Array.isArray(plan.actions) &&
    Array.isArray(plan.warnings)
  );
}

export async function POST(request: NextRequest) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    (!access.canAccessBank && access.role !== "admin")
  ) {
    return NextResponse.json(
      { error: "Sem acesso ao Candinho Bank." },
      { status: 403 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Nexus Bank ainda não possui OPENAI_API_KEY configurada no servidor.",
        code: "OPENAI_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        message?: unknown;
        history?: unknown;
      }
    | null;

  const message =
    typeof body?.message === "string"
      ? body.message.trim().slice(0, 8000)
      : "";

  if (!message) {
    return NextResponse.json(
      { error: "Escreva o que você quer atualizar." },
      { status: 400 },
    );
  }

  const history = Array.isArray(body?.history)
    ? body!.history
        .filter(
          (item): item is { role: string; text: string } =>
            Boolean(
              item &&
                typeof item === "object" &&
                typeof (item as Record<string, unknown>).role ===
                  "string" &&
                typeof (item as Record<string, unknown>).text ===
                  "string",
            ),
        )
        .slice(-8)
        .map((item) => ({
          role:
            item.role === "assistant"
              ? "assistant"
              : "user",
          text: item.text.slice(0, 2000),
        }))
    : [];

  const context = await getBankNexusContext();

  const developerInstruction = `
Você é o Nexus Bank, o interpretador financeiro da Candinho Company.

MISSÃO:
Transformar a mensagem do usuário em um PLANO DE ALTERAÇÕES, nunca executar nada.
O usuário sempre verá uma prévia e precisará clicar em Confirmar tudo.

SEGURANÇA:
1. Use SOMENTE entity_id que exista no CONTEXTO DO BANK enviado nesta requisição.
2. Nunca invente IDs, cartões, contas, dívidas, salários ou mensalidades.
3. Se houver ambiguidade entre duas entidades, NÃO crie ação. Explique em warnings.
4. Não faça cálculos escondidos nem suponha um valor que não foi dito e não exista claramente no contexto.
5. Notinhas ficam fora da projeção. Frases como "deixa a Graça pra depois" normalmente não exigem ação.
6. O chat é para ORGANIZAR o mês. Pagamentos de empréstimo devem continuar no botão Paguei do site.
7. A única ação em empréstimos permitida pelo chat é postpone_debt quando o usuário disser para adiar/pular/empurrar a parcela.
8. Um adiamento significa mover a próxima parcela exatamente +1 mês.
9. Valor de fatura de cartão é o TOTAL da fatura daquele mês.
10. Se o usuário disser "tudo igual ao mês passado", copie as faturas do previous_month usando invoice_history e crie set_card_invoice para o current_month, exceto mudanças explicitamente informadas.
11. "Recebi salário/vale" => mark_income_received.
12. "Ainda não recebi" => mark_income_pending. Se já estiver pendente, pode omitir a ação e explicar.
13. "O salário passou a ser X / daqui pra frente X" => set_income_default_amount.
14. Apenas mencionar "salário X" não significa alterar o valor padrão, a menos que a intenção permanente esteja clara.
15. "Mensalidade/aluguel/psicóloga agora é X" => set_subscription_amount.
16. "Saldo da conta/carteira é X" => set_account_balance.
17. "Nubank/BB/Inter deste mês é X" => set_card_invoice.
18. reference_month deve ser YYYY-MM-01. date deve ser YYYY-MM-DD.
19. Use português brasileiro curto e prático.
20. before/after devem ser textos amigáveis em R$ quando houver valor.
21. can_apply só pode ser true quando não houver ambiguidade que impeça as ações.
22. Se não houver ação real, actions=[] e can_apply=false.

TIPOS PERMITIDOS:
- set_card_invoice
- set_account_balance
- mark_income_received
- mark_income_pending
- postpone_debt
- set_subscription_amount
- set_income_default_amount
`.trim();

  const input = [
    {
      role: "developer",
      content: [
        {
          type: "input_text",
          text: developerInstruction,
        },
      ],
    },
    ...history.map((item) => ({
      role: item.role,
      content: [
        {
          type: "input_text",
          text: item.text,
        },
      ],
    })),
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: `CONTEXTO DO BANK:\n${JSON.stringify(
            context,
          )}\n\nMENSAGEM DE AGORA:\n${message}`,
        },
      ],
    },
  ];

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_BANK_MODEL || "gpt-5",
        store: false,
        input,
        max_output_tokens: 2200,
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "candinho_bank_plan",
            description:
              "Plano seguro de alterações do Candinho Bank, sempre sujeito à confirmação humana.",
            strict: true,
            schema: planSchema,
          },
        },
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!response.ok || !payload) {
    console.error("Nexus Bank OpenAI error", {
      status: response.status,
      payload,
    });

    return NextResponse.json(
      {
        error:
          "A IA não conseguiu interpretar a atualização agora. Tente novamente em alguns segundos.",
      },
      { status: 502 },
    );
  }

  const text = outputText(payload);

  if (!text) {
    return NextResponse.json(
      { error: "A IA não retornou uma prévia utilizável." },
      { status: 502 },
    );
  }

  let plan: unknown;

  try {
    plan = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "A prévia da IA veio em formato inválido." },
      { status: 502 },
    );
  }

  if (!validatePlan(plan)) {
    return NextResponse.json(
      { error: "A prévia da IA não passou pela validação." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    message,
    plan,
  });
}
