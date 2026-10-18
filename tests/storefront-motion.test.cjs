const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(reduced) {
 const preference=new EventTarget();preference.matches=reduced;
 let listener;let cleanup;const value={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/use-storefront-motion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
 module:value,exports:value.exports,window:{matchMedia:()=>preference},require(){return {useSyncExternalStore(subscribe,snapshot,server){assert.equal(server(),false);cleanup=subscribe(()=>{listener=true});return snapshot()}}}
 });return {read:()=>value.exports.useStorefrontMotion().enabled,preference,changed:()=>listener,close:()=>cleanup()};
}
test('motion follows the device without consulting the removed pause control',()=>{const f=fixture(false);assert.equal(f.read(),true);f.preference.matches=true;f.preference.dispatchEvent(new Event('change'));assert.equal(f.changed(),true);assert.equal(f.read(),false);f.close()});
test('reduced motion remains respected',()=>{const f=fixture(true);assert.equal(f.read(),false);f.close()});
