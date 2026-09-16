import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { getCompanyProductPhotos } from "@/lib/company-product-photos";
import { isUuidRouteParam } from "@/lib/route-param-guards";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const operation = new URL(request.url).searchParams.get("module");
  if (!isUuidRouteParam(id) || (operation !== "supplements" && operation !== "fitness")) {
    return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
  }
  const access = await getCurrentUserAccess();
  const allowed = access.active && (access.role === "admin" || (operation === "supplements" ? access.canAccessSupplements : access.canAccessFitness));
  if (!allowed) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  try {
    const photos = await getCompanyProductPhotos(operation, id);
    if (!photos) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    const selected = new URL(request.url).searchParams.get("download");
    if (selected) {
      const slot = photos.slots.find((item) => item.key === selected);
      if (!slot?.url) return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
      const source = new URL(slot.url, request.url);
      const requestUrl = new URL(request.url);
      if (source.protocol !== "https:" || (source.host !== requestUrl.host && source.hostname !== "ilboydbakpcfoaexpnhw.supabase.co")) {
        return NextResponse.json({ error: "Origem da foto não permitida." }, { status: 400 });
      }
      const upstream = await fetch(source, { cache: "no-store" });
      if (!upstream.ok) return NextResponse.json({ error: "Não foi possível baixar a foto." }, { status: 502 });
      const contentType = upstream.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) return NextResponse.json({ error: "O arquivo não é uma foto." }, { status: 502 });
      const extension = contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "jpg";
      const filename = `${operation}-${id}-${selected.replace(/[^a-zA-Z0-9-]/g, "-")}.${extension}`;
      return new Response(upstream.body, { headers: { "Content-Type": contentType, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json(photos, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar as fotos." }, { status: 500 });
  }
}
