const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const rows = require('../src/lib/storefront-supplement-cutouts.json');
const moduleUnderTest = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('src/lib/storefront-discovery-images.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop:true } }).outputText;
vm.runInNewContext(source, { module: moduleUnderTest, exports: moduleUnderTest.exports, require: name => require(path.resolve('src/lib',name)) });
const { discoveryCutout, discoveryImage } = moduleUnderTest.exports;

test('all new cutouts and display variants exist and match the original product photo', () => {
  assert.equal(rows.length,31);
  for (const row of rows) {
    const product = { id:row.id, image_url:`https://example.test/products/${row.source}` };
    assert.equal(discoveryCutout(product),row.asset);
    assert.equal(discoveryImage(product),row.display);
    assert.ok(fs.existsSync(path.join('public',row.asset)));
    assert.ok(fs.existsSync(path.join('public',row.display)));
  }
});
test('a changed source photo never reuses an older cutout', () => {
  const product = { id:rows[0].id, image_url:'https://example.test/new-photo.webp' };
  assert.equal(discoveryCutout(product),undefined);
  assert.equal(discoveryImage(product),product.image_url);
});
test('a different product cannot inherit another product cutout', () => {
  assert.equal(discoveryCutout({ id:'different-product', image_url:`https://example.test/${rows[0].source}` }),undefined);
});
