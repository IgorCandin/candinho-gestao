import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = new Set([
  "layout",
  "broken_action",
  "wrong_data",
  "confusing_flow",
  "slow_screen",
  "integration",
  "other",
]);

const SEVERITIES = new Set(["low", "normal", "high", "critical"]);
const STATUSES = new Set(["open", "triaged", "in_progress", "resolved", "ignored"]);

function cleanText(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanRoute(value: unknown) {
  const raw = cleanText(value, 320);
  if (!raw.startsWith("/")) return null;
  return raw.split("?")[0].split("#")[0].slice(0, 280);
}

function intOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : null;
}

function decimalOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : null;
}

function viewportClass(value: unknown) {
  return value === "mobile" || value === "tablet" || value === "desktop"
    ? value
    : "unknown";
}

function fingerprint(category: string, route: string | null, description: string) {
  const normalized = description
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
    .slice(0, 140);
  return `${category}|${route ?? "unknown"}|${normalized}`.slice(0, 420);
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();
  if (!access.active) {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const category = CATEGORIES.has(String(body.category)) ? String(body.category) : "other";
  const severity = SEVERITIES.has(String(body.severity)) ? String(body.severity) : "normal";
  const description = cleanText(body.description, 2000);

  if (description.length < 3) {
    return NextResponse.json(
      { ok: false, error: "Descreva rapidamente o que aconteceu." },
      { status: 400 },
    );
  }

  const route = cleanRoute(body.route);
  const previousRoute = cleanRoute(body.previous_route);
  const sessionId = cleanText(body.session_id, 120) || null;
  const supabase = await createClient();

  let recentActions: unknown[] = [];
  if (sessionId) {
    const { data } = await supabase
      .from("nexus_activity_events")
      .select("route,previous_route,target_route,action_kind,action_key,created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(12);
    recentActions = data ?? [];
  }

  const clientContext =
    body.client_context && typeof body.client_context === "object" && !Array.isArray(body.client_context)
      ? body.client_context
      : {};

  const { data, error } = await supabase
    .from("ux_issue_reports")
    .insert({
      category,
      severity,
      description,
      route,
      previous_route: previousRoute,
      viewport_class: viewportClass(body.viewport_class),
      screen_width: intOrNull(body.screen_width),
      screen_height: intOrNull(body.screen_height),
      device_pixel_ratio: decimalOrNull(body.device_pixel_ratio),
      user_agent: cleanText(body.user_agent, 700) || null,
      session_id: sessionId,
      recent_actions: recentActions,
      client_context: clientContext,
      error_message: cleanText(body.error_message, 1500) || null,
      fingerprint: fingerprint(category, route, description),
    })
    .select("id,created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Não foi possível registrar a ocorrência." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, report: data });
}

export async function PATCH(request: Request) {
  const access = await getCurrentUserAccess();
  if (!access.active) {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = cleanText(body.id, 80);
  const status = String(body.status);

  if (!id || !STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: "Atualização inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ux_issue_reports")
    .update({
      status,
      resolution_notes: cleanText(body.resolution_notes, 2000) || null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Não foi possível atualizar o relato." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
