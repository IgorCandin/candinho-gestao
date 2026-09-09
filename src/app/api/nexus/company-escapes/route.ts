import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function route(value: unknown) {
  return typeof value === "string" && value.startsWith("/")
    ? value.slice(0, 320)
    : null;
}

export async function GET() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") {
    return NextResponse.json({ rows: [] }, { status: 403 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_navigation_escapes")
    .select("origin_route,destination_route,destination_operation,viewport_class,occurrence_count,last_seen_at")
    .order("last_seen_at", { ascending: false })
    .limit(100);
  return NextResponse.json({ rows: error ? [] : data ?? [] });
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const origin = route(body.origin_route);
  const destination = route(body.destination_route);
  if (!origin || !destination) return NextResponse.json({ ok: false }, { status: 400 });

  const viewport = ["mobile", "tablet", "desktop"].includes(String(body.viewport_class))
    ? String(body.viewport_class)
    : "unknown";
  const width = Number(body.viewport_width);
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_company_navigation_escape_v1", {
    p_origin_route: origin,
    p_destination_route: destination,
    p_viewport_class: viewport,
    p_viewport_width: Number.isFinite(width) ? Math.round(width) : null,
  });

  if (error) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}
