import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { emptyNexusDailySnapshot } from "@/lib/nexus-daily-types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await getCurrentUserAccess();

  if (!access.active || !access.canAccessSupplements) {
    return NextResponse.json({ error: "Sem acesso ao Nexus." }, { status: 403 });
  }

  const url = new URL(request.url);
  const route = url.searchParams.get("route") || "/suplementos";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("nexus_daily_snapshot_v1", {
    p_route: route.slice(0, 400),
  });

  if (error) {
    return NextResponse.json(
      { ...emptyNexusDailySnapshot(route), error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? emptyNexusDailySnapshot(route));
}
