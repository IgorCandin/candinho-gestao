/* eslint-disable @typescript-eslint/no-require-imports -- Isolated event fixture. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');

function fixture(run) {
  const events=new Map(), effects=[];
  let open=true, focused=0;
  class Node {}
  const target=new Node();
  const menu={contains:node=>node===target,removeAttribute:()=>{open=false},querySelector:()=>({focus:()=>focused++})};
  global.Node=Node;
  global.document={activeElement:target,querySelectorAll:selector=>{
    assert.match(selector,/details\.company-account-menu\[open\]/);
    return open?[menu]:[];
  },addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key)};
  const file=path.resolve(__dirname,'../src/components/dismissible-menu-guard.tsx');
  const loaded=new Module(file,module);
  loaded.require=id=>id==='react'?{useEffect:fn=>effects.push(fn)}:require(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
  let cleanup;
  try {
    loaded.exports.DismissibleMenuGuard(); cleanup=effects[0]();
    run({events,target,Node,isOpen:()=>open,focused:()=>focused});
  } finally {cleanup?.();assert.equal(events.size,0);delete global.Node;delete global.document;}
}
function event(overrides={}) {return {prevented:false,preventDefault(){this.prevented=true},stopPropagation(){},stopImmediatePropagation(){},...overrides};}

test('account menu closes on Escape and returns focus to its summary',()=>fixture(f=>{
  const e=event({key:'Escape'});f.events.get('keydown')(e);
  assert.equal(f.isOpen(),false);assert.equal(f.focused(),1);assert.equal(e.prevented,true);
}));
test('outside touch closes account menu without activating the button behind it',()=>fixture(f=>{
  const inside=event({target:f.target});f.events.get('pointerdown')(inside);assert.equal(f.isOpen(),true);
  const outside=event({target:new f.Node()});f.events.get('pointerdown')(outside);
  assert.equal(f.isOpen(),false);assert.equal(outside.prevented,true);
  const click=event();f.events.get('click')(click);assert.equal(click.prevented,true);
  const next=event();f.events.get('click')(next);assert.equal(next.prevented,false);
}));
test('Escape handled by another control does not close the menu or move focus',()=>fixture(f=>{
  f.events.get('keydown')(event({key:'Escape',defaultPrevented:true}));
  assert.equal(f.isOpen(),true);assert.equal(f.focused(),0);
}));
