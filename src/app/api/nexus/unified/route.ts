import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { emptyNexusUnifiedQueue } from "@/lib/nexus-unified-types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await getCurrentUserAccess();

  if (!access.active || access.role === "partner") {
    return NextResponse.json({ error: "Sem acesso à fila." }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Math.max(
    1,
    Math.min(Number(url.searchParams.get("limit") ?? 80) || 80, 200),
  );

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("nexus_unified_queue_v1", {
    p_limit: limit,
  });

  if (error) {
    return NextResponse.json(
      { ...emptyNexusUnifiedQueue(), error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? emptyNexusUnifiedQueue());
}
