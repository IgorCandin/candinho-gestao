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
  return `<svg viewBox="0 0 95 67" role="img" aria-label="Código de barras ${value}" xmlns="http://www.w3.org/2000/svg"><rect width="95" height="67" fill="#fff"/>${bars}<text x="47.5" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" letter-spacing="1">${value}</text></svg>`;
}

function labelHtml(label: ProductLabel, copies: number) {
  const code = label.internalCode ?? "Sem código";
  const barcode = label.barcodeValue ?? "";
  const identity = label.operation === "Fitness" ? "CANDINHO FITNESS" : "CANDINHO SUPLEMENTOS";
  const variation = label.operation === "Fitness" ? `<p class="variation">${escapeHtml(label.size || "Único")} · ${escapeHtml(label.color || "Sem cor")}</p>` : "";
  const installment = label.installmentPrice && label.installmentPrice > label.cashPrice
    ? `<span>Prazo <b>${money(label.installmentPrice)}</b></span>`
    : "";
  const page = `<article class="label"><header><strong>${identity}</strong><small>ETIQUETA DE PRODUTO</small></header><h1>${escapeHtml(label.name)}</h1>${variation}<div class="prices"><span>À vista <b>${money(label.cashPrice)}</b></span>${installment}</div><div class="barcode">${ean13Svg(barcode)}</div><footer><b>Cód. ${escapeHtml(code)}</b><span>${barcode ? `EAN ${barcode}` : "Código gerado pela Candinho"}</span></footer></article>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Etiqueta - ${escapeHtml(label.name)}</title><style>@page{size:58mm 40mm;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#000;font-family:Arial,sans-serif}.label{width:58mm;height:40mm;padding:2.6mm 3mm;overflow:hidden;page-break-after:always;display:flex;flex-direction:column;border:0.25mm solid #000}header{display:flex;justify-content:space-between;align-items:flex-start;gap:5px}header strong{font-size:8.3pt;letter-spacing:.45px}header small{font-size:4.7pt;text-align:right;font-weight:700}h1{font-size:9.3pt;line-height:1.05;margin:1.8mm 0 0;max-height:20px;overflow:hidden}.variation{font-size:7pt;margin:1mm 0 0;font-weight:700}.prices{display:flex;gap:3mm;margin:1.5mm 0 0;font-size:6.5pt}.prices span{white-space:nowrap}.prices b{font-size:8pt}.barcode{margin:auto auto 0;width:38mm;height:17mm}.barcode svg{display:block;width:100%;height:100%}footer{display:flex;justify-content:space-between;gap:4px;font-size:5.3pt;white-space:nowrap}footer span{overflow:hidden;text-overflow:ellipsis}@media screen{body{padding:12px;background:#eee}.label{margin:0 auto 12px;background:#fff;box-shadow:0 1px 5px #999}}</style></head><body>${Array.from({ length: Math.max(1, Math.min(100, copies)) }, () => page).join("")}<script>window.addEventListener('load',()=>window.print())<\/script></body></html>`;
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
