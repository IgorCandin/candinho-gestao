import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function canUseCentral(access: Awaited<ReturnType<typeof getCurrentUserAccess>>) {
  return access.active && (
    access.role === "admin" ||
    access.canAccessSupplements ||
    access.canAccessFitness ||
    access.canAccessMarketing
  );
}

async function edgeErrorMessage(error: unknown, fallback: string) {
  const typed = error as { message?: string; context?: Response };
  let message = typed?.message || fallback;
  const context = typed?.context;

  if (context) {
    try {
      const payload = await context.clone().json() as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {
      // Mantém a mensagem original quando a Edge Function não retorna JSON.
    }
  }

  return message;
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();
  if (!canUseCentral(access)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  let body: { conversation_id?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const conversationId = body.conversation_id?.trim();
  const text = body.body?.trim();

  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id é obrigatório." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "Digite uma mensagem." }, { status: 400 });
  }
  if (text.length > 4096) {
    return NextResponse.json({ error: "A mensagem excede 4096 caracteres." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("central-meta-send", {
    body: { conversation_id: conversationId, body: text },
  });

  if (error) {
    const message = await edgeErrorMessage(error, "Não foi possível enviar a mensagem.");
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (data?.error) {
    return NextResponse.json({ error: String(data.error) }, { status: 502 });
  }

  return NextResponse.json(data ?? { sent: true });
}
