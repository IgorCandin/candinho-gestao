const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');
const moduleValue = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/storefront-discovery-selection.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,{module:moduleValue,exports:moduleValue.exports});
const { availableSizes, discoveryCollections, carouselTime } = moduleValue.exports;
test('sizes only include distinct positive-stock options and no supplements',()=>{
 const availability={p:[{size:'G',available_quantity:1},{size:'P',available_quantity:0},{size:'M',available_quantity:2},{size:'G',available_quantity:3}]};
 assert.deepEqual(Array.from(availableSizes({id:'p',operation:'fitness',available:true},availability)),['M','G']);
 assert.equal(availableSizes({id:'p',operation:'fitness',available:false},availability).length,0);
 assert.equal(availableSizes({id:'p',operation:'supplements',available:true},availability).length,0);
});
test('Força starts the collections and Candinho creatine starts Força without mutating input',()=>{
 const products=[{id:'a',name:'Abduzido',category:'Energia',operation:'supplements'},{id:'b',name:'Creatina Growth',category:'Força',operation:'supplements'},{id:'c',name:'Creatina 300g | Candinho Suplementos',category:'Força',operation:'supplements'}];
 const groups=discoveryCollections(products);
 assert.equal(groups[0][0],'Força');assert.equal(groups[0][1][0].id,'c');assert.equal(products[0].id,'a');assert.equal(groups.flatMap(([,items])=>items).length,3);
});
test('dragging wraps in both directions without a blank interval',()=>{
 assert.equal(carouselTime(-100,1000),900);assert.equal(carouselTime(1200,1000),200);assert.equal(carouselTime(1000,1000),0);assert.equal(carouselTime(10,0),0);
});

