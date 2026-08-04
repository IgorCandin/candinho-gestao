import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import {
  BANK_NEXUS_ACTION_TYPES,
  type BankNexusAction,
} from "@/lib/bank-nexus-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function revalidateBank() {
  revalidatePath("/bank");
  revalidatePath("/bank/nexus");
  revalidatePath("/bank/entradas");
  revalidatePath("/bank/faturas");
  revalidatePath("/bank/faturas/rapido");
  revalidatePath("/bank/emprestimos");
  revalidatePath("/bank/mensalidades");
  revalidatePath("/bank/contas");
  revalidatePath("/bank/visao-anual");
}

function validActions(value: unknown): value is BankNexusAction[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) {
    return false;
  }

  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;

    return (
      typeof row.type === "string" &&
      BANK_NEXUS_ACTION_TYPES.includes(
        row.type as (typeof BANK_NEXUS_ACTION_TYPES)[number],
      ) &&
      typeof row.entity_id === "string" &&
      typeof row.entity_name === "string"
    );
  });
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
        summary?: unknown;
        actions?: unknown;
      }
    | null;

  const message =
    typeof body?.message === "string"
      ? body.message.trim().slice(0, 8000)
      : "";

  const summary =
    typeof body?.summary === "string"
      ? body.summary.trim().slice(0, 2000)
      : "";

  if (!message || !validActions(body?.actions)) {
    return NextResponse.json(
      { error: "Prévia inválida ou vazia." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "bank_nexus_apply_batch",
    {
      p_user_message: message,
      p_assistant_summary: summary || null,
      p_actions: body!.actions,
    },
  );

  if (error) {
    console.error("bank_nexus_apply_batch", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Não foi possível aplicar as alterações no Bank.",
      },
      { status: 400 },
    );
  }

  revalidateBank();

  return NextResponse.json({
    ok: true,
    batchId: String(data),
  });
}
