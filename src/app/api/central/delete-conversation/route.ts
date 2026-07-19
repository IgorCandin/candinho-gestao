import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error: "Endpoint encerrado: a Inbox da Candinho Central está pausada.",
      code: "INBOX_PAUSED",
    },
    { status: 410 },
  );
}
