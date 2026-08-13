import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { emptyNexusUxDoctorSnapshot } from "@/lib/nexus-ux-doctor-types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max = 500) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function boundedInt(value: unknown, max = 10000) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const rounded = Math.round(number);
  return rounded >= 0 && rounded <= max ? rounded : null;
}

export async function GET() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("nexus_ux_doctor_snapshot_v1");

  if (error) {
    return NextResponse.json(
      { ...emptyNexusUxDoctorSnapshot(), error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? emptyNexusUxDoctorSnapshot());
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();
  if (!access.active) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = object(await request.json().catch(() => ({})));
  const signalType = clean(body.signal_type, 80);
  const route = clean(body.route, 320);
  const healthCheck = clean(body.health_check, 40);

  const allowed = new Set([
    "horizontal_overflow",
    "fixed_clip",
    "client_error",
  ]);

  if (!route?.startsWith("/")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const viewportClass =
    body.viewport_class === "mobile" ||
    body.viewport_class === "tablet" ||
    body.viewport_class === "desktop"
      ? body.viewport_class
      : "unknown";

  const supabase = await createClient();

  if (healthCheck === "layout") {
    const { data, error } = await supabase.rpc(
      "nexus_confirm_ux_layout_health_v1",
      {
        p_route: route,
        p_viewport_class: viewportClass,
      },
    );

    if (error) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    return NextResponse.json({ ok: true, resolved: data ?? 0 });
  }

  if (!signalType || !allowed.has(signalType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { data, error } = await supabase.rpc(
    "nexus_record_ux_health_signal_v1",
    {
      p_signal_type: signalType,
      p_route: route,
      p_viewport_class: viewportClass,
      p_viewport_width: boundedInt(body.viewport_width),
      p_viewport_height: boundedInt(body.viewport_height),
      p_overflow_px: boundedInt(body.overflow_px, 100000),
      p_payload: object(body.payload),
    },
  );

  if (error) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: data });
}
