/* eslint-disable @typescript-eslint/no-require-imports -- Fictitious component contracts; no network or database. */
const assert = require('node:assert/strict');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { load, common, ids } = require('./helpers/company-navigation-fixtures.cjs');

function shared({ drafts = true, failure = null, company = true, allowRelationships = true, affiliation = false } = {}) {
  const states = [], pushes = [], calls = [], refs = []; let cursor = 0, refCursor = 0;
  const defaults = { 10: drafts ? [{ key: 'r', related_customer_id: ids.customer, relation_type: 'friend', relation_label: null }] : [] };
  if (affiliation) defaults[14] = [{ key: 'p', partner_id: 'partner-fixture', relation_type: 'student_of_partner', relation_label: null, counts_for_partnership: true, auto_attribute_sales: true, is_primary: true, priority: 200 }];
  const Form = load('src/components/new-customer-form.tsx', {
    ...common,
    react: { ...React, useState(value) { const i = cursor++; if (!(i in states)) states[i] = i in defaults ? defaults[i] : value; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; }, useRef(value) { const i = refCursor++; return refs[i] ??= { current: value }; }, useMemo: fn => fn() },
    'next/navigation': { useRouter: () => ({ push: href => pushes.push(href), refresh() {} }) },
    '@/lib/supabase/client': { createClient: () => ({ rpc: async (...args) => { calls.push(args); return { data: ids.customer, error: null }; } }) },
  }).NewCustomerForm;
  const props = { customers: [], partners: [], companyMode: company, allowRelationships, createCustomer: company ? async () => { calls.push('resolve'); return { id: ids.customer, name: 'Pessoa resolvida fictícia' }; } : undefined };
  const previousFetch = global.fetch;
  global.fetch = async (...args) => { calls.push(args); if (failure === 'network') throw Error('offline'); return { ok: failure !== 'http' }; };
  return { render() { cursor = 0; refCursor = 0; return Form(props); }, pushes, calls, states, close() { global.fetch = previousFetch; } };
}

test('Company compõe editor legado sem trocar seu resolvedor e oculta vínculos para escrita somente Fitness', () => {
  let captured;
  const Form = load('src/components/company-new-customer-form.tsx', {
    './company-customer-drafts.css': {},
    react: React, 'next/navigation': { useRouter: () => ({ push() {}, refresh() {} }) },
    '@/lib/supabase/client': { createClient() { throw Error('no read on render'); } },
    '@/components/new-customer-form': { NewCustomerForm: props => { captured = props; return React.createElement('section', null, 'Editor compartilhado'); } },
  }).CompanyNewCustomerForm;
  renderToStaticMarkup(React.createElement(Form, { canWriteSupplements: true, canWriteFitness: true, customers: [], partners: [] }));
  assert.equal(captured.companyMode, true); assert.equal(captured.allowRelationships, true); assert.equal(typeof captured.createCustomer, 'function');
  renderToStaticMarkup(React.createElement(Form, { canWriteSupplements: false, canWriteFitness: true, customers: [], partners: [] }));
  assert.equal(captured.allowRelationships, false);
});

test('Company exige confirmação da identidade resolvida antes de aplicar vínculos, sem criar duas vezes', async () => {
  const fixture = shared();
  try {
    await fixture.render().props.onSubmit({ preventDefault() {} });
    assert.deepEqual(fixture.calls, ['resolve']); assert.deepEqual(fixture.pushes, []);
    const tree = fixture.render();
    assert.match(renderToStaticMarkup(tree), /Pessoa resolvida fictícia/);
    await tree.props.onSubmit({ preventDefault() {} });
    assert.equal(fixture.calls.filter(x => x === 'resolve').length, 1);
    assert.equal(JSON.parse(fixture.calls[1][1].body).relationships[0].relation_type, 'friend');
    assert.deepEqual(fixture.pushes, [`/company/clientes/${ids.customer}`]);
  } finally { fixture.close(); }
});

for (const failure of ['http', 'network']) test(`Falha ${failure} de vínculos preserva rascunhos na Company sem recriar cadastro ou afirmar sucesso`, async () => {
  const fixture = shared({ failure });
  try { await fixture.render().props.onSubmit({ preventDefault() {} }); await fixture.render().props.onSubmit({ preventDefault() {} }); assert.deepEqual(fixture.pushes, []); assert.equal(fixture.calls.filter(x => x === 'resolve').length, 1); assert.match(fixture.states[6], /rascunhos continuam aqui/); assert.equal(fixture.states[10].length, 1); assert.match(renderToStaticMarkup(fixture.render()), /Abrir ficha para conferir/); } finally { fixture.close(); }
});

test('Sem rascunhos Company vai à ficha diretamente; legado mantém RPC e destino originais', async () => {
  for (const company of [true, false]) {
    const fixture = shared({ drafts: false, company });
    try { await fixture.render().props.onSubmit({ preventDefault() {} }); assert.deepEqual(fixture.pushes, [`${company ? '/company' : ''}/clientes/${ids.customer}`]); assert.equal(fixture.calls[0] === 'resolve', company); } finally { fixture.close(); }
  }
});

test('Afiliação conserva flags do editor existente e não envia vínculo sem gate Suplementos', async () => {
  for (const allowRelationships of [true, false]) {
    const fixture = shared({ drafts: false, affiliation: true, allowRelationships });
    try {
      await fixture.render().props.onSubmit({ preventDefault() {} });
      if (allowRelationships) {
        await fixture.render().props.onSubmit({ preventDefault() {} });
        assert.deepEqual(JSON.parse(fixture.calls[1][1].body).affiliations, [{ partner_id: 'partner-fixture', relation_type: 'student_of_partner', relation_label: null, counts_for_partnership: true, auto_attribute_sales: true, is_primary: true, priority: 200 }]);
      } else assert.deepEqual(fixture.calls, ['resolve']);
    } finally { fixture.close(); }
  }
});

test('Página consulta opções somente depois do gate; escrita apenas Fitness não recebe CRM Suplementos', async () => {
  for (const supplements of [true, false]) {
    const calls = [];
    const Page = load('src/app/(app)/company/clientes/novo/page.tsx', {
      'next/navigation': { redirect() { throw Error('redirect'); } },
      '@/components/company-new-customer-form': { CompanyNewCustomerForm: props => React.createElement('p', null, `${props.customers.length}/${props.partners.length}`) },
      '@/lib/data': { getCurrentUserAccess: async () => ({ active: true, canWriteSupplements: supplements, canWriteFitness: true }), getCustomerOptions: async () => { calls.push('customers'); return [{ id: ids.customer, name: 'Pessoa fictícia' }]; } },
      '@/lib/supabase/server': { createClient: async () => ({ from(table) { calls.push(table); return { select: () => ({ eq: () => ({ neq: () => ({ order: async () => ({ data: [{ id: 'partner' }], error: null }) }) }) }) }; } }) },
    }).default;
    assert.match(renderToStaticMarkup(await Page()), supplements ? /1\/1/ : /0\/0/);
    assert.deepEqual(calls, supplements ? ['customers', 'partners'] : []);
  }
});

test('Company reutiliza core resolvido mesmo se a leitura de nome falhar; nunca reexecuta criação no retry', async () => {
  const states = [], refs = [], calls = []; let cursor = 0, refCursor = 0, readFailed = false;
  const client = {
    rpc: async (rpc, args) => { calls.push([rpc, args]); return { data: 'fitness-fixture', error: null }; },
    from: table => ({ select: () => ({ eq: () => ({ single: async () => {
      if (table === 'fitness_customers') return { data: { core_customer_id: ids.customer }, error: null };
      if (!readFailed) { readFailed = true; return { data: null, error: Error('temporary read') }; }
      return { data: { name: 'Pessoa resolvida' }, error: null };
    } }) }) }),
  };
  const Form = load('src/components/company-new-customer-form.tsx', {
    './company-customer-drafts.css': {},
    react: { ...React, useState(value) { const i = cursor++; return [states[i] ??= value, next => { states[i] = next; }]; }, useRef(value) { const i = refCursor++; return refs[i] ??= { current: value }; } },
    '@/lib/supabase/client': { createClient: () => client },
    '@/components/new-customer-form': { NewCustomerForm: () => null },
  }).CompanyNewCustomerForm;
  const render = () => { cursor = 0; refCursor = 0; return Form({ canWriteSupplements: true, canWriteFitness: true }).props.children.props; };
  await assert.rejects(render().createCustomer, /temporary read/);
  assert.deepEqual(await render().createCustomer(), { id: ids.customer, name: 'Pessoa resolvida' });
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 'fitness_resolve_customer');
  assert.equal(calls[0][1].p_source, 'Candinho Company');
});
