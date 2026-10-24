/* eslint-disable @typescript-eslint/no-require-imports -- Isolated queue fixtures, no real records. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {load,common,ids}=require('./helpers/company-navigation-fixtures.cjs');
const {emptyNexusUnifiedQueue}=load('src/lib/nexus-unified-types.ts');
const {companyDestination}=load('src/lib/company-destination.ts');
const item=(href,source_type='operational_task')=>({queue_id:href,source_id:'fixture',source_type,operation_scope:'supplements',operation_label:'Suplementos',severity:'attention',score:50,title:'Tarefa fictícia',summary:'Resumo',href,due_at:null,action_mode:'open',metadata:{}});
const snapshot=(items)=>({...emptyNexusUnifiedQueue(),items,summary:{...emptyNexusUnifiedQueue().summary,total:items.length}});

test('queue Company contextualizes both focus and rows, preserving unknown workflows and legacy context',()=>{
  const previews=[];
  const {NexusUnifiedQueue}=load('src/components/nexus-unified-queue.tsx',{
    ...common,'@/lib/company-destination':{companyDestination},
    '@/components/nexus-action-preview-button':{NexusActionPreviewButton:props=>{previews.push(props);return React.createElement('button',null,props.label)}}
  });
  const routes=[`/suplementos/vendas/${ids.sale}?origem=fila#itens`,`/fitness/clientes/${ids.customer}`,'/central/agenda?dia=2026-10-23','/leads/novo?cliente=fixture','/nexus/rotinas','/bank/planejamento','/unknown?x=1'];
  const initial=snapshot(routes.map((href,index)=>item(href,index===0?'nexus_signal':'operational_task')));
  const before=JSON.stringify(initial);
  const html=renderToStaticMarkup(React.createElement(NexusUnifiedQueue,{initialSnapshot:initial,companyMode:true}));
  assert.equal((html.match(new RegExp(`/company/concluir/${ids.sale}\\?origem=fila#itens`,'g'))||[]).length,2,'focus and row map to the same sale');
  assert.ok(html.includes(`/company/clientes/fitness/${ids.customer}`));
  assert.ok(html.includes('/company/gestao/central/agenda?dia=2026-10-23'));
  assert.ok(html.includes('href="/company/nexus/rotinas"'));
  for(const href of routes.slice(3).filter(href=>href!=='/nexus/rotinas')) assert.ok(html.includes(`href="${href}"`),href);
  assert.equal(JSON.stringify(initial),before,'never rewrites the source data');
  assert.deepEqual(previews[0].payload,{signal_id:'fixture',action:'snooze',snooze_days:3});
  assert.equal(previews[0].component,'unified_queue');
  const legacy=renderToStaticMarkup(React.createElement(NexusUnifiedQueue,{initialSnapshot:initial}));
  assert.ok(legacy.includes(routes[0]));
  assert.equal(companyDestination('/nexus/fila?origem=copilot#lista'),'/company/nexus/fila?origem=copilot#lista');
});

test('shared queue entry keeps the same access guard and RPC for both routes',async()=>{
  const calls=[];let access={active:true,role:'operator'};
  const Shared=load('src/components/operational-pages/nexus-unified-queue-page.tsx',{
    ...common,'next/navigation':{redirect:href=>{throw Error(`REDIRECT:${href}`)}},
    '@/lib/data':{getCurrentUserAccess:async()=>access},
    '@/lib/nexus-unified-types':{emptyNexusUnifiedQueue},
    '@/lib/supabase/server':{createClient:async()=>({rpc:async(...args)=>{calls.push(args);return {data:snapshot([])}}})},
    '@/components/nexus-unified-queue':{NexusUnifiedQueue:props=>React.createElement('div',{'data-company':String(props.companyMode)},'Fila existente')}
  }).default;
  for(const companyMode of [true,false]){
    const html=renderToStaticMarkup(await Shared({companyMode}));
    assert.ok(html.includes(`href="${companyMode?'/company/inicio':'/dashboard'}"`));
    assert.ok(html.includes(`data-company="${companyMode}"`));
    assert.deepEqual(calls.at(-1),['nexus_unified_queue_v1',{p_limit:120}]);
  }
  const count=calls.length;
  for(const denied of [{active:false,role:'operator'},{active:true,role:'partner'}]){
    access=denied;
    await assert.rejects(()=>Shared({companyMode:true}),/REDIRECT:\/dashboard/);
  }
  assert.equal(calls.length,count,'denied roles never query the queue');
  const Wrapper=load('src/app/(app)/company/nexus/fila/page.tsx',{'@/components/operational-pages/nexus-unified-queue-page':{__esModule:true,default:Shared}}).default;
  const wrapped=Wrapper();assert.equal(wrapped.type,Shared);assert.equal(wrapped.props.companyMode,true);
});
