import { NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

type JsonRecord = Record<string, unknown>;

type NutritionFact = {
  label: string;
  amount: string;
  daily_value: string;
};

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(
  value: string,
  maxCharacters: number,
  maxLines: number,
) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxCharacters) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;

    if (lines.length >= maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);

  if (words.length > 0 && lines.length === maxLines) {
    const joined = lines.join(" ");

    if (joined.length < value.trim().length) {
      lines[maxLines - 1] =
        `${lines[maxLines - 1].replace(/[.,;:]?$/, "")}…`;
    }
  }

  return lines;
}

function textBlock(
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
  lineHeight: number,
  options?: {
    weight?: number;
    fill?: string;
    anchor?: "start" | "middle" | "end";
  },
) {
  const weight = options?.weight ?? 500;
  const fill = options?.fill ?? "#F7F4ED";
  const anchor = options?.anchor ?? "start";

  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(line)}</text>`,
    )
    .join("");
}

function storagePath(url: string | null) {
  if (!url) return null;

  const marker = "/storage/v1/object/public/product-images/";
  const index = url.indexOf(marker);

  return index >= 0
    ? decodeURIComponent(url.slice(index + marker.length))
    : null;
}

function buildNutritionSvg(product: JsonRecord, payload: JsonRecord) {
  const width = 1080;
  const height = 1080;
  const margin = 64;
  const gold = "#D9A441";
  const muted = "#A8ADB7";
  const surface = "#141820";
  const line = "#303640";

  const productName = String(
    payload.confirmed_product_name || product.name || "Produto",
  );
  const brand = String(payload.confirmed_brand || "");
  const servingSize = String(payload.serving_size || "");
  const servings = String(payload.servings_per_container || "");
  const ingredients = String(payload.ingredients || "");
  const allergens = String(payload.allergens || "");
  const sourceName = String(
    payload.source_name || product.nutrition_source_name || "Fonte oficial",
  );
  const sourceUrl = String(
    payload.source_url || product.nutrition_source_url || "",
  );

  const sourceHost = (() => {
    try {
      return sourceUrl
        ? new URL(sourceUrl).hostname.replace(/^www\./, "")
        : "";
    } catch {
      return sourceUrl;
    }
  })();

  const allFacts = (
    Array.isArray(payload.nutrition_facts)
      ? payload.nutrition_facts
      : []
  )
    .filter(
      (item): item is JsonRecord =>
        Boolean(item) && typeof item === "object",
    )
    .map((item) => ({
      label: String(item.label ?? ""),
      amount: String(item.amount ?? ""),
      daily_value: String(item.daily_value ?? ""),
    }))
    .filter((item) => item.label || item.amount) as NutritionFact[];

  // Mantemos a arte legível. O payload completo continua salvo no banco.
  const facts = allFacts.slice(0, 8);
  const hasMoreFacts = allFacts.length > facts.length;

  const titleLines = wrapText(productName, 34, 2);
  const ingredientLines = wrapText(
    ingredients || "Não informado na fonte consultada.",
    96,
    2,
  );
  const allergenLines = wrapText(
    allergens || "Não informado na fonte consultada.",
    96,
    2,
  );

  const tableTop = 320;
  const headerHeight = 46;
  const rowHeight = 38;
  const tableHeight = headerHeight + facts.length * rowHeight;
  const tableBottom = tableTop + tableHeight;
  const portionY = tableBottom + 48;
  const ingredientsHeadingY = portionY + 72;
  const ingredientsTextY = ingredientsHeadingY + 28;
  const allergensHeadingY = ingredientsTextY + 65;
  const allergensTextY = allergensHeadingY + 27;

  const factRows = facts
    .map((fact, index) => {
      const y = tableTop + headerHeight + index * rowHeight;

      return `
        <line x1="${margin}" y1="${y}" x2="${width - margin}" y2="${y}" stroke="${line}" stroke-width="1" />
        <text x="${margin + 18}" y="${y + 26}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="600" fill="#F7F4ED">${escapeXml(fact.label)}</text>
        <text x="${width - 300}" y="${y + 26}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="600" fill="#F7F4ED" text-anchor="end">${escapeXml(fact.amount)}</text>
        <text x="${width - margin - 18}" y="${y + 26}" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="${gold}" text-anchor="end">${escapeXml(fact.daily_value)}</text>
      `;
    })
    .join("");

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#0B0E13" />
    <rect x="28" y="28" width="1024" height="1024" rx="34" fill="${surface}" stroke="#262C35" stroke-width="2" />
    <rect x="${margin}" y="${margin}" width="8" height="86" rx="4" fill="${gold}" />

    <text x="${margin + 28}" y="86" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800" letter-spacing="3" fill="${gold}">CANDINHO SUPLEMENTOS</text>
    <text x="${margin + 28}" y="124" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" letter-spacing="2" fill="${muted}">INFORMAÇÃO NUTRICIONAL · IMAGEM 2</text>

    ${textBlock(titleLines, margin, 198, 40, 46, { weight: 800 })}
    ${brand ? `<text x="${margin}" y="286" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" fill="${muted}">${escapeXml(brand)}</text>` : ""}

    <rect x="${margin}" y="${tableTop}" width="${width - margin * 2}" height="${tableHeight}" rx="16" fill="#0E1218" stroke="${line}" stroke-width="2" />
    <text x="${margin + 18}" y="${tableTop + 30}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="${muted}">NUTRIENTE / ATIVO</text>
    <text x="${width - 300}" y="${tableTop + 30}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="${muted}" text-anchor="end">QUANTIDADE</text>
    <text x="${width - margin - 18}" y="${tableTop + 30}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="${muted}" text-anchor="end">%VD</text>
    ${factRows}

    ${hasMoreFacts ? `<text x="${margin}" y="${tableBottom + 22}" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="600" fill="${muted}">+ ${allFacts.length - facts.length} item(ns) no rótulo completo. Consulte a embalagem/fonte oficial.</text>` : ""}

    <text x="${margin}" y="${portionY}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="${gold}">PORÇÃO</text>
    <text x="${margin}" y="${portionY + 27}" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="600" fill="#F7F4ED">${escapeXml(servingSize || "Não informada")}${servings ? ` · ${escapeXml(servings)}` : ""}</text>

    <text x="${margin}" y="${ingredientsHeadingY}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="${gold}">INGREDIENTES</text>
    ${textBlock(ingredientLines, margin, ingredientsTextY, 16, 22, { weight: 500, fill: "#D7DAE0" })}

    <text x="${margin}" y="${allergensHeadingY}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="${gold}">ALERGÊNICOS / OBSERVAÇÕES DE RÓTULO</text>
    ${textBlock(allergenLines, margin, allergensTextY, 16, 22, { weight: 500, fill: "#D7DAE0" })}

    <line x1="${margin}" y1="972" x2="${width - margin}" y2="972" stroke="${line}" stroke-width="2" />
    <text x="${margin}" y="1005" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="${muted}">Fonte consultada: ${escapeXml(sourceName)}${sourceHost ? ` · ${escapeXml(sourceHost)}` : ""}</text>
    <text x="${margin}" y="1032" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="500" fill="#747B87">Conteúdo para consulta do catálogo. Confira sempre o rótulo físico do produto.</text>
  </svg>`;
}

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();

    if (!access.canWriteSupplements) {
      return NextResponse.json(
        { error: "Sem permissão para gerar Imagem 2." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const productId =
      typeof body.productId === "string" ? body.productId : "";

    if (!productId) {
      return NextResponse.json(
        { error: "Produto não informado." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        "id,name,sku,nutrition_ai_payload,nutrition_source_name,nutrition_source_url,nutrition_match_status,nutrition_match_confidence,secondary_image_url,secondary_thumbnail_url",
      )
      .eq("id", productId)
      .maybeSingle();

    if (productError) throw productError;

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 },
      );
    }

    const payload = product.nutrition_ai_payload;

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json(
        {
          error:
            "Pesquise o produto com IA antes de gerar a Imagem 2.",
        },
        { status: 409 },
      );
    }

    const research = payload as JsonRecord;
    const matchStatus = String(
      product.nutrition_match_status ??
        research.product_match_status ??
        "",
    );
    const sourceClassification = String(
      research.source_classification ?? "",
    );
    const sourceUrl = String(
      research.source_url ?? product.nutrition_source_url ?? "",
    ).trim();
    const canGenerate = Boolean(research.can_generate_image);

    if (
      !canGenerate ||
      !["exact", "probable"].includes(matchStatus)
    ) {
      return NextResponse.json(
        {
          error:
            "A pesquisa ainda não tem correspondência segura para gerar a Imagem 2.",
        },
        { status: 409 },
      );
    }

    if (
      ![
        "official_brand",
        "official_manufacturer",
        "official_document",
      ].includes(sourceClassification) ||
      !sourceUrl
    ) {
      return NextResponse.json(
        {
          error:
            "A geração automática exige uma fonte oficial identificada.",
        },
        { status: 409 },
      );
    }

    const svg = buildNutritionSvg(
      product as unknown as JsonRecord,
      research,
    );

    const fullBuffer = await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9 })
      .toBuffer();

    const thumbBuffer = await sharp(fullBuffer)
      .resize(360, 360, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    const token = crypto.randomUUID();
    const fullPath =
      `${productId}/secondary-ai-${token}.png`;
    const thumbPath =
      `${productId}/secondary-ai-${token}-thumb.webp`;

    const { error: fullUploadError } = await supabase.storage
      .from("product-images")
      .upload(fullPath, fullBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (fullUploadError) throw fullUploadError;

    const { error: thumbUploadError } = await supabase.storage
      .from("product-images")
      .upload(thumbPath, thumbBuffer, {
        contentType: "image/webp",
        upsert: false,
      });

    if (thumbUploadError) {
      await supabase.storage
        .from("product-images")
        .remove([fullPath]);

      throw thumbUploadError;
    }

    const fullUrl = supabase.storage
      .from("product-images")
      .getPublicUrl(fullPath).data.publicUrl;

    const thumbUrl = supabase.storage
      .from("product-images")
      .getPublicUrl(thumbPath).data.publicUrl;

    const { error: imageSaveError } = await supabase.rpc(
      "set_product_image",
      {
        p_product_id: productId,
        p_slot: "secondary",
        p_image_url: fullUrl,
        p_thumbnail_url: thumbUrl,
      },
    );

    if (imageSaveError) {
      await supabase.storage
        .from("product-images")
        .remove([fullPath, thumbPath]);

      throw imageSaveError;
    }

    const oldPaths = [
      storagePath(product.secondary_image_url),
      storagePath(product.secondary_thumbnail_url),
    ].filter((value): value is string => Boolean(value));

    if (oldPaths.length > 0) {
      await supabase.storage
        .from("product-images")
        .remove(oldPaths);
    }

    const { error: markError } = await supabase.rpc(
      "mark_product_nutrition_image_generated",
      {
        p_product_id: productId,
      },
    );

    return NextResponse.json({
      ok: true,
      imageUrl: fullUrl,
      thumbnailUrl: thumbUrl,
      warning: markError ? markError.message : null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar a Imagem 2.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
