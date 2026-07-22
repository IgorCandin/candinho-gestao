import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "A geração automática da Imagem 2 foi desativada.",
    },
    { status: 410 },
  );
}
