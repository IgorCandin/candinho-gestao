const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture(reduced, blocked = false) {
  const preference = new EventTarget(); preference.matches = reduced;
  const window = new EventTarget(); window.matchMedia = () => preference;
  const values = new Map(); let notifications = 0; let server;
  const cleanups = [];
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('src/components/use-storefront-motion.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports, window, Event,
    localStorage: { getItem(key) { if (blocked) throw Error('blocked'); return values.get(key); }, setItem(key,value) { if (blocked) throw Error('blocked'); values.set(key,value); } },
    require(name) { assert.equal(name,'react'); return { useSyncExternalStore(subscribe, snapshot, serverSnapshot) { server = serverSnapshot(); cleanups.push(subscribe(() => notifications++)); return snapshot(); } }; },
  });
  return { read: () => module.exports.useStorefrontMotion(), preference, values, notifications: () => notifications, server: () => server, close: () => cleanups.forEach(cleanup => cleanup()) };
}
test('system motion preference is respected until the visitor chooses', () => {
  const f = fixture(false);
  assert.equal(f.read().enabled,true); assert.equal(f.server(),false);
  f.preference.matches = true; f.preference.dispatchEvent(new Event('change'));
  assert.equal(f.read().enabled,false); assert.ok(f.notifications() > 0); f.close();
});
test('explicit activation works with reduced motion and can be paused again', () => {
  const f = fixture(true); assert.equal(f.read().enabled,false);
  f.read().toggle(); assert.equal(f.read().enabled,true);
  assert.equal(f.values.get('candinho:storefront-motion'),'on');
  f.preference.matches = false; f.read().toggle(); assert.equal(f.read().enabled,false); f.close();
});
test('blocked storage still allows a choice during the visit', () => {
  const f = fixture(true,true); f.read().toggle(); assert.equal(f.read().enabled,true);
  f.read().toggle(); assert.equal(f.read().enabled,false); f.close();
});
