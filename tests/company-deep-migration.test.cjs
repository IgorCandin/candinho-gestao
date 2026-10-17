const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
function load(relative,mocks={}){
  const file=path.resolve(__dirname,relative), compiled=new Module(file,module);
  compiled.require=id=>id in mocks?mocks[id]:require(id);
  compiled._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
  return compiled.exports;
}
const {companyDestination}=load('../src/lib/company-destination.ts');
function nodes(node){return !node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(nodes)];}
test('context links preserve queries, fragments and legacy behavior',()=>{
  let pathname='/company/gestao/central';
  const {default:Link}=load('../src/components/company-context-link.tsx',{'next/link':{__esModule:true,default:'a'},'next/navigation':{usePathname:()=>pathname},'@/lib/company-destination':{companyDestination}});
  assert.equal(Link({href:'/central/promocoes?page=2#produtos'}).props.href,'/company/gestao/central/promocoes?page=2#produtos');
  assert.equal(Link({href:'https://example.com'}).props.href,'https://example.com');
  assert.equal(Link({href:'/unmigrated'}).props.href,'/unmigrated');
  pathname='/central';assert.equal(Link({href:'/central/promocoes'}).props.href,'/central/promocoes');
});
test('form context controls only navigation, preserving the server action',()=>{
  const action=()=>{throw Error('must not execute while rendering');};
  const {default:Form}=load('../src/components/company-context-form.tsx',{'next/navigation':{usePathname:()=>'/company/gestao/central/promocoes'},'@/lib/company-destination':{companyDestination}});
  const view=Form({action,children:'fields'});
  assert.equal(view.props.action,action);
  assert.ok(nodes(view).some(n=>n.type==='input'&&n.props.name==='company_context'&&n.props.value==='1'));
  const search=Form({action:'/central/busca',method:'get'});
  assert.equal(search.props.action,'/company/gestao/central/busca');
  assert.ok(!nodes(search).some(n=>n.props.name==='company_context'));
});
function conversionHarness(error=null){
  let cursor=0,refreshes=0;const slots=[],calls=[];
  const hooks={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useMemo:fn=>fn()};
  const {FitnessConversionForm:Form}=load('../src/components/fitness-conversion-form.tsx',{react:hooks,'next/navigation':{useRouter:()=>({refresh(){refreshes++;}})},'@/lib/supabase/client':{createClient:()=>({rpc:async(name,params)=>{calls.push({name,params});return {error};}})}});
  const stock=['source','target'].map(id=>({variant_id:id,product_active:true,variant_active:true,product_name:id,size:'G',color:'Preto',physical_quantity:2}));
  return {calls,get refreshes(){return refreshes;},view(){cursor=0;return Form({stock});}};
}
test('Fitness conversion preserves the existing atomic RPC payload',async()=>{
  const h=conversionHarness();let selects=nodes(h.view()).filter(n=>n.type==='select');
  selects[0].props.onChange({target:{value:'source'}});selects[1].props.onChange({target:{value:'target'}});
  await h.view().props.onSubmit({preventDefault(){}});
  assert.equal(h.calls[0].name,'convert_fitness_stock');
  assert.equal(h.calls[0].params.p_source_variant_id,'source');
  assert.equal(h.calls[0].params.p_source_quantity,1);
  assert.deepEqual(h.calls[0].params.p_targets,[{variant_id:'target',quantity_per_source:1}]);
  assert.equal(h.refreshes,1);
});
test('conversion rejects a destination equal to its source without calling the database',async()=>{
  const h=conversionHarness();const selects=nodes(h.view()).filter(n=>n.type==='select');
  selects[0].props.onChange({target:{value:'source'}});selects[1].props.onChange({target:{value:'source'}});
  await h.view().props.onSubmit({preventDefault(){}});
  assert.equal(h.calls.length,0);assert.equal(h.refreshes,0);
});
test('central cache invalidation updates legacy and Company URLs',()=>{
  const paths=[];
  const {revalidateCentralPath}=load('../src/lib/central-revalidation.ts',{'next/cache':{revalidatePath:p=>paths.push(p)},'./company-destination':{companyDestination}});
  revalidateCentralPath('/central/promocoes');
  assert.deepEqual(paths,['/central/promocoes','/company/gestao/central/promocoes']);
});
test('promotion creation keeps authorization and insert payload independent of return context',async()=>{
  const writes=[];let allowed=true;
  const {createPromotion}=load('../src/app/(app)/central/promocoes/actions.ts',{
    '@/lib/central-revalidation':{revalidateCentralPath(){}},'@/lib/company-destination':{companyDestination},
    'next/navigation':{redirect:href=>{throw Error('REDIRECT:'+href);}},
    '@/lib/data':{getCurrentUserAccess:async()=>({role:allowed?'admin':'partner'})},
    '@/lib/supabase/server':{createClient:async()=>({from:()=>({insert:payload=>{writes.push(payload);return {select:()=>({single:async()=>({data:{id:'test-id'},error:null})})};}})})},
  });
  const form=new FormData();form.set('name','Teste isolado');form.set('company_context','1');
  await assert.rejects(createPromotion(form),/REDIRECT:\/company\/gestao\/central\/promocoes\/test-id/);
  assert.equal(writes.length,1);assert.equal(writes[0].name,'Teste isolado');assert.ok(!('company_context' in writes[0]));
  allowed=false;await assert.rejects(createPromotion(form),/permissão/);assert.equal(writes.length,1);
});
test('duplicate detector reports candidates only, ignoring whitespace and small wrappers',()=>{
  const {findDuplicateFunctions}=require('../scripts/audit-source-duplicates.cjs');
  const body=Array.from({length:35},(_,i)=>`const n${i}=${i};`).join('\n');
  const files=[{path:'a.ts',source:`function first(){${body}}`},{path:'b.ts',source:`function second(){  ${body.replaceAll('\n',' ')} }`}];
  assert.equal(findDuplicateFunctions(files).length,1);
  assert.equal(findDuplicateFunctions([{path:'a.ts',source:'function f(){return 1;}'},{path:'b.ts',source:'function g(){return 1;}'}]).length,0);
});
