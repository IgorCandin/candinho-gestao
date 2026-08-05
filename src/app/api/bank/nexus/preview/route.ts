import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { getBankNexusContext } from "@/lib/bank-nexus-context";
import {
  BANK_NEXUS_ACTION_TYPES,
  type BankNexusPlan,
} from "@/lib/bank-nexus-types";
import {
  generateNexus,
  nexusErrorResponse,
  type JsonRecord,
} from "@/lib/nexus-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const planSchema: JsonRecord = {
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
          amount: { type: ["number", "null"] },
          reference_month: { type: ["string", "null"] },
          date: { type: ["string", "null"] },
          label: { type: "string" },
          before: { type: ["string", "null"] },
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
};

function parseJson(value: string) {
  const normalized = value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();

  return JSON.parse(normalized) as unknown;
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

  const rules = `
Você é o Nexus Bank, o interpretador financeiro da Candinho Company.

MISSÃO:
Transformar a mensagem do usuário em um PLANO DE ALTERAÇÕES, nunca executar nada.
O usuário sempre verá uma prévia e precisará clicar em Confirmar tudo.

SEGURANÇA:
1. Use SOMENTE entity_id que exista no CONTEXTO DO BANK.
2. Nunca invente IDs, cartões, contas, dívidas, salários ou mensalidades.
3. Se houver ambiguidade entre duas entidades, NÃO crie ação. Explique em warnings.
4. Não suponha valor que não foi dito e não exista claramente no contexto.
5. Notinhas ficam fora da projeção.
6. Pagamentos de empréstimo continuam no botão Paguei do site.
7. A única ação em empréstimos permitida pelo chat é postpone_debt quando o usuário disser para adiar/pular/empurrar a parcela.
8. Um adiamento significa mover a próxima parcela exatamente +1 mês.
9. Valor de fatura de cartão é o TOTAL da fatura daquele mês.
10. "Tudo igual ao mês passado" copia as faturas de previous_month para current_month, exceto mudanças explicitamente informadas.
11. "Recebi salário/vale" => mark_income_received.
12. "Ainda não recebi" => mark_income_pending.
13. "O salário passou a ser X / daqui pra frente X" => set_income_default_amount.
14. Apenas mencionar "salário X" não significa alterar o padrão.
15. "Mensalidade/aluguel/psicóloga agora é X" => set_subscription_amount.
16. "Saldo da conta/carteira é X" => set_account_balance.
17. "Nubank/BB/Inter deste mês é X" => set_card_invoice.
18. reference_month = YYYY-MM-01. date = YYYY-MM-DD.
19. Português brasileiro curto e prático.
20. before/after amigáveis em R$ quando houver valor.
21. can_apply=true apenas quando as ações forem seguras.
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

  const prompt = `
${rules}

HISTÓRICO RECENTE:
${JSON.stringify(history)}

CONTEXTO REAL DO BANK:
${JSON.stringify(context)}

MENSAGEM DE AGORA:
${message}
  `.trim();

  try {
    const result = await generateNexus({
      system:
        "Você é o Nexus Bank. Gere apenas o JSON solicitado e nunca aplique alterações.",
      prompt,
      schema: planSchema,
      geminiModel:
        process.env.GEMINI_BANK_MODEL ||
        process.env.GEMINI_NEXUS_MODEL ||
        "gemini-3.5-flash-lite",
      openAIModel:
        process.env.OPENAI_BANK_MODEL ||
        process.env.OPENAI_NEXUS_MODEL ||
        "gpt-5-mini",
      timeoutMs: 40_000,
    });

    const plan = parseJson(result.text);

    if (!validatePlan(plan)) {
      return NextResponse.json(
        { error: "A prévia da IA não passou pela validação." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      message,
      plan,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    const normalized = nexusErrorResponse(error);

    console.error("Nexus Bank AI error", error);

    return NextResponse.json(
      {
        error: normalized.error,
        code: normalized.code,
      },
      { status: normalized.status },
    );
  }
}
