const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
function load(error = null) {
  const calls = [];
  const file = path.resolve(__dirname, '../src/app/(app)/bank/entradas/receipt-actions.ts');
  const compiled = new Module(file, module);
  compiled.require = id => id === 'next/cache' ? { revalidatePath: () => {} } : id === 'next/navigation' ? { redirect: () => { throw Error('unexpected redirect'); } } : id === '@/lib/supabase/server' ? { createClient: async () => ({ rpc: async (...args) => { calls.push(args); return { error }; } }) } : id === "@/lib/bank-money-input" ? require("./helpers/company-navigation-fixtures.cjs").load("src/lib/bank-money-input.ts") : require(id);
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
  return { action: compiled.exports.confirmPlannerIncome, calls };
}
function form(amount = '100,50') {
  const data = new FormData();
  data.set('source_id', '12345678-1234-4123-8123-123456789abc');
  data.set('reference_month', '2026-11-01');
  data.set('received_on', '2026-11-05');
  data.set('amount', amount);
  return data;
}
test('planner confirmation uses existing monthly receipt RPC and preserves month', async () => {
  const { action, calls } = load();
  assert.equal((await action({}, form())).ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'bank_mark_income_source_received');
  assert.equal(calls[0][1].p_reference_month, '2026-11-01');
  assert.equal(calls[0][1].p_amount, 100.5);
});
test('invalid amount does not invoke RPC; denied receipt is not shown as success', async () => {
  const valid = load();
  assert.equal((await valid.action({}, form('-1'))).ok, false);
  assert.equal(valid.calls.length, 0);
  const denied = load({ message: 'permission denied' });
  assert.equal((await denied.action({}, form())).ok, false);
});

test('ambiguous thousands and malformed amounts never reach receipt RPC; explicit BR amount is preserved', async () => {
  for (const raw of ['1.234', '2.000', '1e3', '1,2,3']) {
    const fixture = load();
    const response = await fixture.action({}, form(raw));
    assert.equal(response.ok, false);
    assert.equal(fixture.calls.length, 0);
  }
  const fixture = load();
  assert.equal((await fixture.action({}, form('1.234,56'))).ok, true);
  assert.equal(fixture.calls[0][1].p_amount, 1234.56);
});
