import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StockRow = {
  product_id: string;
  location_id: string;
  available_quantity: number | string | null;
};

export async function GET() {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !(access.canAccessSupplements || access.role === "admin")
  ) {
    return NextResponse.json({ rows: [] }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sale_stock_availability")
    .select("product_id,location_id,available_quantity");

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível carregar a disponibilidade dos produtos." },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as StockRow[];

  return NextResponse.json(
    {
      rows: rows.map((row) => ({
        product_id: String(row.product_id),
        location_id: String(row.location_id),
        available_quantity: Number(row.available_quantity ?? 0),
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
