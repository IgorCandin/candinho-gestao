import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    (!access.canAccessBank && access.role !== "admin")
  ) {
    return NextResponse.json(
      { count: 0, totalRemaining: 0 },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_debts_overview")
    .select("id,remaining_amount,effective_status,status,debt_type")
    .eq("debt_type", "note")
    .not("effective_status", "in", "(paid,cancelled)");

  if (error) {
    return NextResponse.json(
      { count: 0, totalRemaining: 0 },
      { status: 500 },
    );
  }

  const rows = (data ?? []).filter(
    (row) =>
      !["paid", "cancelled"].includes(
        String(row.effective_status ?? row.status ?? "active"),
      ),
  );

  return NextResponse.json({
    count: rows.length,
    totalRemaining: rows.reduce(
      (sum, row) => sum + Number(row.remaining_amount ?? 0),
      0,
    ),
  });
}
