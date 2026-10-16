const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const file = path.resolve(__dirname, '../src/components/company-office-scene.tsx');
const compiled = new Module(file, module);
compiled.require = id => id === './company-office-scene.css' ? {} : id === 'next/navigation' ? { useRouter: () => ({ refresh() {} }) } : id === 'next/link' ? { __esModule: true, default: ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children) } : require(id);
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
const Scene = compiled.exports.CompanyOfficeScene;
const render = rooms => renderToStaticMarkup(React.createElement(Scene, { rooms, consulted: '16/10/2026' }));
test('office renders real pending count and origin link without simulated resolution', () => {
  const html = render([{ name: 'Fitness', color: '#bda2e8', signals: [{ label: 'Entregas', count: 3, href: '/company/concluir?operacao=Fitness' }] }]);
  assert.match(html, /3 registro/);
  assert.match(html, /operacao=Fitness/);
  assert.doesNotMatch(html, /Simular resolução|Lia|Davi/);
});
test('zero is not a task; unavailable is not presented as zero', () => {
  assert.match(render([{ name: 'Bank', color: '#8abde3', signals: [{ label: 'Vencidas', count: 0, href: '/bank/planejamento' }] }]), /Sem pendências nos indicadores/);
  const unknown = render([{ name: 'Bank', color: '#8abde3', signals: [{ label: 'Vencidas', count: null, href: '/bank/planejamento' }] }]);
  assert.match(unknown, /Consulta indisponível/);
  assert.doesNotMatch(unknown, /Sem pendências nos indicadores/);
});
test('no accessible rooms shows empty state, not sample data', () => {
  const html = render([]);
  assert.match(html, /Nenhuma operação disponível/);
  assert.doesNotMatch(html, /co-agent|pendências fictícias/);
});

test('room selection, close/reopen, Escape and refresh retain read-only behavior', () => {
  const slots = []; let cursor = 0; let refreshed = 0; let focused = 0;
  const hooks = { ...React, useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; }, useRef() { const i = cursor++; if (!(i in slots)) slots[i] = { current: null }; return slots[i]; }, useTransition() { return [false, callback => callback()]; } };
  const local = new Module(file, module);
  local.require = id => id === 'react' ? hooks : id === './company-office-scene.css' ? {} : id === 'next/navigation' ? { useRouter: () => ({ refresh() { refreshed++; } }) } : require(id);
  local._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  const rooms = ['Fitness', 'Bank'].map(name => ({ name, color: '#abc', signals: [{ label: 'Pendência', count: 1, href: '/company/concluir' }] }));
  function tree() { cursor = 0; return local.exports.CompanyOfficeScene({ rooms, consulted: 'agora' }); }
  function nodes(node) { if (!node || typeof node !== 'object') return []; return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)]; }
  global.window = { matchMedia: () => ({ matches: false }) };
  try {
    let view = tree();
    nodes(view).find(n => n.type === 'button' && n.props.children === 'Bank').props.onClick({ currentTarget: { focus() { focused++; } } });
    view = tree();
    assert.equal(slots[0], 'Bank');
    nodes(view).find(n => n.props['aria-label'] === 'Fechar painel de pendências').props.onClick();
    view = tree(); assert.equal(nodes(view).find(n => n.type === 'aside').props.hidden, true);
    nodes(view).find(n => n.type === 'button' && n.props.children === 'Fitness').props.onClick({ currentTarget: { focus() { focused++; } } });
    view = tree(); assert.equal(nodes(view).find(n => n.type === 'aside').props.hidden, false);
    view.props.onKeyDown({ key: 'Escape', preventDefault() {} });
    view = tree(); assert.equal(nodes(view).find(n => n.type === 'aside').props.hidden, true);
    nodes(view).find(n => n.props.className === 'co-refresh').props.onClick();
    assert.equal(refreshed, 1); assert.equal(focused, 2);
  } finally { delete global.window; }
});
