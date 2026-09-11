"use client";

import { Printer } from "lucide-react";

export type ProductLabel = {
  operation: "Suplementos" | "Fitness";
  name: string;
  internalCode: string | null;
  barcodeValue: string | null;
  cashPrice: number;
  installmentPrice?: number | null;
  size?: string | null;
  color?: string | null;
};

const LEFT_A = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const LEFT_B = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const RIGHT_C = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["AAAAAA", "AABABB", "AABBAB", "AABBBA", "ABAABB", "ABBAAB", "ABBBAA", "ABABBA", "ABBAAA", "ABBABA"];

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function ean13Svg(value: string) {
  if (!/^\d{13}$/.test(value)) return "";
  const digits = value.split("").map(Number);
  const pattern = ["101"];
  const parity = PARITY[digits[0]];
  for (let index = 1; index <= 6; index += 1) pattern.push((parity[index - 1] === "A" ? LEFT_A : LEFT_B)[digits[index]]);
  pattern.push("01010");
  for (let index = 7; index <= 12; index += 1) pattern.push(RIGHT_C[digits[index]]);
  pattern.push("101");
  const modules = pattern.join("");
  let bars = "";
  for (let index = 0; index < modules.length; index += 1) {
    if (modules[index] !== "1") continue;
    const guard = index < 3 || (index >= 45 && index < 50) || index >= 92;
    bars += `<rect x="${index}" y="0" width="1" height="${guard ? 54 : 46}" fill="#000"/>`;
  }
  return `<svg viewBox="0 0 95 54" role="img" aria-label="Código de barras ${value}" xmlns="http://www.w3.org/2000/svg"><rect width="95" height="54" fill="#fff"/>${bars}</svg>`;
}

function labelHtml(label: ProductLabel, copies: number) {
  const code = label.internalCode ?? "Sem código";
  const barcode = label.barcodeValue ?? "";
  const logoUrl = `${window.location.origin}${label.operation === "Fitness" ? "/labels/candinho-fitness-label-black.png" : "/labels/candinho-suplementos-label-black.png"}`;
  const variation = label.operation === "Fitness" ? `<p class="variation">${escapeHtml(label.size || "Único")} · ${escapeHtml(label.color || "Sem cor")}</p>` : "";
  const installment = label.installmentPrice && label.installmentPrice > label.cashPrice
    ? `<span>Prazo <b>${money(label.installmentPrice)}</b></span>`
    : "";
  const page = `<article class="label"><section class="label-head"><img src="${escapeHtml(logoUrl)}" alt="Logo ${escapeHtml(label.operation)}"/></section><section class="product"><span>PRODUTO</span><h1>${escapeHtml(label.name)}</h1>${variation}</section><section class="prices"><div><span>À VISTA</span><b>${money(label.cashPrice)}</b></div>${installment ? `<div><span>A PRAZO</span><b>${money(label.installmentPrice ?? label.cashPrice)}</b></div>` : ""}</section><section class="barcode"><span>CÓDIGO DE BARRAS · EAN</span>${ean13Svg(barcode)}<div class="codes"><strong>EAN ${escapeHtml(barcode)}</strong><strong>INT. ${escapeHtml(code)}</strong></div></section><footer><strong>WhatsApp: (32) 9 9831-8385</strong><span>Guarde esta etiqueta para consultar o produto e o preço.</span></footer></article>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Etiqueta - ${escapeHtml(label.name)}</title><style>@page{size:80mm 140mm;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#000;font-family:Arial,sans-serif}.label{width:80mm;height:136mm;padding:6mm 3.5mm 3mm;display:grid;grid-template-rows:15mm minmax(34mm,1fr) 22mm 31mm 15mm;gap:2mm;break-inside:avoid;page-break-inside:avoid;page-break-after:always;background:#fff}.label>*{min-height:0;border:.35mm solid #000;border-radius:4mm;break-inside:avoid;page-break-inside:avoid}.label-head{border:0;padding:0;display:flex;align-items:center;justify-content:center}.label-head img{display:block;width:55mm;max-height:14mm;object-fit:contain}.product{padding:4mm}.product h1{margin:1.5mm 0 0;font-size:17pt;line-height:1.1;overflow-wrap:anywhere;word-break:break-word}.variation{margin:1.7mm 0 0;font-size:10pt;font-weight:800}.product>span,.prices span,.barcode>span{font-size:7pt;font-weight:900;letter-spacing:.55px}.prices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.prices div{display:grid;align-content:center;gap:1mm;padding:3.5mm}.prices div+div{border-left:.35mm solid #000}.prices b{font-size:16.5pt;line-height:1.05;white-space:nowrap}.barcode{padding:2.5mm;text-align:center;display:grid;justify-items:center;align-content:start;gap:.7mm}.barcode svg{display:block;width:60mm;height:23mm}.codes{display:grid;grid-template-columns:1fr 1fr;width:100%;gap:2mm}.codes strong{font-size:7pt;letter-spacing:.3px;white-space:nowrap}footer{padding:2.3mm;display:grid;gap:.7mm;text-align:center;align-content:center}footer strong{font-size:10pt}footer span{font-size:7pt;line-height:1.2}@media screen{body{padding:14px;background:#eee}.label{margin:0 auto 14px;box-shadow:0 1px 6px #777}}</style></head><body>${Array.from({ length: Math.max(1, Math.min(100, copies)) }, () => page).join("")}<script>window.addEventListener('load',()=>window.print())<\/script></body></html>`;
}

export function ProductLabelPrintButton({ label, copies = 1, className = "button ghost" }: { label: ProductLabel; copies?: number; className?: string }) {
  const ready = Boolean(label.internalCode && label.barcodeValue);
  return <button type="button" className={className} disabled={!ready} title={ready ? "Abrir etiqueta para impressão" : "Este produto ainda não recebeu um código"} onClick={() => {
    const popup = window.open("", "_blank");
    if (!popup) return;
    popup.opener = null;
    popup.document.open();
    popup.document.write(labelHtml(label, copies));
    popup.document.close();
  }}><Printer size={16} />Imprimir etiqueta</button>;
}
