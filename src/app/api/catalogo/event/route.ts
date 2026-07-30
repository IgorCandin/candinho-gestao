import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "product_view",
  "buy_intent",
  "whatsapp_click",
  "nexus_open",
  "nexus_question",
  "human_handoff",
]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const eventType =
    typeof body.event_type === "string" ? body.event_type : "";

  if (!ALLOWED.has(eventType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sessionId =
    typeof body.session_id === "string"
      ? body.session_id.slice(0, 120)
      : null;

  const productId =
    typeof body.product_id === "string" && body.product_id
      ? body.product_id
      : null;

  const metadataSource =
    body.metadata &&
    typeof body.metadata === "object" &&
    !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : {};

  const metadata = {
    source:
      typeof metadataSource.source === "string"
        ? metadataSource.source.slice(0, 60)
        : undefined,
    placement:
      typeof metadataSource.placement === "string"
        ? metadataSource.placement.slice(0, 60)
        : undefined,
  };

  const supabase = await createClient();
  const { error } = await supabase.rpc("public_catalog_track_event_v1", {
    p_session_id: sessionId,
    p_event_type: eventType,
    p_product_id: productId,
    p_metadata: metadata,
  });

  if (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
