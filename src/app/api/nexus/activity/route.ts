import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeRoute(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw.startsWith("/")) return null;

  const pathname = raw.split("?")[0].split("#")[0];

  return pathname
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ":id";
      if (/^\d+$/.test(segment)) return ":id";
      return segment.slice(0, 80);
    })
    .join("/")
    .slice(0, 280);
}

function operationScope(route: string) {
  if (route.startsWith("/fitness")) return "fitness";
  if (route.startsWith("/bank")) return "bank";
  if (route.startsWith("/central")) return "central";
  if (route.startsWith("/marketing")) return "marketing";
  return "supplements";
}

function cleanKey(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 120)
    : null;
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();

  if (!access.active) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const route = normalizeRoute(body.route);
  if (!route) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const previousRoute = normalizeRoute(body.previous_route);
  const targetRoute = normalizeRoute(body.target_route);

  const allowedKinds = new Set([
    "page_view",
    "navigation_click",
    "route_exit",
    "action_click",
    "form_submit",
  ]);

  const actionKind =
    typeof body.action_kind === "string" && allowedKinds.has(body.action_kind)
      ? body.action_kind
      : "page_view";

  const sessionId =
    typeof body.session_id === "string"
      ? body.session_id.slice(0, 120)
      : null;

  const metadataSource =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : {};

  const duration = Math.max(
    0,
    Math.min(Number(metadataSource.duration_ms ?? 0) || 0, 1_800_000),
  );

  // Privacidade: só telemetria técnica. Nunca salva texto de campo/formulário.
  const metadata = {
    viewport:
      metadataSource.viewport === "mobile" ||
      metadataSource.viewport === "tablet" ||
      metadataSource.viewport === "desktop"
        ? metadataSource.viewport
        : undefined,
    source:
      typeof metadataSource.source === "string"
        ? metadataSource.source.slice(0, 80)
        : undefined,
    component:
      typeof metadataSource.component === "string"
        ? metadataSource.component.slice(0, 120)
        : undefined,
    duration_ms: actionKind === "route_exit" ? duration : undefined,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("nexus_activity_events").insert({
    session_id: sessionId,
    route,
    previous_route: previousRoute,
    target_route: targetRoute,
    action_kind: actionKind,
    action_key: cleanKey(body.action_key) ?? targetRoute ?? actionKind,
    operation_scope: operationScope(route),
    metadata,
  });

  if (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
