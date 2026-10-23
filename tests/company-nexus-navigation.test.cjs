/* eslint-disable @typescript-eslint/no-require-imports -- Isolated navigation fixture; no API or database. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function source(file) { return fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'); }
function loadFunction(file, name, dependencies = {}) {
  const ast = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, `${name} exists in ${file}`);
  const code = ts.transpileModule(declaration.getText(ast).replace(/^export /, ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return vm.runInNewContext(`${code}\n${name}`, dependencies);
}
const companyDestination = loadFunction('lib/company-destination.ts', 'companyDestination');

for (const file of ['components/nexus-command-palette.tsx', 'components/nexus-personal-keyboard.tsx']) {
  test(`${file}: context is limited to Company and preserves query/hash`, () => {
    const href = loadFunction(file, 'navigationHref', { companyDestination });
    for (const current of ['/company', '/company/inicio', '/company/gestao/central/busca']) {
      assert.equal(href(current, '/vendas/nova?cliente=fixture#itens'), '/company/vendas/nova/suplementos?cliente=fixture#itens');
      assert.equal(href(current, '/fitness/clientes/11111111-1111-1111-1111-111111111111'), '/company/clientes/fitness/11111111-1111-1111-1111-111111111111');
      assert.equal(href(current, '/central/agenda?dia=2026-10-23'), '/company/gestao/central/agenda?dia=2026-10-23');
    }
    for (const current of ['/company-other', '/companyx/inicio', '/fitness', '/suplementos/hoje', '/bank']) {
      assert.equal(href(current, '/vendas/nova?cliente=fixture'), '/vendas/nova?cliente=fixture');
    }
  });
  test(`${file}: unknown destinations and lead registration are not replaced`, () => {
    const href = loadFunction(file, 'navigationHref', { companyDestination });
    for (const target of ['/leads/novo', '/leads/novo?cliente=fixture#dados', '/suplementos/leads/novo', '/suplementos/leads/novo#dados', '/nexus/rotinas', '/bank/planejamento', '/company/clientes', 'https://example.invalid/']) {
      assert.equal(href('/company/inicio', target), target);
    }
  });
}

test('palette maps only navigation anchors, leaving pin identity and action previews untouched', () => {
  const text = source('components/nexus-command-palette.tsx');
  const ast = ts.createSourceFile('palette.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let links = 0;
  let pins = 0;
  function walk(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(ast);
      const href = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(ast) === 'href');
      if (tag === 'Link') {
        links++;
        assert.match(href?.initializer?.getText(ast) ?? '', /^\{navigationHref\(pathname, /);
      }
      if (tag === 'NexusPinShortcutButton') {
        pins++;
        assert.doesNotMatch(href?.initializer?.getText(ast) ?? '', /navigationHref/);
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(ast);
  assert.equal(links, 5);
  assert.equal(pins, 3);
  assert.match(text, /actionKind="create_operational_task"/);
  assert.match(text, /nexusCommandRoutesForAccess\(access\)/);
});

test('keyboard maps the navigation target and refreshes listener when Company context changes', () => {
  const text = source('components/nexus-personal-keyboard.tsx');
  assert.match(text, /router\.push\(navigationHref\(pathname, shortcut\.href\)\)/);
  assert.match(text, /\[enabled, pathname, router, shortcuts\]/);
  assert.match(text, /if \(isTypingTarget\(event\.target\)\) return/);
  assert.match(text, /void recordUse\(shortcut\.id\)/);
});
