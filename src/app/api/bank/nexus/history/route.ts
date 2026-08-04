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
      { history: [] },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { history: [] },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("bank_nexus_batches")
    .select(
      "id,assistant_summary,status,actions,created_at,undone_at",
    )
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json(
      { history: [] },
      { status: 500 },
    );
  }

  return NextResponse.json({
    history: (data ?? []).map((row) => ({
      id: String(row.id),
      summary:
        typeof row.assistant_summary === "string"
          ? row.assistant_summary
          : null,
      status: String(row.status) === "undone" ? "undone" : "applied",
      actionCount: Array.isArray(row.actions)
        ? row.actions.length
        : 0,
      createdAt: String(row.created_at ?? ""),
      undoneAt:
        typeof row.undone_at === "string"
          ? row.undone_at
          : null,
    })),
  });
}
