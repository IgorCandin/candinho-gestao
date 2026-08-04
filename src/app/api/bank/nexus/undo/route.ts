import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    | { batchId?: unknown }
    | null;

  const batchId =
    typeof body?.batchId === "string" ? body.batchId : "";

  if (!uuidPattern.test(batchId)) {
    return NextResponse.json(
      { error: "Atualização inválida." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "bank_nexus_undo_batch",
    {
      p_batch_id: batchId,
    },
  );

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Não foi possível desfazer essa atualização.",
      },
      { status: 400 },
    );
  }

  revalidateBank();

  return NextResponse.json({ ok: true });
}
