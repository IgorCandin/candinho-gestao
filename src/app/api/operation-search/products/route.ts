import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchRow = {
  operation: string;
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  available_quantity: number | string | null;
  href: string;
  subtitle: string | null;
};

export async function GET(request: NextRequest) {
  const access = await getCurrentUserAccess();

  if (!access.active) {
    return NextResponse.json({ results: [] }, { status: 403 });
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "")
    .trim()
    .slice(0, 100);

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_internal_products_v1", {
    p_query: query,
    p_include_supplements:
      access.canAccessSupplements || access.role === "admin",
    p_include_fitness: access.canAccessFitness || access.role === "admin",
    p_limit: 14,
  });

  if (error) {
    return NextResponse.json({ results: [] }, { status: 500 });
  }

  const rows = (Array.isArray(data) ? data : []) as SearchRow[];

  return NextResponse.json({
    results: rows.map((row) => ({
      operation: row.operation === "fitness" ? "fitness" : "supplements",
      id: String(row.id),
      name: String(row.name),
      category: row.category,
      brand: row.brand,
      available_quantity: Number(row.available_quantity ?? 0),
      href: String(row.href),
      subtitle: row.subtitle,
    })),
  });
}
