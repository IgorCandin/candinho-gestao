import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import sharp from "sharp";
import {
  getActiveSupplementPromotionMap,
  type CatalogActivePromotion,
} from "@/lib/catalog-active-promotions";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  quick_message: string | null;
  image_url: string | null;
  sale_price: number | string;
  installment_price: number | string;
  available_quantity: number | string;
  incoming_quantity: number | string;
  promotion: CatalogActivePromotion | null;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const BG = rgb(0.028, 0.036, 0.052);
const PANEL = rgb(0.06, 0.075, 0.106);
const LINE = rgb(0.145, 0.17, 0.216);
const TEXT = rgb(0.96, 0.97, 0.985);
const MUTED = rgb(0.62, 0.66, 0.72);
const GOLD = rgb(0.85, 0.64, 0.25);
const GREEN = rgb(0.27, 0.76, 0.48);

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return `R$ ${num(value).toFixed(2).replace(".", ",")}`;
}

function datePtBr() {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function shortDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : null;
}

function safePdfText(value: unknown) {
  const normalized = String(value ?? "")
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u2023\u25E6]/g, "-");

  return Array.from(normalized)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return (
        char === "\n" ||
        char === "\t" ||
        (code >= 0x20 && code <= 0x7e) ||
        (code >= 0xa0 && code <= 0xff)
      );
    })
    .join("")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number, maxLines = 2) {
  const words = safePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length >= maxLines - 1) break;
  }

  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    let last = lines[maxLines - 1];
    while (last.length > 3 && font.widthOfTextAtSize(`${last}...`, size) > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}...`;
  }
  return lines;
}

async function imageToPngBuffer(source: string | Buffer) {
  const input =
    typeof source === "string"
      ? Buffer.from(
          await (
            await fetch(source, { signal: AbortSignal.timeout(6500) })
          ).arrayBuffer(),
        )
      : source;

  return sharp(input)
    .resize({
      width: 360,
      height: 360,
      fit: "contain",
      background: { r: 15, g: 19, b: 27, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function embedProductImage(pdf: PDFDocument, url: string | null): Promise<PDFImage | null> {
  if (!url) return null;
  try {
    return await pdf.embedPng(await imageToPngBuffer(url));
  } catch {
    return null;
  }
}

function drawHeader(
  page: PDFPage,
  logo: PDFImage,
  bold: PDFFont,
  regular: PDFFont,
  includeIncoming: boolean,
) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: BG });
  const logoScale = Math.min(210 / logo.width, 64 / logo.height);
  page.drawImage(logo, {
    x: 34,
    y: PAGE_H - 83,
    width: logo.width * logoScale,
    height: logo.height * logoScale,
  });
  page.drawText(safePdfText("CATÁLOGO DE PRODUTOS"), {
    x: 330,
    y: PAGE_H - 49,
    size: 14,
    font: bold,
    color: TEXT,
  });
  page.drawText(safePdfText(`Atualizado em ${datePtBr()}`), {
    x: 330,
    y: PAGE_H - 67,
    size: 8.5,
    font: regular,
    color: MUTED,
  });
  if (includeIncoming) {
    page.drawText(safePdfText("Inclui produtos a caminho"), {
      x: 330,
      y: PAGE_H - 80,
      size: 8,
      font: regular,
      color: GOLD,
    });
  }
  page.drawLine({
    start: { x: 34, y: PAGE_H - 98 },
    end: { x: PAGE_W - 34, y: PAGE_H - 98 },
    thickness: 1,
    color: LINE,
  });
}

function drawFooter(page: PDFPage, regular: PDFFont, pageNumber: number) {
  page.drawLine({
    start: { x: 34, y: 35 },
    end: { x: PAGE_W - 34, y: 35 },
    thickness: 0.7,
    color: LINE,
  });
  page.drawText(safePdfText("Candinho Suplementos - Qualidade que entrega resultado."), {
    x: 34,
    y: 19,
    size: 7.5,
    font: regular,
    color: MUTED,
  });
  page.drawText(String(pageNumber), {
    x: PAGE_W - 42,
    y: 19,
    size: 7.5,
    font: regular,
    color: MUTED,
  });
}

function drawProductCard(
  page: PDFPage,
  product: CatalogProduct,
  image: PDFImage | null,
  x: number,
  y: number,
  regular: PDFFont,
  bold: PDFFont,
) {
  const width = 254;
  const height = 205;
  const promotion = product.promotion;

  page.drawRectangle({ x, y, width, height, color: PANEL, borderColor: LINE, borderWidth: 0.8 });
  page.drawRectangle({ x, y: y + height - 4, width, height: 4, color: GOLD });

  const imageX = x + 14;
  const imageY = y + 72;
  const imageSize = 104;
  page.drawRectangle({
    x: imageX,
    y: imageY,
    width: imageSize,
    height: imageSize,
    color: rgb(0.075, 0.09, 0.12),
    borderColor: LINE,
    borderWidth: 0.6,
  });

  if (image) {
    const scale = Math.min((imageSize - 12) / image.width, (imageSize - 12) / image.height);
    page.drawImage(image, {
      x: imageX + (imageSize - image.width * scale) / 2,
      y: imageY + (imageSize - image.height * scale) / 2,
      width: image.width * scale,
      height: image.height * scale,
    });
  } else {
    page.drawText("SEM FOTO", { x: imageX + 28, y: imageY + 48, size: 8, font: bold, color: MUTED });
  }

  if (promotion) {
    page.drawRectangle({ x: imageX + 4, y: imageY + imageSize - 19, width: 54, height: 15, color: GOLD });
    page.drawText("PROMOCAO", {
      x: imageX + 9,
      y: imageY + imageSize - 14,
      size: 6.5,
      font: bold,
      color: BG,
    });
  }

  const textX = x + 132;
  const textWidth = width - 146;
  wrapText(product.name, bold, 10.5, textWidth, 3).forEach((line, index) => {
    page.drawText(line, { x: textX, y: y + 163 - index * 14, size: 10.5, font: bold, color: TEXT });
  });

  const meta = [product.category, product.quick_message].filter(Boolean).join(" - ");
  wrapText(meta || "Produto", regular, 7.3, textWidth, 3).forEach((line, index) => {
    page.drawText(line, { x: textX, y: y + 116 - index * 9, size: 7.3, font: regular, color: MUTED });
  });

  if (promotion) {
    const normalPrice = promotion.currentPrice > 0 ? promotion.currentPrice : num(product.sale_price);
    const oldPrice = safePdfText(money(normalPrice));
    page.drawText(oldPrice, { x: textX, y: y + 83, size: 7.5, font: regular, color: MUTED });
    const oldWidth = regular.widthOfTextAtSize(oldPrice, 7.5);
    page.drawLine({
      start: { x: textX, y: y + 86 },
      end: { x: textX + oldWidth, y: y + 86 },
      thickness: 0.7,
      color: MUTED,
    });
    page.drawText(safePdfText(money(promotion.promotionalPrice)), {
      x: textX,
      y: y + 63,
      size: 14.5,
      font: bold,
      color: GOLD,
    });
    const promoLabel = promotion.discountPct > 0
      ? `${promotion.promotionName} - ${Math.round(promotion.discountPct)}% OFF`
      : promotion.promotionName;
    wrapText(promoLabel, regular, 6.8, textWidth, 2).forEach((line, index) => {
      page.drawText(line, { x: textX, y: y + 49 - index * 8, size: 6.8, font: regular, color: TEXT });
    });
  } else {
    page.drawText("À vista", { x: textX, y: y + 79, size: 7.5, font: regular, color: MUTED });
    page.drawText(safePdfText(money(product.sale_price)), {
      x: textX,
      y: y + 62,
      size: 13.5,
      font: bold,
      color: GOLD,
    });
    if (num(product.installment_price) > 0 && num(product.installment_price) !== num(product.sale_price)) {
      page.drawText(safePdfText(`Prazo: ${money(product.installment_price)}`), {
        x: textX,
        y: y + 46,
        size: 7.5,
        font: regular,
        color: TEXT,
      });
    }
  }

  const available = num(product.available_quantity);
  const incoming = num(product.incoming_quantity);
  let stockLabel = `Disponível: ${available}`;
  let stockColor = GREEN;

  if (promotion) {
    const until = shortDate(promotion.endsOn);
    stockLabel = until ? `Oferta até ${until} - enquanto durar` : "Oferta - enquanto durar o estoque";
    stockColor = GOLD;
  } else if (available === 1) {
    stockLabel = "ÚLTIMA UNIDADE";
    stockColor = GOLD;
  } else if (available <= 0 && incoming > 0) {
    stockLabel = `A caminho: ${incoming}`;
    stockColor = GOLD;
  }

  page.drawText(safePdfText(stockLabel), {
    x: x + 14,
    y: y + 26,
    size: 8.2,
    font: bold,
    color: stockColor,
  });
}

export async function GET(request: NextRequest) {
  const access = await getCurrentUserAccess();
  if (!access.active || !access.canAccessSupplements) {
    return new Response("Acesso não autorizado", { status: 403 });
  }

  const includeIncoming = request.nextUrl.searchParams.get("includeIncoming") === "1";
  const supabase = await createClient();

  let query = supabase
    .from("product_catalog_commercial_sort")
    .select("id,name,category,image_url,sale_price,installment_price,available_quantity,incoming_quantity")
    .eq("active", true)
    .order("flagship_rank", { ascending: true })
    .order("availability_rank", { ascending: true })
    .order("category_rank", { ascending: true })
    .order("total_sold", { ascending: false })
    .order("name", { ascending: true });

  if (includeIncoming) query = query.or("available_quantity.gt.0,incoming_quantity.gt.0");
  else query = query.gt("available_quantity", 0);

  const [{ data, error }, promotionMap] = await Promise.all([
    query,
    getActiveSupplementPromotionMap(),
  ]);

  if (error) {
    return new Response(`Não foi possível gerar o catálogo: ${error.message}`, { status: 500 });
  }

  const baseProducts = ((data ?? []) as Array<Omit<CatalogProduct, "quick_message" | "promotion">>)
    .filter((product) => !product.name.toLocaleUpperCase("pt-BR").includes("COMBO"));
  const productIds = baseProducts.map((product) => product.id);
  let quickMessages = new Map<string, string | null>();

  if (productIds.length > 0) {
    const { data: detailRows, error: detailsError } = await supabase
      .from("product_details")
      .select("id,quick_message")
      .in("id", productIds);

    if (!detailsError) {
      quickMessages = new Map(
        (detailRows ?? []).map((row: { id: string; quick_message: string | null }) => [
          String(row.id),
          row.quick_message,
        ]),
      );
    }
  }

  const products: CatalogProduct[] = baseProducts.map((product) => ({
    ...product,
    name: safePdfText(product.name),
    category: safePdfText(product.category),
    quick_message: safePdfText(quickMessages.get(product.id) ?? "") || null,
    promotion: promotionMap.get(product.id) ?? null,
  }));

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let logo: PDFImage;
  try {
    const localLogo = await readFile(path.join(process.cwd(), "public", "candinho-suplementos-logo.png"));
    logo = await pdf.embedPng(await imageToPngBuffer(localLogo));
  } catch {
    const fallback = await sharp({
      create: {
        width: 640,
        height: 180,
        channels: 4,
        background: { r: 7, g: 9, b: 13, alpha: 0 },
      },
    }).png().toBuffer();
    logo = await pdf.embedPng(fallback);
  }

  const cover = pdf.addPage([PAGE_W, PAGE_H]);
  cover.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: BG });
  cover.drawRectangle({ x: 0, y: PAGE_H - 14, width: PAGE_W, height: 14, color: GOLD });
  const coverScale = Math.min(330 / logo.width, 105 / logo.height);
  cover.drawImage(logo, {
    x: 48,
    y: PAGE_H - 175,
    width: logo.width * coverScale,
    height: logo.height * coverScale,
  });
  cover.drawText(safePdfText("CATÁLOGO PREMIUM"), { x: 48, y: PAGE_H - 238, size: 10, font: bold, color: GOLD });
  cover.drawText(safePdfText("Produtos para sua evolução"), { x: 48, y: PAGE_H - 278, size: 27, font: bold, color: TEXT });
  cover.drawText(safePdfText("Seleção atualizada da Candinho Suplementos com preços e disponibilidade."), { x: 48, y: PAGE_H - 306, size: 10, font: regular, color: MUTED });
  cover.drawRectangle({ x: 48, y: PAGE_H - 420, width: PAGE_W - 96, height: 78, color: PANEL, borderColor: LINE, borderWidth: 0.7 });
  cover.drawText(safePdfText("ATUALIZADO"), { x: 66, y: PAGE_H - 368, size: 7, font: bold, color: MUTED });
  cover.drawText(safePdfText(datePtBr()), { x: 66, y: PAGE_H - 390, size: 13, font: bold, color: TEXT });
  cover.drawText(safePdfText("PRODUTOS"), { x: 232, y: PAGE_H - 368, size: 7, font: bold, color: MUTED });
  cover.drawText(String(products.length), { x: 232, y: PAGE_H - 392, size: 20, font: bold, color: GOLD });
  cover.drawText(safePdfText("DISPONIBILIDADE"), { x: 374, y: PAGE_H - 368, size: 7, font: bold, color: MUTED });
  cover.drawText(safePdfText(includeIncoming ? "Pronta entrega + a caminho" : "Pronta entrega"), { x: 374, y: PAGE_H - 390, size: 10, font: bold, color: TEXT });
  cover.drawText(safePdfText("QUALIDADE QUE ENTREGA RESULTADO."), { x: 48, y: 120, size: 12, font: bold, color: GOLD });
  cover.drawText(safePdfText("@candinhosuplementos  |  #VemDeCandin"), { x: 48, y: 98, size: 9, font: regular, color: MUTED });

  const cardsPerPage = 6;
  const positions = [
    [34, 524],
    [307, 524],
    [34, 306],
    [307, 306],
    [34, 88],
    [307, 88],
  ] as const;
  const imageCache = new Map<string, PDFImage | null>();

  for (let offset = 0; offset < products.length || offset === 0; offset += cardsPerPage) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    drawHeader(page, logo, bold, regular, includeIncoming);
    const chunk = products.slice(offset, offset + cardsPerPage);

    if (chunk.length === 0) {
      page.drawText("Nenhum produto disponível no momento.", {
        x: 160,
        y: 410,
        size: 14,
        font: bold,
        color: TEXT,
      });
    } else {
      const images = await Promise.all(
        chunk.map(async (product) => {
          if (!product.image_url) return null;
          if (imageCache.has(product.image_url)) return imageCache.get(product.image_url) ?? null;
          const embedded = await embedProductImage(pdf, product.image_url);
          imageCache.set(product.image_url, embedded);
          return embedded;
        }),
      );

      chunk.forEach((product, index) => {
        const [x, y] = positions[index];
        drawProductCard(page, product, images[index], x, y, regular, bold);
      });
    }

    drawFooter(page, regular, Math.floor(offset / cardsPerPage) + 2);
  }

  const bytes = await pdf.save();
  const filenameDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="catalogo-candinho-${filenameDate}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
