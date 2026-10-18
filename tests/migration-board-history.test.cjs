const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const file = path.resolve(__dirname, '../src/components/migration-audit-board.tsx');
const compiled = new Module(file, module);
compiled.require = name => name === 'next/link' ? { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) } : name === '@/lib/supabase/client' ? { createClient() { throw Error('unexpected write'); } } : require(name);
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
test('approved rows remain stored but are hidden by default; pending is visible', () => {
  const rows = ['approved-area', 'pending-area'].map(key => ({ key, operation: 'supplements', area: key, description: '', legacyHref: '/suplementos', companyHref: '/company/inicio' }));
  const saved = [{ check_key: 'approved-area', state: 'approved', notes: 'Preservado' }];
  const html = renderToStaticMarkup(React.createElement(compiled.exports.MigrationAuditBoard, { rows, saved }));
  assert.doesNotMatch(html, /<h3>approved-area<\/h3>/);
  assert.match(html, /<h3>pending-area<\/h3>/);
  assert.match(html, /Mostrar histórico de resolvidos/);
  assert.equal(saved[0].notes, 'Preservado');
});

test('a grouped plan inherits approval only when every related user check is approved',()=>{
  const rows=[{key:'plan',operation:'company',area:'Grouped plan',description:'',legacyHref:'/company/mapa',companyHref:'/company/mapa',relatedKeys:['a','b']}];
  const render=saved=>renderToStaticMarkup(React.createElement(compiled.exports.MigrationAuditBoard,{rows,saved}));
  assert.match(render([{check_key:'a',state:'approved'}]),/<h3>Grouped plan<\/h3>/);
  const saved=[{check_key:'a',state:'approved'},{check_key:'b',state:'approved'}];
  assert.doesNotMatch(render(saved),/<h3>Grouped plan<\/h3>/);
  assert.match(render([...saved,{check_key:'plan',state:'issue',notes:'Regression'}]),/<h3>Grouped plan<\/h3>/);
  assert.equal(saved.length,2);
});
