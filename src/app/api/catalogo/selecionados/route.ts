import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  image_url: string | null;
  sale_price: number | string;
  installment_price: number | string;
  available_quantity: number | string;
  incoming_quantity: number | string;
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

function safeText(value: unknown) {
  const normalized = String(value ?? "")
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...");

  return Array.from(normalized)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return char === "\n" || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff);
    })
    .join("")
    .trim();
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number, maxLines = 2) {
  const words = safeText(text).split(/\s+/).filter(Boolean);
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
  return lines;
}

async function imageToPngBuffer(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(6500) });
  if (!response.ok) throw new Error("Imagem indisponível");
  return sharp(Buffer.from(await response.arrayBuffer()))
    .resize({ width: 320, height: 320, fit: "contain", background: { r: 15, g: 19, b: 27, alpha: 0 } })
    .png()
    .toBuffer();
}

async function embedImage(pdf: PDFDocument, url: string | null): Promise<PDFImage | null> {
  if (!url) return null;
  try {
    return await pdf.embedPng(await imageToPngBuffer(url));
  } catch {
    return null;
  }
}

function drawHeader(page: PDFPage, logo: PDFImage, bold: PDFFont, regular: PDFFont, includeIncoming: boolean) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: BG });

  const logoScale = Math.min(205 / logo.width, 60 / logo.height);
  page.drawImage(logo, {
    x: 34,
    y: PAGE_H - 82,
    width: logo.width * logoScale,
    height: logo.height * logoScale,
  });

  page.drawText("CATALOGO SELECIONADO", {
    x: 330,
    y: PAGE_H - 50,
    size: 14,
    font: bold,
    color: TEXT,
  });

  page.drawText(safeText(`Preparado em ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date())}`), {
    x: 330,
    y: PAGE_H - 68,
    size: 8.5,
    font: regular,
    color: MUTED,
  });

  if (includeIncoming) {
    page.drawText("Inclui produtos a caminho", {
      x: 330,
      y: PAGE_H - 81,
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

  page.drawText("Candinho Suplementos - Qualidade que entrega resultado.", {
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

function drawCard(
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

  const textX = x + 132;
  const textWidth = width - 146;

  wrapText(product.name, bold, 10.5, textWidth, 3).forEach((line, index) => {
    page.drawText(line, { x: textX, y: y + 163 - index * 14, size: 10.5, font: bold, color: TEXT });
  });

  wrapText([product.category, product.brand].filter(Boolean).join(" - "), regular, 7.5, textWidth, 2).forEach((line, index) => {
    page.drawText(line, { x: textX, y: y + 113 - index * 10, size: 7.5, font: regular, color: MUTED });
  });

  page.drawText("A vista", { x: textX, y: y + 79, size: 7.5, font: regular, color: MUTED });
  page.drawText(safeText(money(product.sale_price)), { x: textX, y: y + 62, size: 13.5, font: bold, color: GOLD });

  if (num(product.installment_price) > 0 && num(product.installment_price) !== num(product.sale_price)) {
    page.drawText(safeText(`Prazo: ${money(product.installment_price)}`), {
      x: textX,
      y: y + 46,
      size: 7.5,
      font: regular,
      color: TEXT,
    });
  }

  const available = num(product.available_quantity);
  const incoming = num(product.incoming_quantity);
  let stockLabel = `Disponivel: ${available}`;
  let stockColor = GREEN;

  if (available === 1) {
    stockLabel = "ULTIMA UNIDADE";
    stockColor = GOLD;
  } else if (available <= 0 && incoming > 0) {
    stockLabel = `A caminho: ${incoming}`;
    stockColor = GOLD;
  }

  page.drawText(stockLabel, { x: x + 14, y: y + 26, size: 8.5, font: bold, color: stockColor });
}

export async function GET(request: NextRequest) {
  const access = await getCurrentUserAccess();
  if (!access.active || !access.canAccessSupplements) {
    return new Response("Acesso nao autorizado", { status: 403 });
  }

  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return new Response("Selecione ao menos um produto.", { status: 400 });
  }

  const includeIncoming = request.nextUrl.searchParams.get("includeIncoming") === "1";
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_catalog_commercial_sort")
    .select("id,name,category,brand,image_url,sale_price,installment_price,available_quantity,incoming_quantity")
    .eq("active", true)
    .in("id", ids);

  if (error) {
    return new Response(`Nao foi possivel gerar o catalogo: ${error.message}`, { status: 500 });
  }

  const byId = new Map(((data ?? []) as CatalogProduct[]).map((product) => [product.id, product]));
  const products = ids
    .map((id) => byId.get(id))
    .filter((product): product is CatalogProduct => Boolean(product))
    .filter((product) => includeIncoming ? num(product.available_quantity) > 0 || num(product.incoming_quantity) > 0 : num(product.available_quantity) > 0);

  if (products.length === 0) {
    return new Response("Nenhum dos produtos selecionados esta disponivel para este filtro.", { status: 400 });
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const logoBuffer = await readFile(path.join(process.cwd(), "public", "candinho-suplementos-logo.png"));
  const logo = await pdf.embedPng(logoBuffer);

  const imageMap = new Map<string, PDFImage | null>();
  await Promise.all(
    products.map(async (product) => {
      imageMap.set(product.id, await embedImage(pdf, product.image_url));
    }),
  );

  const cardsPerPage = 6;
  for (let index = 0; index < products.length; index += cardsPerPage) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    const pageNumber = pdf.getPageCount();
    drawHeader(page, logo, bold, regular, includeIncoming);

    const pageProducts = products.slice(index, index + cardsPerPage);
    pageProducts.forEach((product, localIndex) => {
      const column = localIndex % 2;
      const row = Math.floor(localIndex / 2);
      const x = column === 0 ? 34 : 307;
      const y = 522 - row * 218;
      drawCard(page, product, imageMap.get(product.id) ?? null, x, y, regular, bold);
    });

    drawFooter(page, regular, pageNumber);
  }

  const bytes = await pdf.save();
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="catalogo-selecionado-candinho.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
