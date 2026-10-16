const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

function loadPlanner({ allowed = true, fail = false } = {}) {
  const tables = {
    bank_account_current_balances: [{ balance: 1099.65, balance_date: '2026-10-15' }],
    bank_financial_goals: [{ id: '9c617ae2-23e6-468a-b8ba-51a5f070bed2', title: 'Reserva novembro', due_date: '2026-11-01', reserved_amount: 2900 }],
    bank_income_sources: [{ id: 'de28f5b6-06f3-4f7a-af2e-29dd1aa52840', name: 'Salário Giulia', amount: 1800, frequency: 'monthly', starts_on: '2026-07-01', include_in_projection: true }, { id: '4f68563f-5122-481a-965e-d9a03978719b', name: 'Salário Igor', amount: 3000, frequency: 'monthly', starts_on: '2026-07-01', include_in_projection: true }],
    bank_income_source_receipts: [{ source_id: 'de28f5b6-06f3-4f7a-af2e-29dd1aa52840', reference_month: '2026-10-01', amount: 1800 }, { source_id: '4f68563f-5122-481a-965e-d9a03978719b', reference_month: '2026-10-01', amount: 3000 }],
    bank_receivables: [{ id: 'deposit', title: 'Depósito', amount: 500, received_amount: 0, status: 'pending', due_date: '2026-10-16', category: 'Transferência interna' }],
    bank_cards: [{ id: 'cpf', name: 'Sicoob Igor CPF', institution: 'Sicoob', holder_name: 'Igor' }, { id: 'cnpj', name: 'Sicoob CNPJ', institution: 'Sicoob', holder_name: 'Igor' }, { id: 'giulia', name: 'Sicoob Giulia', institution: 'Sicoob', holder_name: 'Giulia' }],
    bank_card_invoice_overview: [{ id: 'invoice1', card_id: 'cpf' }], bank_charges_overview: [{ id: 'charge1', card_invoice_id: 'invoice1' }], bank_subscriptions: [],
    supplement_sale_receivable_schedule: [{ amount: 50, due_date: '2026-10-25', has_explicit_due: true }, { amount: 80, due_date: '2026-11-10', has_explicit_due: true }, { amount: 20, due_date: null, has_explicit_due: false }], fitness_sales: [],
  };
  const db = { from(table) {
    const query = { then(resolve) { return Promise.resolve({ data: tables[table] ?? [], error: fail ? new Error('database unavailable') : null }).then(resolve); } };
    for (const method of ['select','eq','neq','in','gte','lt','order']) query[method] = () => query;
    return query;
  }};
  const filename = path.resolve(__dirname, '../src/lib/bank-planning-data.ts');
  const mod = new Module(filename, module);
  mod.require = id => {
    if (id === '@/lib/supabase/server') return { createClient: async () => db };
    if (id === '@/lib/data') return { getCurrentUserAccess: async () => ({ active: allowed, canAccessBank: allowed, role: 'operator' }) };
    if (id === '@/lib/bank-home-data-v2') return { getBankMonthHomeDataV2: async (month = '2026-10-01') => ({ referenceMonth: month, monthLabel: month, commitments: [{ id: 'charge:charge1', title: 'Fatura', amount: 100, dueDate: month.replace('-01', '-10') }] }) };
    return require(id);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  return mod.exports.getBankPlanningData;
}

test('loader keeps titular identities, links charge to card and deducts November advances', async () => {
  const data = await loadPlanner()();
  assert.equal(data.cards.length, 3);
  assert.equal(data.months[0].rows[0].cardId, 'cpf');
  assert.equal(data.months[0].incomes.find(row => row.id === 'operations').amount, 70);
  assert.equal(data.months[1].incomes.find(row => row.id === 'operations').amount, 80);
  assert.equal(data.months[1].incomes.filter(row => row.id.startsWith('source:')).reduce((sum, row) => sum + row.amount, 0), 1900);
  assert.equal(data.months[0].incomes.find(row => row.id === 'deposit').state, 'pending');
  assert.equal(data.reserves[0].outsideBalances, true);
});
test('loader rejects unauthorized users', async () => { await assert.rejects(loadPlanner({ allowed: false })(), /Sem permissão/); });
test('database failure is not presented as a zero balance', async () => { await assert.rejects(loadPlanner({ fail: true })(), /database unavailable/); });
