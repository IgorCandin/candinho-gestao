import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = new Set(["quoted", "lost", "cancelled"]);

function redirectBack(request: Request, id: string, action?: string) {
  const url = new URL(`/orcamentos/${id}`, request.url);
  if (action) url.searchParams.set("acao", action);
  return NextResponse.redirect(url, 303);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const form = await request.formData();
    const status = String(form.get("status") ?? "").trim();

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Situação de orçamento inválida." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("update_budget_status", {
      p_quote_id: id,
      p_status: status,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Não foi possível atualizar o orçamento." },
        { status: 400 },
      );
    }

    return redirectBack(request, id, status);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o orçamento.",
      },
      { status: 500 },
    );
  }
}
