import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
}

function faq(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {},
    )
    .map((item) => ({
      question:
        typeof item.question === "string"
          ? item.question.trim().slice(0, 180)
          : "",
      answer:
        typeof item.answer === "string"
          ? item.answer.trim().slice(0, 1200)
          : "",
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 12);
}

function text(value: unknown, max = 5000) {
  return typeof value === "string"
    ? value.trim().slice(0, max) || null
    : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !(access.canWriteSupplements || access.role === "admin")
  ) {
    return NextResponse.json(
      { error: "Sem permissão para editar a página pública." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const slug =
    typeof body.slug === "string"
      ? body.slug
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 120)
      : "";

  if (!slug) {
    return NextResponse.json(
      { error: "Informe um link público válido." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.from("public_product_pages").upsert(
    {
      product_id: id,
      slug,
      public_title: text(body.public_title, 180),
      short_description: text(body.short_description, 1000),
      long_description: text(body.long_description, 5000),
      highlights: stringArray(body.highlights),
      usage_text: text(body.usage_text, 2500),
      warnings_text: text(body.warnings_text, 2500),
      faq: faq(body.faq),
      meta_title: text(body.meta_title, 180),
      meta_description: text(body.meta_description, 320),
      whatsapp_message_template: text(body.whatsapp_message_template, 1200),
      published: body.published !== false,
    },
    { onConflict: "product_id" },
  );

  if (error) {
    const conflict = /duplicate|unique/i.test(error.message);
    return NextResponse.json(
      {
        error: conflict
          ? "Esse link já está sendo usado por outro produto."
          : `Não foi possível salvar: ${error.message}`,
      },
      { status: conflict ? 409 : 500 },
    );
  }

  return NextResponse.json({ ok: true, slug });
}
