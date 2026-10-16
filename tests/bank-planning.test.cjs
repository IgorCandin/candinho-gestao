const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const file = path.resolve(__dirname, '../src/lib/bank-planning.ts');
const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const compiled = new Module(file, module);
compiled._compile(code, file);
const { calculateBankPlan, parsePlanBudget } = compiled.exports;
const { installmentSchedule, firstInstallmentMonth } = compiled.exports;
test('installments distribute cents exactly and cross year boundaries', () => {
  const rows = installmentSchedule(1000, 10, '2026-11');
  assert.equal(rows.length, 10);
  assert.ok(rows.every(row => row.amount === 100));
  assert.equal(rows[2].month, '2027-01-01');
  assert.deepEqual(installmentSchedule(10, 3, '2026-10').map(row => row.amount), [3.34, 3.33, 3.33]);
  assert.deepEqual(installmentSchedule(10, 0, '2026-10'), []);
});
test('closing and due days determine first invoice, not a universal cutoff', () => {
  assert.equal(firstInstallmentMonth('2026-10-06', 7, 15), '2026-10');
  assert.equal(firstInstallmentMonth('2026-10-08', 7, 15), '2026-11');
  assert.equal(firstInstallmentMonth('2026-10-25', 25, 5), '2026-11');
  assert.equal(firstInstallmentMonth('2026-12-26', 25, 5), '2027-02');
  assert.equal(firstInstallmentMonth('2026-02-30', 7, 15), null);
  assert.equal(firstInstallmentMonth('2026-10-06', null, 15), null);
});
const reserve = { id: 'reserve', month: '2026-11-01', amount: 2900, outsideBalances: true };
const base = { month: '2026-10-01', currentMonth: '2026-10-01', balance: 1099.65, reserves: [reserve], incomes: [], commitments: [2031.58] };

test('October excludes the November reserve and pending deposit', () => {
  const result = calculateBankPlan({ ...base, incomes: [{ id: 'deposit', title: 'Transferência', amount: 500, state: 'pending', kind: 'transfer' }] });
  assert.equal(result.available, 1099.65);
  assert.equal(result.difference, -931.93);
  assert.equal(result.projected, -431.93);
});
test('November reserve counted once; no October carry-forward', () => {
  const result = calculateBankPlan({ ...base, month: '2026-11-01', reserves: [reserve, reserve], commitments: [7419.41] });
  assert.equal(result.available, 2900);
  assert.equal(result.difference, -4519.41);
});
test('already received and advance salary not added again', () => {
  const result = calculateBankPlan({ ...base, incomes: [{ id: 'salary', title: 'Salário', amount: 3000, advance: 1100, kind: 'income', state: 'pending' }, { id: 'received', title: 'Recebido', amount: 1800, kind: 'income', state: 'received' }] });
  assert.equal(result.pending, 1900);
});
test('simulation is pure, integer cents and no side effects', () => {
  const input = structuredClone(base);
  const result = calculateBankPlan({ ...input, budget: 500 });
  assert.equal(result.afterPlan, -1431.93);
  assert.deepEqual(input, base);
});
test('reserve within registered balances is locked for later month', () => {
  const result = calculateBankPlan({ ...base, balance: 3999.65, reserves: [{ ...reserve, outsideBalances: false }] });
  assert.equal(result.available, 1099.65);
});
test('Brazilian input rejects negative, invalid and excess precision', () => {
  assert.equal(parsePlanBudget('1.200,50'), 1200.5);
  assert.equal(parsePlanBudget('500'), 500);
  for (const value of ['-10', 'abc', '1,234', 'Infinity']) assert.equal(parsePlanBudget(value), null);
});
