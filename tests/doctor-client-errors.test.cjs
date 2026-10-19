/* eslint-disable @typescript-eslint/no-require-imports -- Probe lifecycle with isolated browser/telemetry fixture. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function fixture(enabled=true){
  const effects=[],listeners=new Map(),seen=new Map(),sent=[];
  const previous={window:global.window,document:global.document,fetch:global.fetch,Element:global.Element};
  class FixtureElement {constructor(tag,attributes={}){this.tagName=tag;this.attributes=attributes;}getAttribute(key){return this.attributes[key]??null;}}
  global.Element=FixtureElement;
  global.document={visibilityState:'visible'};
  global.window={innerWidth:390,innerHeight:844,location:{origin:'https://example.invalid'},navigator:{onLine:false,serviceWorker:{controller:null}},performance:{getEntriesByType:()=>[{type:'reload'}]},sessionStorage:{getItem:key=>seen.get(key),setItem:(key,value)=>seen.set(key,value)},setTimeout:()=>1,clearTimeout(){},addEventListener:(name,handler,capture)=>listeners.set(name,{handler,capture}),removeEventListener:name=>listeners.delete(name)};
  global.fetch=async(url,options)=>{assert.equal(url,'/api/nexus/ux-health');sent.push(JSON.parse(options.body));return {ok:true};};
  const file=path.resolve(__dirname,'../src/components/nexus-ux-doctor-probe.tsx'),mod=new Module(file,module);
  mod.require=name=>name==='react'?{useEffect:fn=>effects.push(fn)}:name==='next/navigation'?{usePathname:()=>'/company/vendas/nova/suplementos'}:require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
  mod.exports.NexusUxDoctorProbe({enabled});const cleanup=effects[0]();
  return {sent,listeners,element:(...args)=>new FixtureElement(...args),error:event=>listeners.get('error').handler(event),reject:reason=>listeners.get('unhandledrejection').handler({reason}),finish(){cleanup?.();assert.equal(listeners.size,0);Object.assign(global,previous);}};
}
test('client error retains React message and captures bounded technical context/digest',()=>{
  const h=fixture();try{const error=Object.assign(new Error('React hydration failed'),{digest:'713812592@E394'});h.error({message:'React hydration failed',filename:'https://example.invalid/_next/static/chunks/code.js',lineno:1,colno:20,error});
    const payload=h.sent[0].payload;assert.ok(payload.message.includes('React hydration failed'));assert.equal(payload.digest,'713812592@E394');assert.equal(payload.online,false);assert.equal(payload.navigation_type,'reload');assert.equal(payload.visibility,'visible');assert.equal(payload.service_worker_controlled,false);
    assert.equal(payload.stack,undefined);assert.equal(payload.cookies,undefined);
  }finally{h.finish();}
});
test('failed interface script is captured without URL query/hash or click suppression',()=>{
  const h=fixture();try{assert.equal(h.listeners.get('error').capture,true);h.error({target:h.element('SCRIPT',{src:'/_next/static/chunks/code.js?token=SECRET#private'})});
    assert.equal(h.sent.length,1);assert.equal(h.sent[0].payload.source,'resource_error');assert.equal(h.sent[0].payload.resource_path,'/_next/static/chunks/code.js');assert.ok(!JSON.stringify(h.sent).includes('SECRET'));
  }finally{h.finish();}
});
test('resource capture ignores product images, external URLs and non-interface scripts',()=>{
  const h=fixture();try{for(const [tag,attrs]of[['IMG',{src:'https://example.invalid/customer.jpg'}],['SCRIPT',{src:'https://external.invalid/_next/static/chunks/code.js'}],['SCRIPT',{src:'/api/customer?token=PRIVATE'}]])h.error({target:h.element(tag,attrs)});assert.equal(h.sent.length,0);}finally{h.finish();}
});
test('stylesheet failure is captured and repeated asset failure remains deduplicated',()=>{
  const h=fixture();try{const target=h.element('LINK',{rel:'stylesheet',href:'https://example.invalid/_next/static/chunks/style.css?private=NO'});h.error({target});h.error({target});assert.equal(h.sent.length,1);assert.equal(h.sent[0].payload.resource_path,'/_next/static/chunks/style.css');assert.ok(h.sent[0].payload.message.includes('style.css'));assert.ok(!JSON.stringify(h.sent).includes('private'));}finally{h.finish();}
});
test('promise rejection remains visible, malformed digest excluded, disabled probe does not listen',()=>{
  const h=fixture();try{h.reject(Object.assign(new TypeError('Load failed'),{digest:'customer@example.invalid'}));assert.equal(h.sent[0].payload.message,'Load failed');assert.equal(h.sent[0].payload.source,'unhandledrejection');assert.equal(h.sent[0].payload.digest,null);}finally{h.finish();}
  const disabled=fixture(false);try{assert.equal(disabled.listeners.size,0);assert.equal(disabled.sent.length,0);}finally{disabled.finish();}
});
