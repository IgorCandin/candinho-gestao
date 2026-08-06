import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { emptyNexusPersonalWorkspace } from "@/lib/nexus-personal-types";
import { nexusOperationForHref } from "@/lib/nexus-shortcut-utils";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeRoute(value: unknown) {
  if (typeof value !== "string") return "/dashboard";
  const route = value.trim().slice(0, 320);
  return route.startsWith("/") ? route : "/dashboard";
}

function safeHref(value: unknown) {
  if (typeof value !== "string") return null;
  const href = value.trim().slice(0, 320);
  if (!href.startsWith("/") || href.includes(":id")) return null;
  return href;
}

export async function GET(request: Request) {
  const access = await getCurrentUserAccess();

  if (!access.active || access.role === "partner") {
    return NextResponse.json(
      { error: "Sem acesso aos atalhos pessoais." },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const route = safeRoute(url.searchParams.get("route"));
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("nexus_personal_workspace_v1", {
    p_route: route,
  });

  if (error) {
    return NextResponse.json(
      { ...emptyNexusPersonalWorkspace(route), error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? emptyNexusPersonalWorkspace(route));
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();

  if (!access.active || access.role === "partner") {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const action =
    typeof body.action === "string" ? body.action.trim().toLowerCase() : "";

  const supabase = await createClient();

  if (action === "pin") {
    const href = safeHref(body.href);
    if (!href) {
      return NextResponse.json({ error: "Atalho inválido." }, { status: 400 });
    }

    const label =
      typeof body.label === "string" && body.label.trim()
        ? body.label.trim().slice(0, 120)
        : "Atalho";

    const contextRoute =
      body.context_route === "*"
        ? "*"
        : safeRoute(body.context_route ?? "/dashboard");

    const source =
      body.source === "workflow" ||
      body.source === "learned" ||
      body.source === "command"
        ? body.source
        : "manual";

    const { data, error } = await supabase.rpc("nexus_pin_shortcut_v1", {
      p_href: href,
      p_label: label,
      p_operation_scope: nexusOperationForHref(href),
      p_context_route: contextRoute,
      p_source: source,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: data });
  }

  if (action === "unpin") {
    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ error: "Atalho inválido." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("nexus_unpin_shortcut_v1", {
      p_id: body.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: Boolean(data) });
  }

  if (action === "use") {
    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { data } = await supabase.rpc("nexus_record_shortcut_use_v1", {
      p_id: body.id,
    });

    return NextResponse.json({ ok: Boolean(data) });
  }

  return NextResponse.json(
    { error: "Ação inválida. Use pin, unpin ou use." },
    { status: 400 },
  );
}
