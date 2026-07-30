import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { getNexusBrief } from "@/lib/nexus-operating-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await getCurrentUserAccess();

  if (!access.active || !access.canAccessSupplements) {
    return NextResponse.json({ error: "Sem acesso ao Nexus." }, { status: 403 });
  }

  const refresh =
    request.nextUrl.searchParams.get("refresh") === "1" &&
    (access.role === "admin" || access.canWriteSupplements);

  const brief = await getNexusBrief({ refresh, signalLimit: 40 });
  return NextResponse.json(brief, { headers: { "Cache-Control": "no-store" } });
}
