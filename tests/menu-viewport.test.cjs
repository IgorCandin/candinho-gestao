/* eslint-disable @typescript-eslint/no-require-imports -- Isolated DOM fixture; no network. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
test('menu height respects a reduced visual viewport and cleanup',()=>{
  const effects=[],frames=[],values=new Map(),listeners=new Map();
  const panel={style:{removeProperty:k=>values.delete(k),setProperty:(k,v)=>values.set(k,v)},getBoundingClientRect:()=>({top:80})};
  const viewportEvents=new Map();
  const viewport={offsetTop:0,height:200,addEventListener:(key,fn)=>viewportEvents.set(key,fn),removeEventListener:key=>viewportEvents.delete(key)};
  global.window={visualViewport:viewport,innerHeight:600,addEventListener(){},removeEventListener(){}};
  global.document={querySelectorAll:selector=>selector.includes('panel')?[panel]:[],addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
  global.requestAnimationFrame=fn=>(frames.push(fn),frames.length);
  global.cancelAnimationFrame=()=>{};
  global.MutationObserver=class{observe(){} disconnect(){}};
  const file=path.resolve(__dirname,'../src/components/mobile-menu-viewport-guard.tsx');
  const loaded=new Module(file,module);
  loaded.require=id=>id==='react'?{useEffect:fn=>effects.push(fn)}:require(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
  let cleanup;
  try {
    loaded.exports.MobileMenuViewportGuard();cleanup=effects[0]();frames.shift()();
    assert.equal(values.get('--v4519-mobile-menu-max-height'),'112px');
    viewport.height=600;viewportEvents.get('resize')();frames.shift()();
    assert.equal(values.get('--v4519-mobile-menu-max-height'),'512px');
    viewport.height=50;viewportEvents.get('resize')();frames.shift()();
    assert.equal(values.get('--v4519-mobile-menu-max-height'),'0px');
    viewport.offsetTop=100;viewportEvents.get('scroll')();frames.shift()();
    assert.equal(values.get('--v4519-mobile-menu-max-height'),'62px');
  } finally {
    cleanup?.();assert.equal(listeners.size,0);assert.equal(viewportEvents.size,0);
    for(const key of ['window','document','requestAnimationFrame','cancelAnimationFrame','MutationObserver'])delete global[key];
  }
});
