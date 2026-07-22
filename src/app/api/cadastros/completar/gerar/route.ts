import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "O preenchimento em lote foi desativado. Complete cada produto individualmente.",
    },
    { status: 410 },
  );
}
