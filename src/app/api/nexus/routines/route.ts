import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  emptyNexusRoutinesWorkspace,
  type NexusRoutineStep,
} from "@/lib/nexus-routine-types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

function steps(value: unknown): NexusRoutineStep[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 8)
    .map((item) => object(item))
    .map((item) => ({
      type: "route" as const,
      href: clean(item.href, 320) ?? "",
      label: clean(item.label, 120) ?? undefined,
    }))
    .filter((item) => item.href.startsWith("/"));
}

async function canUse() {
  const access = await getCurrentUserAccess();
  return {
    access,
    ok: access.active && access.role !== "partner",
  };
}

export async function GET(request: Request) {
  const { ok } = await canUse();
  if (!ok) {
    return NextResponse.json({ error: "Sem acesso às rotinas." }, { status: 403 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const supabase = await createClient();

  if (mode === "active") {
    const { data, error } = await supabase.rpc("nexus_active_routine_v1");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data ?? null);
  }

  const { data, error } = await supabase.rpc("nexus_routines_workspace_v1");

  if (error) {
    return NextResponse.json(
      { ...emptyNexusRoutinesWorkspace(), error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? emptyNexusRoutinesWorkspace());
}

export async function POST(request: Request) {
  const { ok } = await canUse();
  if (!ok) {
    return NextResponse.json({ error: "Sem acesso às rotinas." }, { status: 403 });
  }

  const body = object(await request.json().catch(() => ({})));
  const action = clean(body.action, 40);
  const supabase = await createClient();

  if (action === "create") {
    const title = clean(body.title, 120);
    const routineSteps = steps(body.steps);

    if (!title || routineSteps.length < 2) {
      return NextResponse.json(
        { error: "Informe um nome e pelo menos 2 etapas." },
        { status: 400 },
      );
    }

    const source =
      body.source === "learned" || body.source === "template"
        ? body.source
        : "manual";

    const { data, error } = await supabase.rpc("nexus_create_routine_v1", {
      p_title: title,
      p_steps: routineSteps,
      p_description: clean(body.description, 500),
      p_source: source,
      p_source_key: clean(body.source_key, 300),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: data });
  }

  if (action === "start") {
    const routineId = clean(body.routine_id, 80);
    if (!routineId) {
      return NextResponse.json({ error: "Rotina inválida." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("nexus_start_routine_v1", {
      p_routine_id: routineId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  }

  if (action === "advance") {
    const runId = clean(body.run_id, 80);
    if (!runId) {
      return NextResponse.json({ error: "Execução inválida." }, { status: 400 });
    }

    const mode = body.mode === "skip" ? "skip" : "arrive";

    const { data, error } = await supabase.rpc("nexus_advance_routine_v1", {
      p_run_id: runId,
      p_action: mode,
      p_href: clean(body.href, 320),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data ?? null);
  }

  if (action === "cancel") {
    const runId = clean(body.run_id, 80);
    if (!runId) {
      return NextResponse.json({ error: "Execução inválida." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("nexus_cancel_routine_v1", {
      p_run_id: runId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: Boolean(data) });
  }

  if (action === "delete") {
    const routineId = clean(body.routine_id, 80);
    if (!routineId) {
      return NextResponse.json({ error: "Rotina inválida." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("nexus_delete_routine_v1", {
      p_routine_id: routineId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: Boolean(data) });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
