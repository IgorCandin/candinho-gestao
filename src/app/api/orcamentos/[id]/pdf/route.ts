import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const W = 595.28;
const H = 841.89;
const M = 36;
const BG = rgb(0.022, 0.028, 0.04);
const HEADER = rgb(0.016, 0.02, 0.029);
const PANEL = rgb(0.052, 0.063, 0.086);
const PANEL_ALT = rgb(0.064, 0.076, 0.101);
const LINE = rgb(0.14, 0.16, 0.2);
const TEXT = rgb(0.965, 0.972, 0.985);
const MUTED = rgb(0.61, 0.65, 0.71);
const GOLD = rgb(0.88, 0.68, 0.27);
const GOLD_SOFT = rgb(0.18, 0.135, 0.055);
const GREEN = rgb(0.35, 0.84, 0.55);

function oneRelation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown> | undefined) ?? null;
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function safe(value: unknown) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u2023\u25E6]/g, "-")
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 10 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255);
    })
    .join("");
}

function money(value: unknown) {
  return `R$ ${Number(value ?? 0).toFixed(2).replace(".", ",")}`;
}

function date(value: unknown) {
  if (typeof value !== "string" || !value) return "-";
  const [y, m, d] = value.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number, maxLines = 3) {
  const words = safe(text).trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let consumed = 0;

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      consumed += 1;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    consumed += 1;
    if (lines.length >= maxLines - 1) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (consumed < words.length && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length > 3 && font.widthOfTextAtSize(`${last}...`, size) > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}...`;
  }
  return lines.length ? lines : [""];
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.canAccessSupplements) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from("sales_quotes").select(`
    id,quote_number,status,quoted_on,valid_until,gross_amount,discount_amount,total_amount,
    gift_quantity,payment_mode,payment_method,payment_due_on,notes,
    customer:customers(name,phone,city,reference),
    gift:products!sales_quotes_gift_product_id_fkey(name),
    items:sales_quote_items(quantity,unit_price,total_price,product:products(name,category))
  `).eq("id", id).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });

  const row = data as Record<string, unknown>;
  const customer = oneRelation(row.customer);
  const gift = oneRelation(row.gift);
  const items = Array.isArray(row.items) ? row.items as Record<string, unknown>[] : [];

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let logo: PDFImage | null = null;
  try {
    const webp = await readFile(path.join(process.cwd(), "public", "candinho-suplementos-logo.png"));
    logo = await pdf.embedPng(await sharp(webp).png().toBuffer());
  } catch {
    logo = null;
  }

  let page!: PDFPage;
  let pageNo = 0;
  let y = 0;

  function drawFooter() {
    page.drawLine({ start: { x: M, y: 29 }, end: { x: W - M, y: 29 }, thickness: 0.6, color: LINE });
    page.drawText(safe("Candinho Suplementos  |  @candinhosuplementos  |  #VemDeCandin"), {
      x: M, y: 14, size: 7.2, font: regular, color: MUTED,
    });
    const number = String(pageNo);
    page.drawText(number, { x: W - M - regular.widthOfTextAtSize(number, 7.2), y: 14, size: 7.2, font: regular, color: MUTED });
  }

  function drawTopChrome(continuation: boolean) {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG });
    page.drawRectangle({ x: 0, y: H - 94, width: W, height: 94, color: HEADER });
    page.drawRectangle({ x: 0, y: 0, width: 4, height: H, color: GOLD });

    if (logo) {
      const scale = Math.min(178 / logo.width, 48 / logo.height);
      page.drawImage(logo, { x: M, y: H - 70, width: logo.width * scale, height: logo.height * scale });
    } else {
      page.drawText("CANDINHO", { x: M, y: H - 58, size: 22, font: bold, color: TEXT });
      page.drawText("SUPLEMENTOS", { x: M, y: H - 72, size: 7.5, font: bold, color: GOLD });
    }

    const badge = `ORÇAMENTO #${String(row.quote_number ?? "")}`;
    const badgeWidth = bold.widthOfTextAtSize(badge, 9) + 24;
    page.drawRectangle({ x: W - M - badgeWidth, y: H - 62, width: badgeWidth, height: 28, color: GOLD_SOFT, borderColor: GOLD, borderWidth: 0.7 });
    page.drawText(safe(badge), { x: W - M - badgeWidth + 12, y: H - 52, size: 9, font: bold, color: GOLD });
    page.drawText(continuation ? "CONTINUAÇÃO DA PROPOSTA" : "PROPOSTA COMERCIAL", {
      x: W - M - 150, y: H - 78, size: 6.8, font: bold, color: MUTED,
    });
  }

  function newPage(continuation = false) {
    if (pageNo > 0) drawFooter();
    page = pdf.addPage([W, H]);
    pageNo += 1;
    drawTopChrome(continuation);
    y = H - 116;
  }

  function ensure(height: number, continuationTitle?: string) {
    if (y - height >= 52) return;
    newPage(true);
    if (continuationTitle) {
      sectionTitle(continuationTitle, "Continuação");
    }
  }

  function sectionTitle(title: string, subtitle?: string) {
    ensure(34);
    page.drawRectangle({ x: M, y: y - 2, width: 26, height: 2.2, color: GOLD });
    page.drawText(safe(title.toUpperCase()), { x: M + 34, y: y - 5, size: 8.5, font: bold, color: GOLD });
    if (subtitle) {
      page.drawText(safe(subtitle), { x: M + 34 + bold.widthOfTextAtSize(safe(title.toUpperCase()), 8.5) + 10, y: y - 5, size: 7.5, font: regular, color: MUTED });
    }
    y -= 24;
  }

  function metaCard(x: number, top: number, width: number, label: string, value: string, accent = false) {
    page.drawRectangle({ x, y: top - 45, width, height: 45, color: PANEL, borderColor: accent ? GOLD : LINE, borderWidth: 0.7 });
    page.drawText(safe(label.toUpperCase()), { x: x + 11, y: top - 15, size: 6.3, font: bold, color: MUTED });
    page.drawText(safe(value), { x: x + 11, y: top - 32, size: 9.3, font: bold, color: accent ? GOLD : TEXT });
  }

  function drawProductsHeader() {
    page.drawRectangle({ x: M, y: y - 23, width: W - M * 2, height: 23, color: PANEL_ALT });
    page.drawText("ITEM", { x: M + 10, y: y - 15, size: 6.6, font: bold, color: MUTED });
    page.drawText("PRODUTO", { x: M + 48, y: y - 15, size: 6.6, font: bold, color: MUTED });
    page.drawText("QTD.", { x: W - M - 170, y: y - 15, size: 6.6, font: bold, color: MUTED });
    page.drawText("UNITÁRIO", { x: W - M - 128, y: y - 15, size: 6.6, font: bold, color: MUTED });
    page.drawText("TOTAL", { x: W - M - 48, y: y - 15, size: 6.6, font: bold, color: MUTED });
    y -= 26;
  }

  newPage(false);

  const customerName = safe(customer?.name ?? "Cliente não informado");
  const cityReference = [customer?.city, customer?.reference].filter(Boolean).map(safe).join(" · ");
  const statusLabel = String(row.status) === "confirmed" ? "Confirmado" : "Em orçamento";

  page.drawRectangle({ x: M, y: y - 76, width: W - M * 2, height: 76, color: PANEL });
  page.drawText("PREPARADO PARA", { x: M + 16, y: y - 18, size: 6.5, font: bold, color: GOLD });
  wrap(customerName, bold, 17, 340, 2).forEach((line, index) => {
    page.drawText(line, { x: M + 16, y: y - 40 - index * 19, size: 17, font: bold, color: TEXT });
  });
  if (cityReference) page.drawText(cityReference, { x: M + 16, y: y - 65, size: 7.8, font: regular, color: MUTED });
  if (typeof customer?.phone === "string" && customer.phone) {
    const phone = safe(customer.phone);
    page.drawText(phone, { x: W - M - 16 - regular.widthOfTextAtSize(phone, 8.5), y: y - 32, size: 8.5, font: regular, color: MUTED });
  }
  page.drawText(safe(statusLabel.toUpperCase()), { x: W - M - 16 - bold.widthOfTextAtSize(safe(statusLabel.toUpperCase()), 7.2), y: y - 55, size: 7.2, font: bold, color: String(row.status) === "confirmed" ? GREEN : GOLD });
  y -= 92;

  const gap = 9;
  const metaWidth = (W - M * 2 - gap * 2) / 3;
  const metaTop = y;
  metaCard(M, metaTop, metaWidth, "Data do orçamento", date(row.quoted_on));
  metaCard(M + metaWidth + gap, metaTop, metaWidth, "Válido até", date(row.valid_until), true);
  metaCard(M + (metaWidth + gap) * 2, metaTop, metaWidth, "Situação", statusLabel);
  y -= 60;

  sectionTitle("Produtos", "Itens incluídos nesta proposta");
  drawProductsHeader();

  for (const [index, item] of items.entries()) {
    const product = oneRelation(item.product);
    const productName = safe(product?.name ?? "Produto");
    const category = safe(product?.category ?? "");
    const qty = Number(item.quantity ?? 0);
    const unit = Number(item.unit_price ?? 0);
    const total = Number(item.total_price ?? qty * unit);
    const rowHeight = 50;

    if (y - rowHeight < 64) {
      newPage(true);
      sectionTitle("Produtos", "Continuação");
      drawProductsHeader();
    }

    const rowColor = index % 2 === 0 ? PANEL : PANEL_ALT;
    page.drawRectangle({ x: M, y: y - rowHeight, width: W - M * 2, height: rowHeight, color: rowColor, borderColor: LINE, borderWidth: 0.45 });

    const itemNo = String(index + 1).padStart(2, "0");
    page.drawText(itemNo, { x: M + 12, y: y - 29, size: 9.5, font: bold, color: GOLD });

    const productLines = wrap(productName, bold, 9.5, 262, 2);
    productLines.forEach((line, lineIndex) => {
      page.drawText(line, { x: M + 48, y: y - 18 - lineIndex * 11.5, size: 9.5, font: bold, color: TEXT });
    });
    if (category) page.drawText(category, { x: M + 48, y: y - 42, size: 6.8, font: regular, color: MUTED });

    page.drawText(String(qty), { x: W - M - 162, y: y - 28, size: 8.5, font: bold, color: TEXT });
    const unitText = money(unit);
    page.drawText(unitText, { x: W - M - 84 - regular.widthOfTextAtSize(unitText, 8.2), y: y - 28, size: 8.2, font: regular, color: TEXT });
    const totalText = money(total);
    page.drawText(totalText, { x: W - M - 10 - bold.widthOfTextAtSize(totalText, 9.3), y: y - 28, size: 9.3, font: bold, color: GOLD });
    y -= rowHeight + 5;
  }

  ensure(112, "Resumo");
  y -= 5;
  const summaryHeight = 92;
  page.drawRectangle({ x: M, y: y - summaryHeight, width: W - M * 2, height: summaryHeight, color: PANEL, borderColor: GOLD, borderWidth: 0.8 });
  page.drawRectangle({ x: M, y: y - summaryHeight, width: 4, height: summaryHeight, color: GOLD });
  page.drawText("RESUMO COMERCIAL", { x: M + 16, y: y - 20, size: 6.8, font: bold, color: MUTED });
  page.drawText("Subtotal", { x: M + 16, y: y - 43, size: 8, font: regular, color: MUTED });
  page.drawText(money(row.gross_amount), { x: M + 116, y: y - 43, size: 8.6, font: bold, color: TEXT });

  const discount = Number(row.discount_amount ?? 0);
  if (discount > 0) {
    page.drawText("Desconto", { x: M + 16, y: y - 62, size: 8, font: regular, color: MUTED });
    page.drawText(`- ${money(discount)}`, { x: M + 116, y: y - 62, size: 8.6, font: bold, color: GREEN });
  }

  page.drawText("TOTAL FINAL", { x: W - M - 175, y: y - 23, size: 6.8, font: bold, color: GOLD });
  const finalText = money(row.total_amount);
  page.drawText(finalText, { x: W - M - 16 - bold.widthOfTextAtSize(finalText, 21), y: y - 57, size: 21, font: bold, color: GOLD });
  page.drawText("Proposta válida conforme condições abaixo", { x: W - M - 175, y: y - 75, size: 6.8, font: regular, color: MUTED });
  y -= summaryHeight + 18;

  sectionTitle("Condições", "Pagamento, brinde e observações");
  const paymentMode = String(row.payment_mode ?? "receivable");
  const paymentCondition = paymentMode === "paid" ? "Pago" : paymentMode === "combined" ? `Combinado para ${date(row.payment_due_on)}` : "A receber";
  const conditionWidth = (W - M * 2 - gap) / 2;
  const conditionTop = y;
  metaCard(M, conditionTop, conditionWidth, "Forma de pagamento", typeof row.payment_method === "string" && row.payment_method ? row.payment_method : "Não informada");
  metaCard(M + conditionWidth + gap, conditionTop, conditionWidth, "Condição", paymentCondition);
  y -= 60;

  if (gift && Number(row.gift_quantity ?? 0) > 0) {
    ensure(52);
    page.drawRectangle({ x: M, y: y - 40, width: W - M * 2, height: 40, color: GOLD_SOFT, borderColor: GOLD, borderWidth: 0.6 });
    page.drawText("BRINDE", { x: M + 12, y: y - 15, size: 6.5, font: bold, color: GOLD });
    page.drawText(safe(`${String(gift.name)}${Number(row.gift_quantity) > 1 ? ` · ${Number(row.gift_quantity)} un.` : ""}`), { x: M + 70, y: y - 24, size: 8.8, font: bold, color: TEXT });
    y -= 50;
  }

  if (typeof row.notes === "string" && row.notes.trim()) {
    const lines = wrap(row.notes, regular, 8, W - M * 2 - 28, 7);
    const noteHeight = 30 + lines.length * 11;
    ensure(noteHeight + 8);
    page.drawRectangle({ x: M, y: y - noteHeight, width: W - M * 2, height: noteHeight, color: PANEL, borderColor: LINE, borderWidth: 0.55 });
    page.drawText("OBSERVAÇÕES", { x: M + 12, y: y - 16, size: 6.5, font: bold, color: MUTED });
    lines.forEach((line, index) => page.drawText(line, { x: M + 12, y: y - 32 - index * 11, size: 8, font: regular, color: TEXT }));
    y -= noteHeight + 10;
  }

  ensure(58);
  page.drawRectangle({ x: M, y: y - 48, width: W - M * 2, height: 48, color: HEADER, borderColor: LINE, borderWidth: 0.5 });
  page.drawText("Obrigado pela preferência.", { x: M + 14, y: y - 21, size: 10.5, font: bold, color: TEXT });
  page.drawText("Qualidade que entrega resultado.", { x: M + 14, y: y - 37, size: 8, font: regular, color: GOLD });
  page.drawText("CANDINHO SUPLEMENTOS", { x: W - M - 14 - bold.widthOfTextAtSize("CANDINHO SUPLEMENTOS", 7.5), y: y - 29, size: 7.5, font: bold, color: MUTED });

  drawFooter();

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="orcamento-candinho-${String(row.quote_number ?? id)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
