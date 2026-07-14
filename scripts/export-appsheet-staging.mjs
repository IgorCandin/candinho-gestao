import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { once } from "node:events";
import ExcelJS from "exceljs";

const DEFAULT_SHEETS = [
  "MOVIMENTO_GERAL",
  "FICHA_CLIENTES",
  "ESTOQUE",
  "PEDIDOS_FORNECEDOR",
  "LOG_ESTOQUE",
  "MOV_ESTOQUE",
  "MOV_PARCEIROS",
  "PARCEIROS",
  "LISTA_FORNECEDORES",
];

function readArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function normalizeCell(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return value;
  if ("result" in value) return normalizeCell(value.result);
  if ("formula" in value || "sharedFormula" in value) return null;
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("text" in value) return value.text;
  if ("error" in value) return `#ERRO:${value.error}`;
  return JSON.parse(JSON.stringify(value));
}

function formulaOf(value) {
  if (!value || typeof value !== "object") return null;
  return value.formula ?? value.sharedFormula ?? null;
}

function nonBlank(value) {
  return value != null && String(value).trim() !== "";
}

function uniqueHeaders(row) {
  const headers = new Map();
  const occurrences = new Map();
  row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const raw = String(normalizeCell(cell.value) ?? "").trim();
    if (!raw) return;
    const occurrence = (occurrences.get(raw) ?? 0) + 1;
    occurrences.set(raw, occurrence);
    headers.set(columnNumber, occurrence === 1 ? raw : `${raw} (${occurrence})`);
  });
  return headers;
}

function originalIdColumn(columns) {
  const patterns = [/^id$/i, /^_id$/i, /^id[_ ]/i, /[_ ]id$/i, /^key$/i, /^chave$/i];
  return patterns.flatMap((pattern) => columns.filter((column) => pattern.test(column)))[0] ?? null;
}

function safeSheetFilename(sheetName) {
  return `${sheetName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase()}.ndjson`;
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);
  stream.on("data", (chunk) => hash.update(chunk));
  await once(stream, "end");
  return hash.digest("hex");
}

async function writeLine(stream, value) {
  if (!stream.write(`${JSON.stringify(value)}\n`)) await once(stream, "drain");
}

const workbookPath = resolve(readArgument("--workbook", "data-import/Finanças (3).xlsx"));
const outputDirectory = resolve(readArgument("--output", "data-import/generated"));
if (!outputDirectory.startsWith(resolve("data-import"))) {
  throw new Error("A saída precisa ficar dentro de data-import para permanecer ignorada pelo Git.");
}
mkdirSync(outputDirectory, { recursive: true });

const sourceSha256 = await sha256(workbookPath);
const generatedAt = new Date().toISOString();
const workbook = new ExcelJS.stream.xlsx.WorkbookReader(workbookPath, {
  entries: "emit",
  sharedStrings: "cache",
  hyperlinks: "ignore",
  styles: "cache",
  worksheets: "emit",
});

const profilesBySheet = new Map();
for await (const worksheet of workbook) {
  const sheetName = worksheet.name;
  const selected = DEFAULT_SHEETS.includes(sheetName);
  let headerRow = null;
  let headers = null;
  let columns = null;
  let idColumn = null;
  let stagingFile = null;
  let stream = null;
  let recordCount = 0;
  let formulaCount = 0;

  for await (const row of worksheet) {
    if (!selected) continue;
    if (!headerRow) {
      if (!row.values.some(nonBlank)) continue;
      headerRow = row;
      headers = uniqueHeaders(row);
      columns = [...headers.values()];
      idColumn = originalIdColumn(columns);
      stagingFile = safeSheetFilename(sheetName);
      stream = createWriteStream(join(outputDirectory, stagingFile), { encoding: "utf8" });
      continue;
    }
    const payload = {};
    const formulas = {};
    for (const [columnNumber, header] of headers) {
      const cell = row.getCell(columnNumber);
      const value = normalizeCell(cell.value);
      if (nonBlank(value)) payload[header] = value;
      const formula = formulaOf(cell.value);
      if (formula) {
        formulas[header] = formula;
        formulaCount += 1;
      }
    }
    if (!Object.values(payload).some(nonBlank)) continue;
    await writeLine(stream, {
      source_sha256: sourceSha256,
      original_id: idColumn && nonBlank(payload[idColumn]) ? String(payload[idColumn]) : null,
      source_sheet: sheetName,
      source_row: row.number,
      imported_at: generatedAt,
      payload,
      formulas,
    });
    recordCount += 1;
  }
  if (!selected) continue;
  if (!headerRow) {
    profilesBySheet.set(sheetName, { sheet: sheetName, missing: false, record_count: 0, columns: [] });
    continue;
  }
  stream.end();
  await once(stream, "finish");
  profilesBySheet.set(sheetName, {
    sheet: sheetName,
    missing: false,
    header_row: headerRow.number,
    record_count: recordCount,
    original_id_column: idColumn,
    formula_count: formulaCount,
    columns,
    staging_file: stagingFile,
  });
}

const profiles = DEFAULT_SHEETS.map(
  (sheetName) => profilesBySheet.get(sheetName) ?? { sheet: sheetName, missing: true, record_count: 0, columns: [] },
);

const manifest = {
  source_filename: basename(workbookPath),
  source_sha256: sourceSha256,
  generated_at: generatedAt,
  sheets: profiles,
};
writeFileSync(join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
