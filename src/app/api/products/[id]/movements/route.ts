import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isUuidRouteParam } from "@/lib/route-param-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: Context,
) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    access.role === "partner" ||
    (!access.canAccessSupplements && access.role !== "admin")
  ) {
    return NextResponse.json(
      { error: "Sem acesso." },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  if (!isUuidRouteParam(id)) {
    return NextResponse.json(
      { error: "Produto inválido." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "product_movement_timeline_v1",
    {
      p_product_id: id,
      p_limit: 150,
    },
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({
    rows: data ?? [],
  });
}
