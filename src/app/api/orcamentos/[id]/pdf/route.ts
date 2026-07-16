import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 46;
const GOLD = rgb(0.84, 0.64, 0.25);
const DARK = rgb(0.035, 0.045, 0.065);
const TEXT = rgb(0.08, 0.09, 0.12);
const MUTED = rgb(0.38, 0.41, 0.47);
const LINE = rgb(0.86, 0.87, 0.89);

function oneRelation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown> | undefined) ?? null;
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function money(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function date(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) current = test;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.canAccessSupplements) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_quotes")
    .select(`
      id,quote_number,status,quoted_on,valid_until,gross_amount,discount_amount,total_amount,
      gift_quantity,payment_mode,payment_method,payment_due_on,notes,
      customer:customers(name,phone),
      gift:products!sales_quotes_gift_product_id_fkey(name),
      items:sales_quote_items(quantity,unit_price,total_price,product:products(name))
    `)
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });

  const row = data as Record<string, unknown>;
  const customer = oneRelation(row.customer);
  const gift = oneRelation(row.gift);
  const items = Array.isArray(row.items) ? row.items as Record<string, unknown>[] : [];

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  try {
    const logoWebp = await readFile(path.join(process.cwd(), "public", "candinho-suplementos-logo.webp"));
    const logoPng = await sharp(logoWebp).png().toBuffer();
    logo = await pdf.embedPng(logoPng);
  } catch {
    logo = null;
  }

  let page!: PDFPage;
  let y = 0;

  function newPage(first = false) {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 122, width: PAGE_WIDTH, height: 122, color: DARK });
    if (logo) {
      const scale = Math.min(220 / logo.width, 68 / logo.height);
      const width = logo.width * scale;
      const height = logo.height * scale;
      page.drawImage(logo, { x: (PAGE_WIDTH - width) / 2, y: PAGE_HEIGHT - 94, width, height });
    } else {
      page.drawText("CANDINHO SUPLEMENTOS", { x: MARGIN, y: PAGE_HEIGHT - 72, size: 22, font: bold, color: GOLD });
    }
    if (first) {
      page.drawText(`ORÇAMENTO Nº ${String(row.quote_number ?? "")}`, { x: MARGIN, y: PAGE_HEIGHT - 154, size: 15, font: bold, color: TEXT });
      page.drawText(`Data: ${date(row.quoted_on)}   |   Validade: ${date(row.valid_until)}`, { x: MARGIN, y: PAGE_HEIGHT - 176, size: 10.5, font: regular, color: MUTED });
      page.drawText(`Cliente: ${String(customer?.name ?? "Cliente não informado")}`, { x: MARGIN, y: PAGE_HEIGHT - 198, size: 11, font: bold, color: TEXT });
      if (typeof customer?.phone === "string" && customer.phone) page.drawText(`Telefone: ${customer.phone}`, { x: MARGIN, y: PAGE_HEIGHT - 216, size: 10.5, font: regular, color: MUTED });
      y = PAGE_HEIGHT - 250;
    } else {
      page.drawText(`ORÇAMENTO Nº ${String(row.quote_number ?? "")} · continuação`, { x: MARGIN, y: PAGE_HEIGHT - 154, size: 13, font: bold, color: TEXT });
      y = PAGE_HEIGHT - 186;
    }
  }

  function ensureSpace(height: number) {
    if (y - height < 86) newPage(false);
  }

  function divider() {
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.8, color: LINE });
    y -= 18;
  }

  function labelValue(label: string, value: string, options?: { boldValue?: boolean }) {
    ensureSpace(26);
    page.drawText(label, { x: MARGIN, y, size: 10, font: bold, color: TEXT });
    const labelWidth = bold.widthOfTextAtSize(label, 10) + 7;
    page.drawText(value, { x: MARGIN + labelWidth, y, size: 10, font: options?.boldValue ? bold : regular, color: TEXT });
    y -= 19;
  }

  newPage(true);
  page!.drawText("PRODUTOS DO ORÇAMENTO", { x: MARGIN, y, size: 12.5, font: bold, color: TEXT });
  y -= 18;
  divider();

  for (const [index, item] of items.entries()) {
    const product = oneRelation(item.product);
    const name = String(product?.name ?? "Produto");
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unit_price ?? 0);
    const totalPrice = Number(item.total_price ?? quantity * unitPrice);
    const nameLines = wrapText(`${index + 1}. ${name}`, bold, 10.5, PAGE_WIDTH - MARGIN * 2 - 10);
    ensureSpace(nameLines.length * 15 + 38);
    for (const line of nameLines) {
      page!.drawText(line, { x: MARGIN, y, size: 10.5, font: bold, color: TEXT });
      y -= 15;
    }
    const detail = quantity === 1
      ? `Valor unitário: ${money(unitPrice)}`
      : `Valor unitário: ${money(unitPrice)}   |   Quantidade: ${quantity}   |   Total do item: ${money(totalPrice)}`;
    const detailLines = wrapText(detail, regular, 9.5, PAGE_WIDTH - MARGIN * 2);
    for (const line of detailLines) {
      page!.drawText(line, { x: MARGIN, y, size: 9.5, font: regular, color: MUTED });
      y -= 14;
    }
    y -= 8;
  }

  divider();
  if (Number(row.discount_amount ?? 0) > 0) {
    labelValue("Subtotal:", money(row.gross_amount));
    labelValue("Desconto:", `- ${money(row.discount_amount)}`);
  }
  ensureSpace(30);
  page!.drawText("Total final:", { x: MARGIN, y, size: 12, font: bold, color: TEXT });
  page!.drawText(money(row.total_amount), { x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(money(row.total_amount), 16), y: y - 2, size: 16, font: bold, color: GOLD });
  y -= 34;

  const paymentMode = String(row.payment_mode ?? "receivable");
  const paymentCondition = paymentMode === "paid" ? "Pago" : paymentMode === "combined" ? `Pagamento combinado${row.payment_due_on ? ` para ${date(row.payment_due_on)}` : ""}` : "A receber";
  labelValue("Forma de pagamento:", typeof row.payment_method === "string" && row.payment_method ? row.payment_method : "Não informada");
  labelValue("Condição do pagamento:", paymentCondition);
  if (gift && Number(row.gift_quantity ?? 0) > 0) labelValue("Brinde:", `${String(gift.name)}${Number(row.gift_quantity) > 1 ? ` · ${Number(row.gift_quantity)} un.` : ""}`);

  if (typeof row.notes === "string" && row.notes.trim()) {
    y -= 5;
    ensureSpace(48);
    page!.drawText("Observações:", { x: MARGIN, y, size: 10, font: bold, color: TEXT });
    y -= 16;
    for (const line of wrapText(row.notes, regular, 9.5, PAGE_WIDTH - MARGIN * 2)) {
      ensureSpace(15);
      page!.drawText(line, { x: MARGIN, y, size: 9.5, font: regular, color: MUTED });
      y -= 14;
    }
  }

  y -= 14;
  divider();
  ensureSpace(70);
  page!.drawText("Obrigado pela preferência!", { x: MARGIN, y, size: 11.5, font: bold, color: TEXT });
  y -= 25;
  page!.drawText("Candinho Suplementos® | @candinhosuplementos", { x: MARGIN, y, size: 9.5, font: bold, color: GOLD });
  y -= 15;
  page!.drawText("Suplementação estratégica para sua evolução.  #VemDeCandin", { x: MARGIN, y, size: 9, font: regular, color: MUTED });

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
