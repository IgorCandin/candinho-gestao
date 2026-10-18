import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type ConsignmentProposal = {
  id: string; customerName: string; startedOn: string;
  items: Array<{ name: string; size: string; color: string; quantity: number; unitPrice: number }>;
};

/** A read-only document of the original consignment, not a new commercial entry. */
export async function buildConsignmentProposalPdf(proposal: ConsignmentProposal, logo?: Uint8Array) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.12, .15, .19), muted = rgb(.4, .44, .49), accent = rgb(.75, .12, .36);
  const width = 595.28, height = 841.89, margin = 38;
  const clean = (value: string) => Array.from(value.normalize("NFC").replace(/[\r\n\t]/g, " ").replace(/[–—]/g, "-")).map(char => {
    try { font.encodeText(char); return char; } catch { return "?"; }
  }).join("");
  const wrap = (value: string, maxWidth: number, size: number) => {
    const lines: string[] = []; let line = "";
    for (const char of clean(value)) {
      if (line && font.widthOfTextAtSize(line + char, size) > maxWidth) { lines.push(line); line = ""; }
      line += char;
    }
    if (line) lines.push(line);
    return lines;
  };
  const money = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;
  let page = pdf.addPage([width, height]), y = height - margin;
  const text = (value: string, x: number, at: number, size = 10, strong = false) => page.drawText(clean(value), { x, y: at, size, font: strong ? bold : font, color: ink });
  const newPage = () => { page = pdf.addPage([width, height]); y = height - margin; text("CANDINHO FITNESS · ORÇAMENTO DA CONSIGNAÇÃO", margin, y, 10, true); y -= 30; };
  const ensure = (space: number) => { if (y - space < 65) newPage(); };
  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: rgb(.035, .045, .06) });
  if (logo) {
    const image = await pdf.embedPng(logo);
    const scale = Math.min(175 / image.width, 48 / image.height);
    page.drawImage(image, { x: margin, y: height - 72, width: image.width * scale, height: image.height * scale });
  } else page.drawText("CANDINHO FITNESS", { x: margin, y: height - 55, size: 20, font: bold, color: rgb(1, 1, 1) });
  y = height - 130;
  text("Orçamento da consignação", margin, y, 20, true); y -= 28;
  for (const line of wrap(proposal.customerName, width - 2 * margin, 13)) { ensure(20); text(line, margin, y, 13, true); y -= 18; }
  const [year, month, day] = proposal.startedOn.slice(0, 10).split("-");
  text(`Data: ${day}/${month}/${year} · Referência: ${proposal.id.slice(0, 8).toUpperCase()}`, margin, y, 9); y -= 32;
  let totalCents = 0;
  for (const item of proposal.items) {
    const lines = wrap(`${item.name} · ${item.size} · ${item.color}`, width - 2 * margin - 20, 10);
    ensure(54);
    for (const line of lines) { ensure(34); text(line, margin + 10, y, 10, true); y -= 15; }
    const lineCents = Math.round(item.unitPrice * 100) * item.quantity;
    totalCents += lineCents;
    text(`${item.quantity} un. x ${money(item.unitPrice)}`, margin + 10, y, 9);
    const amount = money(lineCents / 100);
    text(amount, width - margin - bold.widthOfTextAtSize(amount, 11), y, 11, true);
    y -= 14;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: .5, color: rgb(.83, .85, .88) });
    y -= 23;
  }
  ensure(100);
  page.drawText(`TOTAL: ${money(totalCents / 100)}`, { x: margin, y, size: 18, font: bold, color: accent }); y -= 28;
  for (const line of wrap("Peças e preços registrados no envio desta consignação. Este orçamento não é comprovante de pagamento.", width - 2 * margin, 9)) { text(line, margin, y, 9); y -= 14; }
  for (const [index, sheet] of pdf.getPages().entries()) {
    sheet.drawText(`Candinho Fitness · ${index + 1}/${pdf.getPageCount()}`, { x: margin, y: 25, size: 8, font, color: muted });
  }
  return pdf.save();
}
