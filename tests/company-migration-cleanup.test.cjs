const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(relative) {
  const file = path.resolve(__dirname, relative);
  const compiled = new Module(file, module);
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
  return compiled.exports;
}
const { companyDestination } = load('../src/lib/company-destination.ts');
const { buildSizeOpportunities } = load('../src/lib/fitness-size-opportunities.ts');
const id = '5bbdc799-2794-45d7-8f39-d0b834f3b125';
test('Company calendar destinations preserve context, query and fragment', () => {
  assert.equal(companyDestination(`/suplementos/pos-venda/${id}?a=1#historico`), `/company/acompanhar/suplementos/${id}?a=1#historico`);
  assert.equal(companyDestination(`/parceiros/${id}`), `/company/parceiros/${id}`);
  assert.equal(companyDestination(`/fitness/clientes/${id}`), `/company/clientes/fitness/${id}`);
  assert.equal(companyDestination('https://example.com/x'), 'https://example.com/x');
  assert.equal(companyDestination('/fitness/consignacoes/x'), '/fitness/consignacoes/x');
});
const evidence = { customerId: 'c1', customerName: 'Exemplo', category: 'Blusas', size: 'g', date: '2026-10-10', variantId: 'bought', productName: 'Blusa comprada' };
const variant = { variant_id: 'new', product_name: 'Outra blusa', product_id: 'p', category: 'Blusas', size: 'G', color: 'Preta', product_active: true, variant_active: true, available_quantity: 2 };
test('size evidence matches normalized size and category; no cross-category guess', () => {
  const result = buildSizeOpportunities([evidence], [variant, { ...variant, variant_id: 'legging', category: 'Leggings' }, { ...variant, variant_id: 'small', size: 'P' }]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].products.map(row => row.variant_id), ['new']);
});
test('uses latest observed size, excludes unavailable, inactive and previously purchased variants', () => {
  const result = buildSizeOpportunities([evidence, { ...evidence, size: 'M', date: '2026-09-01' }], [variant, { ...variant, variant_id: 'bought' }, { ...variant, variant_id: 'reserved', available_quantity: 0 }, { ...variant, variant_id: 'inactive', variant_active: false }]);
  assert.equal(result[0].evidence.size, 'g');
  assert.deepEqual(result[0].products.map(row => row.variant_id), ['new']);
  assert.deepEqual(buildSizeOpportunities([], [variant]), []);
});
test('partner swipe receives Company context; conference is native Company destination', () => {
  const partner = fs.readFileSync(path.resolve(__dirname, '../src/app/(app)/parceiros/[id]/page.tsx'), 'utf8');
  assert.match(partner, /getEntitySwipeNavigation\("partner", id, companyMode\)/);
  const hub = fs.readFileSync(path.resolve(__dirname, '../src/components/company-stock-hub.tsx'), 'utf8');
  assert.doesNotMatch(hub, /"\/fitness\/estoque\/conferencia"/);
});
