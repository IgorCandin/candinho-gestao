/* eslint-disable @typescript-eslint/no-require-imports -- No live routine, database or authentication mutations. */
const {test}=require('node:test');const assert=require('node:assert/strict');
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
const {load,common,ids}=require('./helpers/company-navigation-fixtures.cjs');
const {companyDestination}=load('src/lib/company-destination.ts');
const nav=load('src/lib/company-routine-navigation.ts',{'@/lib/company-destination':{companyDestination}});
const active={run_id:ids.order,current_step:0,current:{href:`/clientes/${ids.customer}?x=1#perfil`},title:'Rotina fictícia',total_steps:2,progress_percent:0};
test('routine aliases preserve identity, suffix and unknown workflow boundaries',()=>{
  const mapped=`/company/clientes/${ids.customer}?x=1#perfil`;
  assert.equal(nav.routineHref('/company/inicio',active.current.href),mapped);
  assert.equal(nav.routineArrivalHref(active.current.href,mapped),active.current.href);
  assert.equal(nav.routineArrivalHref(active.current.href,`/company/clientes/${ids.sale}`),null);
  assert.equal(nav.routineArrivalHref('/leads/novo','/company/vendas/nova/suplementos'),null);
  for(const href of ['/leads/novo','/vendas','/agenda','/unknown','https://example.invalid'])assert.equal(nav.routineHref('/company/inicio',href),href);
  assert.equal(nav.routineHref('/company-other',active.current.href),active.current.href);
  assert.equal(nav.routineHref('/suplementos',active.current.href),active.current.href);
  assert.equal(nav.routineHref('/company/inicio','/nexus/rotinas'),'/company/nexus/rotinas');
});
function api({access={active:true,role:'operator'},current=active,error=null}={}){
  const calls=[];const {emptyNexusRoutinesWorkspace}=load('src/lib/nexus-routine-types.ts');
  const route=load('src/app/api/nexus/routines/route.ts',{'next/server':{NextResponse:{json:(data,options)=>new Response(JSON.stringify(data),options)}},'@/lib/data':{getCurrentUserAccess:async()=>access},'@/lib/nexus-routine-types':{emptyNexusRoutinesWorkspace},'@/lib/company-routine-navigation':nav,'@/lib/supabase/server':{createClient:async()=>({rpc:async(name,args)=>{calls.push([name,args]);return name==='nexus_active_routine_v1'?{data:current,error:null}:{data:null,error};}})}});
  return {calls,post:body=>route.POST(new Request('https://fixture.invalid/api/nexus/routines',{method:'POST',body:JSON.stringify(body)}))};
}
test('API guards aliases and expected step then delegates to atomic RPC; legacy unchanged',async()=>{
  const f=api();const observed=`/company/clientes/${ids.customer}`;
  const response=await f.post({action:'advance',run_id:ids.order,mode:'arrive',href:observed,expected_step:0});assert.equal(response.status,200);
  assert.deepEqual(f.calls,[['nexus_active_routine_v1',undefined],['nexus_advance_routine_step_v1',{p_run_id:ids.order,p_expected_step:0,p_action:'arrive',p_href:active.current.href,p_observed_href:observed}]]);
  const old=api();await old.post({action:'advance',run_id:ids.order,mode:'skip',href:'/clientes'});assert.equal(old.calls[0][0],'nexus_advance_routine_v1');
  for(const body of [{expected_step:-1},{expected_step:1},{expected_step:'0'},{expected_step:0,href:'/wrong'}]){
    const f=api();const response=await f.post({action:'advance',run_id:ids.order,mode:'arrive',href:observed,...body});assert.ok(response.status>=400);assert.ok(!f.calls.some(x=>x[0]==='nexus_advance_routine_step_v1'));
  }
  for(const access of [{active:false,role:'admin'},{active:true,role:'partner'}]){const f=api({access});assert.equal((await f.post({action:'advance',run_id:ids.order,expected_step:0})).status,403);assert.equal(f.calls.length,0);}
  const conflict=api({error:{code:'40001',message:'A rotina mudou'}});assert.equal((await conflict.post({action:'advance',run_id:ids.order,mode:'skip',expected_step:0})).status,409);
});
test('Company dock displays mapped next step, sends expected step, and never posts divergent arrival',async()=>{
  let stateIndex=0;const effects=[];const calls=[];
  const values=[active,false,false,null];
  const Dock=load('src/components/nexus-routine-dock.tsx',{...common,'next/navigation':{usePathname:()=>'/company/inicio'},react:{...React,useState:initial=>[stateIndex<values.length?values[stateIndex++]:initial,()=>{}],useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn)},'@/lib/company-routine-navigation':nav,'@/lib/nexus-route-labels':{nexusRouteLabel:String}}).NexusRoutineDock;
  const html=renderToStaticMarkup(React.createElement(Dock));assert.ok(html.includes(`/company/clientes/${ids.customer}?x=1#perfil`));
  const originalFetch=global.fetch;try{global.fetch=async(...args)=>{calls.push(args);throw Error('Unexpected request')};effects[1]();await new Promise(r=>setImmediate(r));assert.equal(calls.length,0);}finally{global.fetch=originalFetch;}
});

test('dock arrival carries the observed path and expected step once per local step',async()=>{
  let index=0;const effects=[],calls=[],ref={current:null};const values=[active,false,false,null,null];
  const Dock=load('src/components/nexus-routine-dock.tsx',{...common,'next/navigation':{usePathname:()=>`/company/clientes/${ids.customer}`},react:{...React,useState:initial=>[index<values.length?values[index++]:initial,()=>{}],useRef:()=>ref,useCallback:fn=>fn,useEffect:fn=>effects.push(fn)},'@/lib/company-routine-navigation':nav,'@/lib/nexus-route-labels':{nexusRouteLabel:String}}).NexusRoutineDock;
  Dock({});const originalFetch=global.fetch,originalWindow=global.window;
  try{global.window={dispatchEvent(){}};global.fetch=async(url,options)=>{calls.push([url,JSON.parse(options.body)]);return {ok:true,json:async()=>({...active,current_step:1})}};effects[1]();await new Promise(r=>setImmediate(r));effects[1]();await new Promise(r=>setImmediate(r));assert.deepEqual(calls,[['/api/nexus/routines',{action:'advance',run_id:ids.order,mode:'arrive',href:`/company/clientes/${ids.customer}`,expected_step:0}]]);}finally{global.fetch=originalFetch;global.window=originalWindow;}
});

test('shared routines workspace keeps persisted steps while contextualizing the active link',()=>{
  const {emptyNexusRoutinesWorkspace}=load('src/lib/nexus-routine-types.ts');
  const Workspace=load('src/components/nexus-routines-workspace.tsx',{...common,'@/lib/company-routine-navigation':nav,'@/lib/nexus-route-labels':{nexusRouteLabel:String}}).NexusRoutinesWorkspace;
  const workspace={...emptyNexusRoutinesWorkspace(),active_run:active};const before=JSON.stringify(workspace);
  for(const companyMode of [true,false]){const html=renderToStaticMarkup(React.createElement(Workspace,{initialWorkspace:workspace,pinnedShortcuts:[],companyMode}));assert.ok(html.includes(`${companyMode?'/company':''}/clientes/${ids.customer}?x=1#perfil`));assert.ok(html.includes('Iniciar uma nova encerra automaticamente a rotina anterior.'));}
  assert.equal(JSON.stringify(workspace),before);
});
