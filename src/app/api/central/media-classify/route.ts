import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();
  const canUseCentral = access.active && (
    access.role === "admin" ||
    access.canAccessSupplements ||
    access.canAccessFitness ||
    access.canAccessMarketing
  );

  if (!canUseCentral) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  let body: { asset_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body.asset_id) {
    return NextResponse.json({ error: "asset_id é obrigatório." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("central-media-classify", {
    body: { asset_id: body.asset_id },
  });

  if (error) {
    let message = error.message || "Não foi possível classificar a mídia.";
    const context = (error as { context?: Response }).context;

    if (context) {
      try {
        const payload = await context.clone().json() as { error?: string };
        if (payload?.error) message = payload.error;
      } catch {
        // Mantém a mensagem original quando a Edge Function não retorna JSON.
      }
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json(data ?? { ok: true });
}
