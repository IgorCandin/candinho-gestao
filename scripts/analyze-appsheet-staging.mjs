import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, resolve } from "node:path";

const OUTPUT_DIRECTORY = resolve(process.argv[2] ?? "data-import/generated");
const MAX_DETAILS = 200;

const MAPPINGS = {
  MOVIMENTO_GERAL: {
    ID: ["vendas.appsheet_id", "leads.appsheet_id"],
    "Tipo de Registro": ["vendas.record_type", "leads.record_type"],
    Referência: ["clientes.reference", "vendas.reference"],
    Cidade: ["clientes.city", "vendas.city"],
    Telefone: ["clientes.phone", "vendas.phone"],
    "Data do Pós-Venda Sugerida": ["vendas.post_sale_due_at"],
    "Status de Recebimento": ["pagamentos.status"],
    "Status da Entrega": ["entregas.status"],
    "Status Geral": ["vendas.general_status", "leads.general_status"],
    "Status do Lead": ["leads.lead_status"],
    "Nome do Cliente": ["clientes.name", "vendas.customer_id", "leads.customer_id"],
    "Data do Orçamento": ["vendas.quoted_at", "leads.quoted_at"],
    "Data do Pagamento": ["pagamentos.paid_at"],
    "Data da Entrega": ["entregas.delivered_at"],
    Produto: ["itens_vendidos.product_id"],
    "Preço de Custo": ["itens_vendidos.unit_cost"],
    "Valor da Venda": ["itens_vendidos.unit_price", "pagamentos.amount"],
    Lucro: ["itens_vendidos.total_profit"],
    "Forma de Pagamento": ["pagamentos.payment_method"],
    "Condição de Pagamento": ["pagamentos.payment_condition"],
    "Pós-Venda": ["vendas.post_sale_status"],
    "Origem do Estoque": ["vendas.location_id", "movimentações.location_id"],
    Parceria: ["vendas.partner_id"],
    "Baixa no Estoque": ["vendas.stock_deducted"],
    "Situação da Venda": ["vendas.general_status"],
    Observações: ["vendas.notes", "leads.notes"],
  },
  FICHA_CLIENTES: {
    ID: ["clientes.appsheet_id"],
    "Nome do Cliente": ["clientes.name"],
    Referência: ["clientes.reference"],
    Cidade: ["clientes.city"],
    Telefone: ["clientes.phone"],
    "Número Total de Compras": ["clientes.resumo_derivado.purchase_count"],
    "Data da Última Compra": ["clientes.resumo_derivado.last_purchase_at"],
    "Valor Total Gasto": ["clientes.resumo_derivado.total_spent"],
  },
  ESTOQUE: {
    ID: ["produtos.appsheet_id"],
    Produto: ["produtos.name"],
    "Valor Unitário": ["produtos.sale_price"],
    "Categoria-Mãe": ["produtos.category"],
    Objetivo: ["produtos.description"],
    "Estoque Total": ["estoque.total_conferência"],
    "Estoque CS": ["estoque.CS.quantity"],
    "Estoque CTS": ["estoque.CTS.quantity"],
    "Estoque ES": ["estoque.ES.quantity"],
    "Estoque TT": ["estoque.TT.quantity"],
    "Estoque INGRID": ["estoque.INGRID.quantity"],
    "Estoque ADRIANA": ["estoque.ADRIANA.quantity"],
    "Estoque Mínimo": ["produtos.min_stock"],
    "Custo Unitário": ["produtos.cost_price"],
    "Mostrar no APP": ["produtos.active"],
    "Marketplace ou Fornecedor": ["produtos.supplier_id"],
  },
  PEDIDOS_FORNECEDOR: {
    ID: ["pedidos_fornecedor.appsheet_id"],
    "Data do Pedido": ["pedidos_fornecedor.ordered_at"],
    Produto: ["pedidos_fornecedor.product_id"],
    "Quantidade Comprada": ["pedidos_fornecedor.quantity"],
    "Custo Unitário": ["pedidos_fornecedor.unit_cost"],
    "Valor Total": ["pedidos_fornecedor.total_amount"],
    "Marketplace ou Fornecedor": ["pedidos_fornecedor.supplier_id"],
    Status: ["pedidos_fornecedor.status"],
    Observação: ["pedidos_fornecedor.notes"],
    "Atualizado no Estoque?": ["pedidos_fornecedor.stock_updated"],
    "Data Hora Pedido": ["pedidos_fornecedor.created_at"],
  },
  LOG_ESTOQUE: {
    ID: ["movimentações.appsheet_id"],
    Data: ["movimentações.created_at"],
    Produto: ["movimentações.product_id"],
    Tipo: ["movimentações.movement_type"],
    Quantidade: ["movimentações.quantity_delta"],
    "Origem do Estoque": ["movimentações.location_id"],
    Cliente: ["movimentações.customer_id"],
    "ID Movimento": ["movimentações.source_movement_id"],
    Observação: ["movimentações.notes"],
    "Destino do Estoque": ["movimentações.destination_location_id"],
    Status: ["movimentações.status"],
  },
  MOV_ESTOQUE: {
    ID_Mov_Estoque: ["movimentações.appsheet_id"],
    Data: ["movimentações.created_at"],
    Produto: ["movimentações.product_id"],
    "Tipo Movimento": ["movimentações.movement_type"],
    Quantidade: ["movimentações.quantity_delta"],
    "Custo Unitário": ["movimentações.unit_cost"],
    "Valor Unitário": ["movimentações.unit_price"],
    Origem: ["movimentações.location_id"],
    Destino: ["movimentações.destination_location_id"],
    "ID Venda": ["movimentações.sale_id"],
    "ID Pedido Fornecedor": ["movimentações.supplier_order_id"],
    "ID Mov Parceria": ["movimentações.partner_movement_id"],
    Observação: ["movimentações.notes"],
    Responsável: ["movimentações.created_by"],
    "Aplicado?": ["movimentações.applied"],
  },
  MOV_PARCEIROS: {
    ID_Mov_Parceiro: ["movimentações_parceiros.appsheet_id"],
    Data: ["movimentações_parceiros.created_at"],
    Parceiro: ["movimentações_parceiros.partner_id"],
    Produto: ["movimentações_parceiros.product_id"],
    "Tipo Movimento Parceiro": ["movimentações_parceiros.movement_type"],
    Quantidade: ["movimentações_parceiros.quantity"],
    "Valor Unitário de Acerto": ["movimentações_parceiros.settlement_unit_price"],
    "Custo Unitário": ["movimentações_parceiros.unit_cost"],
    "Status Acerto": ["pagamentos.status"],
    "Data Acerto": ["pagamentos.paid_at"],
    "ID Mov Estoque": ["movimentações_parceiros.inventory_movement_id"],
    "ID Venda": ["movimentações_parceiros.sale_id"],
    Observação: ["movimentações_parceiros.notes"],
    Responsável: ["movimentações_parceiros.created_by"],
    "Aplicado?": ["movimentações_parceiros.applied"],
  },
  PARCEIROS: {
    ID_Parceiro: ["parceiros.appsheet_id"],
    "Nome Parceiro": ["parceiros.name"],
    "Tipo Parceiro": ["parceiros.partner_type"],
    Cidade: ["parceiros.city"],
    Referência: ["parceiros.reference"],
    Responsável: ["parceiros.contact_name"],
    Telefone: ["parceiros.phone"],
    "Status Parceiro": ["parceiros.status"],
    "Data Início": ["parceiros.start_date"],
    "Data Fim": ["parceiros.end_date"],
    "Modelo Parceria": ["parceiros.partnership_model"],
    "Regra de Acerto": ["parceiros.settlement_rule"],
    "Comissão %": ["parceiros.commission_pct"],
    "Observação/Resumo": ["parceiros.notes"],
    "Mostrar no APP?": ["parceiros.active"],
  },
  LISTA_FORNECEDORES: {
    ID: ["parceiros.appsheet_id"],
    "Marketplace ou Fornecedor": ["parceiros.name"],
  },
};

const REQUIRED_FIELDS = {
  MOVIMENTO_GERAL: ["ID", "Tipo de Registro"],
  FICHA_CLIENTES: ["ID", "Nome do Cliente"],
  ESTOQUE: ["ID", "Produto"],
  PEDIDOS_FORNECEDOR: ["ID", "Produto"],
  LOG_ESTOQUE: ["ID", "Produto", "Quantidade"],
  MOV_ESTOQUE: ["ID_Mov_Estoque", "Produto", "Quantidade"],
  MOV_PARCEIROS: ["ID_Mov_Parceiro", "Parceiro", "Produto"],
  PARCEIROS: ["ID_Parceiro", "Nome Parceiro"],
  LISTA_FORNECEDORES: ["ID", "Marketplace ou Fornecedor"],
};

const NUMERIC_FIELDS = {
  MOVIMENTO_GERAL: ["Preço de Custo", "Valor da Venda", "Lucro"],
  FICHA_CLIENTES: ["Dias sem contato", "Número Total de Compras", "Quantidade do PMC", "Valor Total Gasto", "Dias Sem Comprar"],
  ESTOQUE: [
    "Valor Unitário", "Valor à Prazo", "Estoque Total", "Estoque CS", "Estoque CTS", "Estoque ES",
    "Estoque TT", "Estoque INGRID", "Estoque ADRIANA", "Leads", "Porcentagem do Estoque", "Estoque Ideal",
    "Estoque Mínimo", "Custo Unitário", "Lucro", "Custo total do estoque", "Valor total de venda do estoque",
  ],
  PEDIDOS_FORNECEDOR: ["Quantidade Comprada", "Custo Unitário", "Valor Total"],
  LOG_ESTOQUE: ["Quantidade"],
  MOV_ESTOQUE: ["Quantidade", "Custo Unitário", "Valor Unitário"],
  MOV_PARCEIROS: ["Quantidade", "Valor Unitário de Acerto", "Custo Unitário"],
  PARCEIROS: ["Comissão %"],
  LISTA_FORNECEDORES: [],
};

function nonBlank(value) {
  return value != null && String(value).trim() !== "" && !String(value).startsWith("#ERRO:");
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
}

function parseBrazilianNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!nonBlank(value)) return null;
  let text = String(value).trim().replace(/R\$|%/gi, "").replace(/\s/g, "");
  if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(text)) text = text.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d+,\d+$/.test(text)) text = text.replace(",", ".");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isValidDate(value) {
  if (!nonBlank(value)) return true;
  if (typeof value === "number") return value > 0;
  const text = String(value).trim();
  const br = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\D|$)/);
  if (br) {
    const year = Number(br[3].length === 2 ? `20${br[3]}` : br[3]);
    const month = Number(br[2]);
    const day = Number(br[1]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }
  return !Number.isNaN(Date.parse(text));
}

async function readNdjson(filename) {
  const records = [];
  const lines = createInterface({ input: createReadStream(join(OUTPUT_DIRECTORY, filename), "utf8"), crlfDelay: Infinity });
  for await (const line of lines) if (line.trim()) records.push(JSON.parse(line));
  return records;
}

function limited(items) {
  return items.slice(0, MAX_DETAILS);
}

function markdownTable(headers, rows) {
  const clean = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  return [
    `| ${headers.map(clean).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(clean).join(" | ")} |`),
  ].join("\n");
}

const manifest = JSON.parse(readFileSync(join(OUTPUT_DIRECTORY, "manifest.json"), "utf8"));
const productionCheckPath = join(OUTPUT_DIRECTORY, "production-product-check.json");
const productionProductCheck = existsSync(productionCheckPath)
  ? JSON.parse(readFileSync(productionCheckPath, "utf8"))
  : null;
const recordsBySheet = new Map();
for (const profile of manifest.sheets) {
  recordsBySheet.set(profile.sheet, profile.staging_file ? await readNdjson(profile.staging_file) : []);
}

const usefulCounts = new Map();
const unmappedColumns = [];
const invalidValues = [];
const invalidDates = [];
const duplicateIds = [];
const possibleDuplicates = [];
const usefulBySheet = new Map();

for (const profile of manifest.sheets) {
  const required = REQUIRED_FIELDS[profile.sheet] ?? [];
  const records = recordsBySheet.get(profile.sheet) ?? [];
  const useful = records.filter((record) => required.every((column) => nonBlank(record.payload[column])));
  usefulBySheet.set(profile.sheet, useful);
  usefulCounts.set(profile.sheet, useful.length);
  for (const column of profile.columns) {
    if (!(column in (MAPPINGS[profile.sheet] ?? {}))) unmappedColumns.push({ sheet: profile.sheet, column });
  }

  const ids = new Map();
  for (const record of useful) {
    if (nonBlank(record.original_id)) {
      const rows = ids.get(record.original_id) ?? [];
      rows.push(record.source_row);
      ids.set(record.original_id, rows);
    }
    for (const [column, value] of Object.entries(record.payload)) {
      if (!nonBlank(value)) continue;
      if (/data|mês e ano/i.test(column) && !isValidDate(value)) {
        invalidDates.push({ sheet: profile.sheet, row: record.source_row, column, value });
      }
      if ((NUMERIC_FIELDS[profile.sheet] ?? []).includes(column)) {
        const parsed = parseBrazilianNumber(value);
        if (Number.isNaN(parsed)) invalidValues.push({ sheet: profile.sheet, row: record.source_row, column, value });
      }
    }
  }
  for (const [id, rows] of ids) {
    if (rows.length > 1) duplicateIds.push({ sheet: profile.sheet, id, rows });
  }
}

const productCatalog = new Map();
for (const record of usefulBySheet.get("ESTOQUE") ?? []) {
  productCatalog.set(normalizeText(record.payload.Produto), record);
}
const productIssues = [];
for (const sheet of ["MOVIMENTO_GERAL", "PEDIDOS_FORNECEDOR", "LOG_ESTOQUE", "MOV_ESTOQUE", "MOV_PARCEIROS"]) {
  for (const record of usefulBySheet.get(sheet) ?? []) {
    const product = record.payload.Produto;
    if (nonBlank(product) && !productCatalog.has(normalizeText(product))) {
      productIssues.push({ sheet, row: record.source_row, product });
    }
  }
}

const customerGroups = new Map();
for (const record of usefulBySheet.get("FICHA_CLIENTES") ?? []) {
  const phone = normalizePhone(record.payload.Telefone);
  const name = normalizeText(record.payload["Nome do Cliente"]);
  const city = normalizeText(record.payload.Cidade);
  const key = phone.length >= 10 ? `telefone:${phone}` : `nome-cidade:${name}|${city}`;
  if (!name && !phone) continue;
  const group = customerGroups.get(key) ?? [];
  group.push(record);
  customerGroups.set(key, group);
}
const duplicateCustomers = [...customerGroups.entries()]
  .filter(([, records]) => records.length > 1)
  .map(([criterion, records]) => ({
    criterion,
    name: records[0].payload["Nome do Cliente"],
    rows: records.map((record) => record.source_row),
    ids: records.map((record) => record.original_id).filter(nonBlank),
  }));

const movements = usefulBySheet.get("MOVIMENTO_GERAL") ?? [];
const recordTypeCounts = movements.reduce((counts, record) => {
  const type = String(record.payload["Tipo de Registro"] ?? "(vazio)");
  counts[type] = (counts[type] ?? 0) + 1;
  return counts;
}, {});
const saleRows = movements.filter((record) => !/lead/i.test(String(record.payload["Tipo de Registro"] ?? "")));
const salesWithoutProduct = saleRows.filter((record) => !nonBlank(record.payload.Produto));
const salesWithoutCustomer = saleRows.filter(
  (record) => !nonBlank(record.payload["Nome do Cliente"]) && !nonBlank(record.payload.Referência),
);

const signatures = new Map();
for (const record of saleRows) {
  const signature = [
    normalizeText(record.payload["Nome do Cliente"]),
    normalizeText(record.payload.Produto),
    String(record.payload["Data do Orçamento"] ?? ""),
    String(parseBrazilianNumber(record.payload["Valor da Venda"]) ?? ""),
  ].join("|");
  const rows = signatures.get(signature) ?? [];
  rows.push(record.source_row);
  signatures.set(signature, rows);
}
for (const [signature, rows] of signatures) {
  if (rows.length > 1) possibleDuplicates.push({ type: "venda", signature, rows });
}
for (const duplicate of duplicateIds) {
  possibleDuplicates.push({ type: `ID em ${duplicate.sheet}`, signature: duplicate.id, rows: duplicate.rows });
}

const lines = [];
lines.push("# Relatório de preparação da importação AppSheet");
lines.push("");
lines.push(`- Arquivo: \`${manifest.source_filename}\``);
lines.push(`- SHA-256: \`${manifest.source_sha256}\``);
lines.push(`- Gerado em: \`${manifest.generated_at}\``);
lines.push("- Escopo: análise local e staging; nenhuma escrita foi feita nas tabelas de produção.");
lines.push("- Privacidade: este relatório está dentro de `data-import/`, pasta ignorada pelo Git.");
lines.push("");
lines.push("## Quantidade de registros por aba");
lines.push("");
lines.push(markdownTable(
  ["Aba", "Linhas físicas exportadas", "Registros úteis", "Linha de cabeçalho", "Coluna de ID original"],
  manifest.sheets.map((profile) => [profile.sheet, profile.record_count, usefulCounts.get(profile.sheet) ?? 0, profile.header_row ?? "—", profile.original_id_column ?? "—"]),
));
lines.push("");
lines.push("> `FICHA_CLIENTES` possui fórmulas preenchidas em milhares de linhas. “Registros úteis” exige ID e nome; as demais abas usam suas chaves mínimas documentadas no analisador.");
lines.push("");
lines.push("Distribuição de `MOVIMENTO_GERAL`: " + Object.entries(recordTypeCounts).map(([type, count]) => `**${type}: ${count}**`).join(", ") + ". A proposta trata `Cancelado` como venda cancelada, pendente de confirmação.");
lines.push("");
lines.push("## Colunas encontradas e mapeamento");
for (const profile of manifest.sheets) {
  lines.push("");
  lines.push(`### ${profile.sheet}`);
  lines.push("");
  lines.push(markdownTable(
    ["Coluna de origem", "Destino proposto"],
    profile.columns.map((column) => [column, (MAPPINGS[profile.sheet]?.[column] ?? ["Sem correspondência"]).join("; ")]),
  ));
}
lines.push("");
lines.push("## Colunas sem correspondência");
lines.push("");
lines.push(unmappedColumns.length ? markdownTable(["Aba", "Coluna"], unmappedColumns.map((item) => [item.sheet, item.column])) : "Nenhuma.");
lines.push("");
lines.push("## Produtos não localizados no cadastro ESTOQUE");
lines.push("");
lines.push(`Total: **${productIssues.length}**.`);
if (productIssues.length) lines.push("\n" + markdownTable(["Aba", "Linha", "Produto"], limited(productIssues).map((item) => [item.sheet, item.row, item.product])));
if (productionProductCheck) {
  lines.push("");
  lines.push(`Comparação somente leitura com produção: **${productionProductCheck.exact_matches}/${productionProductCheck.source_count}** produtos encontrados por nome exato; não localizados: **${productionProductCheck.not_found.length}**.`);
}
lines.push("");
lines.push("## Clientes duplicados");
lines.push("");
lines.push(`Grupos encontrados: **${duplicateCustomers.length}**.`);
if (duplicateCustomers.length) lines.push("\n" + markdownTable(["Critério", "Cliente", "Linhas", "IDs AppSheet"], limited(duplicateCustomers).map((item) => [item.criterion, item.name, item.rows.join(", "), item.ids.join(", ")])));
lines.push("");
lines.push("## Vendas sem produto");
lines.push("");
lines.push(`Total: **${salesWithoutProduct.length}**.`);
if (salesWithoutProduct.length) lines.push("\n" + markdownTable(["Linha", "ID AppSheet"], limited(salesWithoutProduct).map((item) => [item.source_row, item.original_id])));
lines.push("");
lines.push("## Vendas sem cliente");
lines.push("");
lines.push(`Total: **${salesWithoutCustomer.length}**.`);
if (salesWithoutCustomer.length) lines.push("\n" + markdownTable(["Linha", "ID AppSheet"], limited(salesWithoutCustomer).map((item) => [item.source_row, item.original_id])));
lines.push("");
lines.push("## Valores inválidos");
lines.push("");
lines.push(`Total: **${invalidValues.length}**.`);
if (invalidValues.length) lines.push("\n" + markdownTable(["Aba", "Linha", "Coluna", "Valor"], limited(invalidValues).map((item) => [item.sheet, item.row, item.column, item.value])));
lines.push("");
lines.push("## Datas inválidas");
lines.push("");
lines.push(`Total: **${invalidDates.length}**.`);
if (invalidDates.length) lines.push("\n" + markdownTable(["Aba", "Linha", "Coluna", "Valor"], limited(invalidDates).map((item) => [item.sheet, item.row, item.column, item.value])));
lines.push("");
lines.push("## Possíveis duplicidades");
lines.push("");
lines.push(`Total: **${possibleDuplicates.length}**.`);
if (possibleDuplicates.length) lines.push("\n" + markdownTable(["Tipo", "Assinatura/ID", "Linhas"], limited(possibleDuplicates).map((item) => [item.type, item.signature, item.rows.join(", ")])));
lines.push("");
lines.push("## Limitações e decisões pendentes");
lines.push("");
lines.push("- Comparação de produtos usa nome normalizado; sinônimos e mudanças de embalagem exigem aprovação manual.");
lines.push("- Duplicidade de clientes usa telefone quando disponível; caso contrário, nome + cidade.");
lines.push("- Pagamentos e entregas serão derivados de `MOVIMENTO_GERAL`; ainda não existem tabelas equivalentes no schema público atual.");
lines.push("- Pedidos de fornecedor e parceiros também exigem novas tabelas de destino antes da promoção final.");
lines.push("- Nenhuma linha está marcada como aprovada para promoção ao schema público.");

const reportPath = join(OUTPUT_DIRECTORY, "RELATORIO_IMPORTACAO_APPSHEET.md");
writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  report: reportPath,
  useful_counts: Object.fromEntries(usefulCounts),
  products_not_found: productIssues.length,
  duplicate_customer_groups: duplicateCustomers.length,
  sales_without_product: salesWithoutProduct.length,
  sales_without_customer: salesWithoutCustomer.length,
  invalid_values: invalidValues.length,
  invalid_dates: invalidDates.length,
  possible_duplicates: possibleDuplicates.length,
}, null, 2)}\n`);
