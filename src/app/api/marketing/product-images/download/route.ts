import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_IMAGE_HOST =
  "ilboydbakpcfoaexpnhw.supabase.co";

function safeFilename(value: string | null) {
  const raw =
    value?.trim() || "produto.jpg";

  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "produto.jpg";
}

function resolveSource(
  request: Request,
  value: string,
) {
  const requestUrl = new URL(request.url);

  if (value.startsWith("/")) {
    return new URL(value, requestUrl.origin);
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return null;
  }

  if (
    parsed.host !== requestUrl.host &&
    parsed.hostname !== SUPABASE_IMAGE_HOST
  ) {
    return null;
  }

  return parsed;
}

export async function GET(request: Request) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !(
      access.role === "admin" ||
      access.canAccessMarketing
    )
  ) {
    return NextResponse.json(
      { error: "Sem acesso." },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const source = url.searchParams.get("src");

  if (!source) {
    return NextResponse.json(
      { error: "Imagem não informada." },
      { status: 400 },
    );
  }

  const target = resolveSource(
    request,
    source,
  );

  if (!target) {
    return NextResponse.json(
      { error: "Origem da imagem não permitida." },
      { status: 400 },
    );
  }

  const upstream = await fetch(
    target,
    { cache: "no-store" },
  );

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Não foi possível carregar a imagem." },
      { status: 404 },
    );
  }

  const bytes =
    await upstream.arrayBuffer();

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ??
        "application/octet-stream",
      "Content-Disposition":
        `attachment; filename="${safeFilename(
          url.searchParams.get("filename"),
        )}"`,
      "Cache-Control":
        "private, max-age=0, no-store",
    },
  });
}
