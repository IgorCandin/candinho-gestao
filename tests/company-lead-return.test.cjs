/* eslint-disable @typescript-eslint/no-require-imports -- Fictitious component state; no API, storage or database. */
const assert = require('node:assert/strict'), test = require('node:test'), React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { load, common, ids } = require('./helpers/company-navigation-fixtures.cjs');

function fixture(companyMode = true, mode = 'product') {
  const states = [mode, ids.customer, ids.product, 'flavor-fixture', 'combo-fixture', { [ids.product]: 'flavor-fixture' }, 'Decidindo', 'Observação fictícia', '2026-11-03', false, false, null, [{ id: 'flavor-fixture', productId: ids.product, name: 'Sabor fictício' }], [{ id: 'combo-fixture', name: 'Combo fictício', items: [] }]];
  let index = 0, refreshed = 0;
  const Form = load('src/components/new-lead-form.tsx', {
    ...common,
    react: { ...React, useState(initial) { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; }, useEffect() {}, useMemo: fn => fn() },
    'next/navigation': { useRouter: () => ({ refresh() { refreshed++; }, push() { throw Error('No navigation on refresh'); } }) },
    '@/lib/supabase/client': { createClient() { throw Error('No network in read-only fixture'); } },
  }).NewLeadForm;
  let customers = [{ id: ids.customer, name: 'Pessoa fictícia', city: null }];
  return { render() { index = 0; return Form({ customers, products: [{ id: ids.product, name: 'Produto fictício' }], companyMode }); }, states, get refreshed() { return refreshed; }, addCustomer() { customers = [...customers, { id: 'new-fixture', name: 'Pessoa nova fictícia', city: null }]; } };
}
function find(tree, predicate) { if (!tree || typeof tree !== 'object') return null; if (predicate(tree)) return tree; for (const child of React.Children.toArray(tree.props?.children)) { const match = find(child, predicate); if (match) return match; } return null; }

test('Cadastro Company abre aba separada; legado mantém navegação anterior e não ganha refresh', () => {
  for (const companyMode of [true, false]) {
    const f = fixture(companyMode), tree = f.render();
    const link = find(tree, node => node.props?.href === (companyMode ? '/company/clientes/novo' : '/clientes/novo'));
    assert.equal(link.props.target, companyMode ? '_blank' : undefined);
    assert.equal(link.props.rel, companyMode ? 'noopener noreferrer' : undefined);
    const button = find(tree, node => node.type === 'button' && node.props.children === 'Atualizar lista de clientes');
    assert.equal(Boolean(button), companyMode);
    if (companyMode) { assert.equal(button.props.type, 'button'); assert.match(renderToStaticMarkup(tree), /Fechar ou recarregar esta aba descarta o rascunho/); }
  }
});

for (const mode of ['product', 'combo']) test(`Atualizar clientes não grava, seleciona automaticamente nem perde rascunho ${mode}`, () => {
  const f = fixture(true, mode), before = structuredClone(f.states);
  const button = find(f.render(), node => node.type === 'button' && node.props.children === 'Atualizar lista de clientes');
  assert.ok(button, 'Refresh must be an explicit non-submitting Company action'); button.props.onClick();
  assert.equal(f.refreshed, 1);
  f.addCustomer(); const tree = f.render();
  assert.match(renderToStaticMarkup(tree), /Pessoa nova fictícia/);
  assert.deepEqual(f.states, before);
  const customerSelect = find(tree, node => node.type === 'select' && node.props.value === ids.customer);
  assert.equal(customerSelect.props.value, ids.customer);
});
