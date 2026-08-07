import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

function cleanUrl(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const url = value.trim();
  if (!url) return null;

  if (
    url.startsWith("/") ||
    url.startsWith("https://") ||
    url.startsWith("http://")
  ) {
    return url.slice(0, 1800);
  }

  return undefined;
}

export async function GET(_request: Request, context: Context) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    access.role === "partner" ||
    (!access.canAccessSupplements && access.role !== "admin")
  ) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "product_banner_snapshot_v1",
    {
      p_product_id: id,
    },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Produto não encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request, context: Context) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    (access.role !== "admin" && !access.canWriteSupplements)
  ) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const slot =
    body.slot === "mobile"
      ? "mobile"
      : body.slot === "desktop"
        ? "desktop"
        : null;
  const imageUrl = cleanUrl(body.image_url);

  if (!slot || imageUrl === undefined) {
    return NextResponse.json(
      { error: "Banner inválido." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("set_product_banner_v1", {
    p_product_id: id,
    p_slot: slot,
    p_image_url: imageUrl,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data, error: snapshotError } = await supabase.rpc(
    "product_banner_snapshot_v1",
    {
      p_product_id: id,
    },
  );

  if (snapshotError) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(data);
}
