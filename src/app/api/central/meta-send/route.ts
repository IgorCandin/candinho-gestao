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
    } catch {}
  }
  return message;
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();
  if (!canUseCentral(access)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  let body: {
    conversation_id?: string;
    body?: string;
    media_storage_path?: string | null;
    media_mime_type?: string | null;
    media_filename?: string | null;
  };

  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }

  const conversationId = body.conversation_id?.trim();
  const text = body.body?.trim() ?? "";
  const mediaPath = body.media_storage_path?.trim() || null;

  if (!conversationId) return NextResponse.json({ error: "conversation_id é obrigatório." }, { status: 400 });
  if (!text && !mediaPath) return NextResponse.json({ error: "Digite uma mensagem ou anexe um arquivo." }, { status: 400 });
  if (text.length > 4096) return NextResponse.json({ error: "A mensagem excede 4096 caracteres." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("central-meta-send", {
    body: {
      conversation_id: conversationId,
      body: text,
      media_storage_path: mediaPath,
      media_mime_type: body.media_mime_type ?? null,
      media_filename: body.media_filename ?? null,
    },
  });

  if (error) return NextResponse.json({ error: await edgeErrorMessage(error, "Não foi possível enviar a mensagem.") }, { status: 502 });
  if (data?.error) return NextResponse.json({ error: String(data.error) }, { status: 502 });
  return NextResponse.json(data ?? { sent: true });
}
