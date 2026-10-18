/* eslint-disable @typescript-eslint/no-require-imports -- No DOM/network dependencies: isolated hook lifecycle fixture. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
function fixture() {
  const effects=[], listeners=new Map(); let closed=0;
  const doc={body:{style:{overflow:'auto'}},activeElement:null,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name)};
  const control=()=>({isConnected:true,getClientRects:()=>[{}],matches:()=>false,focus(){doc.activeElement=this;},closest(){return null;}});
  const trigger=control(), first=control(), last=control();doc.activeElement=trigger;
  const root={contains:node=>node===first||node===last||node===root,querySelectorAll:()=>[first,last],focus(){doc.activeElement=root;},closest(){return root;}};
  first.closest=last.closest=()=>root;
  const file=path.resolve(__dirname,'../src/components/use-modal-focus.ts');
  const loaded=new Module(file,module);
  loaded.require=id=>id==='react'?{useRef:value=>({current:value}),useEffect:fn=>effects.push(fn)}:require(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
  return {doc,root,trigger,first,last,listeners,open(active=true){global.document=doc;const ref=loaded.exports.useModalFocus(active,()=>closed++);ref.current=root;const cleanups=effects.map(fn=>fn());return ()=>{cleanups.reverse().forEach(fn=>fn?.());delete global.document;};},closed:()=>closed};
}
test('modal focuses its close control, traps Tab both ways and restores focus/scroll on cleanup',()=>{
  const h=fixture(),cleanup=h.open();
  try { assert.equal(h.doc.activeElement,h.first);assert.equal(h.doc.body.style.overflow,'hidden');
    h.last.focus();let prevented=false;h.listeners.get('keydown')({key:'Tab',shiftKey:false,preventDefault(){prevented=true;}});
    assert.equal(h.doc.activeElement,h.first);assert.equal(prevented,true);
    h.first.focus();h.listeners.get('keydown')({key:'Tab',shiftKey:true,preventDefault(){}});assert.equal(h.doc.activeElement,h.last);
  } finally {cleanup();}
  assert.equal(h.doc.activeElement,h.trigger);assert.equal(h.doc.body.style.overflow,'auto');assert.equal(h.listeners.size,0);
});
test('Escape requests close without submitting; closed modal does not lock the page',()=>{
  const h=fixture(),cleanup=h.open();
  try {h.listeners.get('keydown')({key:'Escape',preventDefault(){},stopPropagation(){}});assert.equal(h.closed(),1);} finally {cleanup();}
  const inactive=fixture(),finish=inactive.open(false);try{assert.equal(inactive.doc.body.style.overflow,'auto');assert.equal(inactive.listeners.size,0);}finally{finish();}
});
