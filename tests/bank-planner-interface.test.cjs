/* eslint-disable @typescript-eslint/no-require-imports -- Isolated CommonJS harness, no server actions or database. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(relative) {
  const file = path.resolve(__dirname, '../src', relative);
  const compiled = new Module(file, module);
  compiled.require = id => {
    if (id.endsWith('.css')) return {};
    if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (id.startsWith('@/app/')) return { confirmPlannerIncome: () => { throw new Error('No writes allowed'); } };
    if (id === '@/components/bank-mobile-agenda') return { BankMobileAgenda: () => null };
    if (id === '@/components/bank-installment-simulator') return { BankInstallmentSimulator: () => null };
    if (id.startsWith('@/')) return load(id.slice(2) + (id.includes('/components/') ? '.tsx' : '.ts'));
    return require(id);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  return compiled.exports;
}
const { BankMonthPlanner } = load('components/bank-month-planner.tsx');
const { BankPlanningIncomes } = load('components/bank-planning-incomes.tsx');
const data = { currentMonth: '2026-10-01', balance: 100, balanceDate: null, reserves: [], cards: [], warnings: [], canWrite: false, months: [{referenceMonth:'2026-10-01',label:'Outubro',incomes:[],rows:[{id:'fixture',amount:150,title:'Fixture',dueDate:null}]}] };
test('planner distinguishes a shortfall from surplus and preserves section anchors and editing link', () => {
  const deficit = renderToStaticMarkup(React.createElement(BankMonthPlanner, { data }));
  assert.match(deficit, /Falta para cobrir o mês/);
  assert.match(deficit, /50,00/);
  for (const anchor of ['bank-summary','bank-incomes','bank-simulator','bank-accounts']) assert.ok(deficit.includes(`href="#${anchor}"`));
  assert.ok(deficit.includes('href="/bank"'));
  assert.match(deficit, /1 compromisso\(s\) em aberto/);
  const surplus = renderToStaticMarkup(React.createElement(BankMonthPlanner, { data: {...data,balance:200} }));
  assert.match(surplus, /Sobra após os compromissos/);
});
test('income presentation retains state text and does not expose confirmation to read-only users', () => {
  const html = renderToStaticMarkup(React.createElement(BankPlanningIncomes, {month:'2026-10-01',canWrite:false,incomes:[{id:'i',sourceId:'fixture',title:'Fixture',amount:100,state:'pending',kind:'transfer'}]}));
  assert.match(html, /Previsto \/ a conferir/);
  assert.match(html, /Transferência, não renda/);
  assert.doesNotMatch(html, /Confirmar recebimento real|<form/);
  assert.ok(html.includes('href="/bank/entradas"'));
});
