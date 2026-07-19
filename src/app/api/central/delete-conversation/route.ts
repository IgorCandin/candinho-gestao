import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function edgeErrorMessage(error: unknown, fallback: string) {
  const typed = error as { message?: string; context?: Response };
  let message = typed?.message || fallback;
  const context = typed?.context;
  if (context) {
    try {
      const payload = await context.clone().json() as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {}
  }
  return message;
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();
  if (!(access.active && (access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing))) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  let body: { conversation_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const conversationId = body.conversation_id?.trim();
  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id é obrigatório." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("central-delete-conversation", {
    body: { conversation_id: conversationId },
  });

  if (error) {
    return NextResponse.json(
      { error: await edgeErrorMessage(error, "Não foi possível excluir a conversa do Inbox.") },
      { status: 502 },
    );
  }

  if (data?.error) return NextResponse.json({ error: String(data.error) }, { status: 502 });
  return NextResponse.json(data ?? { deleted: true });
}
