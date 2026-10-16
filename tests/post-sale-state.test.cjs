const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const file = path.resolve(__dirname, '../src/lib/post-sale-state.ts');
const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const compiled = new Module(file, module);
compiled._compile(code, file);
const { postSaleTiming } = compiled.exports;

test('cancelled contacts never return to action, even with an overdue date', () => {
  for (const due_on of ['2026-06-04', '2026-10-16', '2026-11-01', null]) {
    assert.equal(postSaleTiming({ status: 'cancelled', due_on }, '2026-10-16'), 'cancelled');
  }
});
test('completed contacts stay completed rather than returning to the overdue queue', () => {
  assert.equal(postSaleTiming({ status: 'completed', due_on: '2026-09-30' }, '2026-10-16'), 'completed');
});
test('planned contacts preserve overdue, today and upcoming boundaries', () => {
  for (const [due_on, expected] of [['2026-10-15','overdue'],['2026-10-16','today'],['2026-10-17','upcoming'],[null,'upcoming']]) {
    assert.equal(postSaleTiming({ status: 'planned', due_on }, '2026-10-16'), expected);
  }
});
