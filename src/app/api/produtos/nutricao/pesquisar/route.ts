import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "A ferramenta Nutrição IA foi desativada. Use o preenchimento individual ao editar o produto.",
    },
    { status: 410 },
  );
}
