const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),React=require('react');
function load(relative,mocks={}){const file=path.resolve(__dirname,relative),mod=new Module(file,module);mod.require=id=>id==='@/lib/phone-search'?require('./helpers/company-navigation-fixtures.cjs').load('src/lib/phone-search.ts'):id in mocks?mocks[id]:id.endsWith('.css')?{}:require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return mod.exports;}
const guidance=load('../src/lib/company-care-guidance.ts');
const common={customerId:'same-customer',customerName:'Cliente teste',city:'Teste',phone:null,sourceId:'source',dueOn:'2020-01-01',title:'Conferir compra',note:'Observação',href:'/company/acompanhar'};
const items=[{...common,id:'supp',operation:'Suplementos',kind:'post_sale'},{...common,id:'fit',operation:'Fitness',kind:'post_sale'},{...common,id:'return',operation:'Fitness',kind:'follow_up',dueOn:null}];
function nodes(node){return !node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(nodes)];}
function harness(input=items){const slots=[],calls=[],pushes=[];let cursor=0;const hooks={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value]},useMemo:fn=>fn()};const {CompanyCareWorkspace:View}=load('../src/components/company-care-workspace.tsx',{react:hooks,'next/link':{__esModule:true,default:()=>null},'next/navigation':{useRouter:()=>({push:href=>pushes.push(href),refresh(){}})},'@/lib/supabase/client':{createClient:()=>({rpc:async(name,params)=>{calls.push({name,params});return {error:null}}})},'@/lib/format':{formatCurrency:String,formatDateOnly:String},'@/lib/company-care-guidance':guidance,'@/components/fitness-opportunity-contact-actions':{FitnessOpportunityContactActions:'fitness-contact-actions'},'@/components/company-workflow-sync':{notifyCompanyWorkflowUpdated(){}}});return {calls,pushes,view(){cursor=0;return View({items:input,initialFilter:'all',canWriteFitness:true})}};}
const button=(tree,name)=>nodes(tree).find(n=>n.type==='button'&&n.props.children===name);

test('care searches formatted or normalized phone without making writes',()=>{
 const h=harness([{...common,id:'phone',operation:'Fitness',kind:'post_sale',phone:'+55 (32) 99999-0000'}]);
 const search=value=>nodes(h.view()).find(n=>n.type==='input'&&n.props.type==='search').props.onChange({target:{value}});
 for(const query of ['32999990000','(32) 99999-0000']){search(query);assert.equal(nodes(h.view()).filter(n=>n.type==='article'&&n.props.className==='company-care-person').length,1);}
 search('00001111');assert.equal(nodes(h.view()).filter(n=>n.type==='article'&&n.props.className==='company-care-person').length,0);assert.equal(h.calls.length,0);
});
test('same customer has separate operational cards and clear guidance for each care kind',()=>{
 const h=harness(),tree=h.view();assert.equal(nodes(tree).filter(n=>n.type==='article'&&n.props.className==='company-care-person').length,2);
 assert.ok(nodes(tree).some(n=>n.type==='p'&&n.props.children===guidance.careGuidance('post_sale').instruction));
 assert.ok(nodes(tree).some(n=>n.type==='p'&&n.props.children===guidance.careGuidance('follow_up').instruction));
 const fitness=nodes(tree).find(n=>n.type==='button'&&React.Children.toArray(n.props.children).some(child=>child?.props?.children==='Fitness'));
 fitness.props.onClick();const filtered=h.view();assert.equal(nodes(filtered).filter(n=>n.type==='article'&&n.props.className==='company-care-person').length,1);
 assert.ok(nodes(filtered).some(n=>n.type==='strong'&&n.props.children===1));
 assert.equal(h.calls.length,0);
});
test('opening an attendance and preparing sale never completes contact or writes feedback',async()=>{
 const previous=global.fetch;global.fetch=async()=>({ok:true,json:async()=>({timeline:[],nexusSuggestion:'Teste'})});
 try{const h=harness();await button(h.view(),'Registrar pós-venda').props.onClick();let tree=h.view();nodes(tree).find(n=>n.type==='button'&&React.Children.toArray(n.props.children).includes('Respondeu · escolher resultado')).props.onClick();tree=h.view();await nodes(tree).find(n=>n.type==='button'&&React.Children.toArray(n.props.children).includes('Preparar venda')).props.onClick();assert.equal(h.calls.length,0);assert.deepEqual(h.pushes,['/company/vendas/nova/suplementos?cliente=same-customer']);}
 finally{global.fetch=previous;}
});
test('every operation has its own contact identity; each kind has a concrete action label',()=>{
 assert.notEqual(guidance.careContactKey(items[0]),guidance.careContactKey(items[1]));
 assert.equal(guidance.careGuidance('waiting').openLabel,'Atualizar contato');
 assert.equal(guidance.careGuidance('follow_up').completeLabel,'Concluir retorno');
});

test('Fitness contact opens its own status/date controls without querying supplement history or writing feedback',async()=>{
 const previous=global.fetch;let fetched=0;global.fetch=async()=>{fetched++;throw new Error('Must not fetch supplement history')};
 try{const contact={customer_id:'fitness',status:'later',next_contact_on:'2099-01-01',notes:'Retornar na data combinada',revision:2,updated_at:'2026-10-19T15:00:00Z'};
 const h=harness([{...common,id:'fitness-contact',customerId:'fitness',operation:'Fitness',kind:'follow_up',dueOn:contact.next_contact_on,title:'Ficou para depois',fitnessContact:contact}]);
 await button(h.view(),'Atualizar contato Fitness').props.onClick();const tree=h.view(),control=nodes(tree).find(n=>n.type==='fitness-contact-actions');assert.ok(control);assert.equal(control.props.contact,contact);assert.equal(control.props.canWrite,true);assert.equal(fetched,0);assert.equal(h.calls.length,0);assert.ok(nodes(tree).some(n=>n.type==='small'&&String(n.props.children).includes('2099-01-01')));
 }finally{global.fetch=previous;}
});
