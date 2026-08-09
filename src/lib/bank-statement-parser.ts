export type ParsedBankTransaction = {
  date: string;
  description: string;
  amount: number;
  externalId?: string;
};

export type ParsedBankStatement = {
  transactions: ParsedBankTransaction[];
  balance: number | null;
  balanceDate: string | null;
};

function money(value: string | undefined) {
  if (!value) return null;
  const cleaned = value.replace(/R\$/gi, "").replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  if (!cleaned) return null;
  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");
  const normalized = comma > dot
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function dateOnly(value: string | undefined) {
  const raw = value?.trim() ?? "";
  const iso = raw.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const brazil = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (!brazil) return null;
  const year = brazil[3].length === 2 ? `20${brazil[3]}` : brazil[3];
  return `${year}-${brazil[2].padStart(2, "0")}-${brazil[1].padStart(2, "0")}`;
}

function tag(block: string, name: string) {
  return block.match(new RegExp(`<${name}>\\s*([^<\\r\\n]+)`, "i"))?.[1]?.trim();
}

function parseOfx(text: string): ParsedBankStatement {
  const transactions: ParsedBankTransaction[] = [];
  for (const match of text.matchAll(/<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTTRN>)/gi)) {
    const block = match[1];
    const date = dateOnly(tag(block, "DTPOSTED"));
    const amount = money(tag(block, "TRNAMT"));
    const description = [tag(block, "NAME"), tag(block, "MEMO")]
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(" — ");
    if (date && amount && description) {
      transactions.push({ date, amount, description, externalId: tag(block, "FITID") });
    }
  }

  const ledger = text.match(/<LEDGERBAL>([\s\S]*?)(?:<\/LEDGERBAL>|<AVAILBAL>|<\/BANKMSGSRSV1>)/i)?.[1];
  return {
    transactions,
    balance: money(ledger ? tag(ledger, "BALAMT") : undefined),
    balanceDate: dateOnly(ledger ? tag(ledger, "DTASOF") : undefined),
  };
}

function splitCsvLine(line: string, separator: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === separator && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: string[], names: string[]) {
  const normalizedNames = names.map(normalized);
  return headers.findIndex((header) => normalizedNames.includes(normalized(header)));
}

function parseCsv(text: string): ParsedBankStatement {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { transactions: [], balance: null, balanceDate: null };
  const candidates = [";", ",", "\t"];
  const separator = candidates.sort((a, b) => lines[0].split(b).length - lines[0].split(a).length)[0];
  const headers = splitCsvLine(lines[0], separator);
  const dateIndex = findColumn(headers, ["data", "date", "data movimento", "data lancamento"]);
  const descriptionIndex = findColumn(headers, ["descricao", "description", "historico", "lancamento", "detalhes"]);
  const amountIndex = findColumn(headers, ["valor", "amount", "valor lancamento"]);
  const debitIndex = findColumn(headers, ["debito", "debit"]);
  const creditIndex = findColumn(headers, ["credito", "credit"]);
  const balanceIndex = findColumn(headers, ["saldo", "balance"]);
  const idIndex = findColumn(headers, ["id", "identificador", "documento", "transaction id"]);

  if (dateIndex < 0 || descriptionIndex < 0 || (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)) {
    throw new Error("Não reconheci as colunas do arquivo. Use um CSV com Data, Descrição e Valor.");
  }

  const transactions: ParsedBankTransaction[] = [];
  let balance: number | null = null;
  let balanceDate: string | null = null;
  for (const line of lines.slice(1)) {
    const row = splitCsvLine(line, separator);
    const date = dateOnly(row[dateIndex]);
    const description = row[descriptionIndex]?.trim();
    const direct = amountIndex >= 0 ? money(row[amountIndex]) : null;
    const debit = debitIndex >= 0 ? money(row[debitIndex]) : null;
    const credit = creditIndex >= 0 ? money(row[creditIndex]) : null;
    const amount = direct ?? (credit ? Math.abs(credit) : debit ? -Math.abs(debit) : null);
    const rowBalance = balanceIndex >= 0 ? money(row[balanceIndex]) : null;
    if (rowBalance !== null && date && (!balanceDate || date >= balanceDate)) {
      balance = rowBalance;
      balanceDate = date;
    }
    if (date && description && amount) {
      transactions.push({ date, description, amount, externalId: idIndex >= 0 ? row[idIndex] : undefined });
    }
  }
  return { transactions, balance, balanceDate };
}

export function decodeBankFile(bytes: Uint8Array) {
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  const header = utf8.slice(0, 500).toUpperCase();
  if (header.includes("CHARSET:1252") || header.includes("CHARSET:ISO-8859-1")) {
    return new TextDecoder("windows-1252").decode(bytes);
  }
  return utf8;
}

export function parseBankStatement(fileName: string, text: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "ofx" || /<OFX>|OFXHEADER:/i.test(text.slice(0, 1000))) return parseOfx(text);
  if (extension === "csv" || extension === "txt") return parseCsv(text);
  throw new Error("Neste primeiro teste, envie um arquivo OFX ou CSV.");
}
