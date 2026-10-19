/* eslint-disable @typescript-eslint/no-require-imports -- Tests the local CommonJS CLI with disposable files only. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verifySetup } = require('../scripts/verify-agent-setup.cjs');
test('instruction examples are not ERP runtime TypeScript inputs',()=>{
  const config=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../tsconfig.json'),'utf8'));
  assert.ok(config.exclude.includes('.agents/**'));
  assert.ok(config.include.includes('**/*.tsx'));
  assert.notEqual(config.compilerOptions.ignoreBuildErrors,true);
});
function fixture(t, amend = value => value, text = '---\nname: sample\ndescription: Local fixture\n---\n') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'candinho-skill-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.agents/skills/sample'), { recursive: true });
  fs.writeFileSync(path.join(root, '.agents/skills/sample/SKILL.md'), text);
  const skill = { directory: 'sample', name: 'sample', revision: 'a'.repeat(40), repo: 'owner/repo' };
  fs.writeFileSync(path.join(root, '.agents/tooling-lock.json'), JSON.stringify(amend({ schemaVersion: 1, skills: [skill] })));
  return root;
}
test('setup verification is repeatable and does not mutate installed files', t => {
  const root = fixture(t), file = path.join(root, '.agents/tooling-lock.json');
  const before = fs.readFileSync(file, 'utf8');
  assert.deepEqual(verifySetup(root), ['sample']);
  assert.deepEqual(verifySetup(root), ['sample']);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});
test('setup rejects traversal before reading outside the skill root', t => {
  const root = fixture(t, value => { value.skills[0].directory = '../outside'; return value; });
  assert.throws(() => verifySetup(root), /Invalid skill name\/path/);
});
test('setup rejects duplicate discovery names and mutable source refs', t => {
  const duplicate = fixture(t, value => { value.skills.push({ ...value.skills[0] }); return value; });
  assert.throws(() => verifySetup(duplicate), /Duplicate skill/);
  const mutable = fixture(t, value => { value.skills[0].revision = 'main'; return value; });
  assert.throws(() => verifySetup(mutable), /Unpinned/);
});
test('setup rejects a mismatched SKILL frontmatter', t => {
  assert.throws(() => verifySetup(fixture(t, value => value, '---\nname: other\ndescription: test\n---')), /Invalid frontmatter/);
});
test('setup rejects metadata only in the Markdown body', t => {
  const root = fixture(t, value => value, '---\n# empty header\n---\nname: sample\ndescription: Only in body\n');
  assert.throws(() => verifySetup(root), /Invalid frontmatter/);
});
test('setup rejects unterminated frontmatter', t => {
  const root = fixture(t, value => value, '---\nname: sample\ndescription: Not closed\n');
  assert.throws(() => verifySetup(root), /Invalid frontmatter/);
});
