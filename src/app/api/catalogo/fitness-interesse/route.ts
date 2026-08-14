import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const name =
    typeof body.name === "string"
      ? body.name.trim().slice(0, 120)
      : "";

  const phone =
    typeof body.phone === "string"
      ? body.phone.trim().slice(0, 40)
      : "";

  const fitnessProductId =
    typeof body.fitness_product_id === "string" &&
    body.fitness_product_id
      ? body.fitness_product_id
      : null;

  const contextSummary =
    typeof body.context_summary === "string"
      ? body.context_summary.trim().slice(0, 2000)
      : null;

  const source =
    typeof body.source === "string"
      ? body.source.trim().slice(0, 60)
      : "catalog_fitness_lightbox";

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Informe seu nome para continuar." },
      { status: 400 },
    );
  }

  if (phone.replace(/\D/g, "").length < 8) {
    return NextResponse.json(
      { error: "Informe um telefone válido para contato." },
      { status: 400 },
    );
  }

  if (!fitnessProductId) {
    return NextResponse.json(
      { error: "Produto Fitness não identificado." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "public_create_fitness_catalog_lead_v1",
    {
      p_name: name,
      p_phone: phone,
      p_fitness_product_id: fitnessProductId,
      p_context_summary: contextSummary,
      p_source: source,
    },
  );

  if (error) {
    console.warn("[Fitness Catalog Lead]", error.message);

    return NextResponse.json(
      { error: "Não foi possível registrar seu interesse agora." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    request_id: typeof data === "string" ? data : null,
    inbox: true,
  });
}
