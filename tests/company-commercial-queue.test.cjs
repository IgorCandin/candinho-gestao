/* eslint-disable @typescript-eslint/no-require-imports -- Isolated commercial actions; never access real records. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {load,common,ids}=require('./helpers/company-navigation-fixtures.cjs');
const {companyDestination}=load('src/lib/company-destination.ts');
const {emptyCommercialContactQueue}=load('src/lib/commercial-contact-types.ts');
const person={queue_key:'fixture-person',source_type:'lead',source_id:ids.sale,customer_id:ids.customer,customer_name:'Pessoa fictícia',phone:'5599999999999',city:'Cidade fictícia',product_name:'Produto fictício',stock_quantity:2,stage:'contact',lead_status:'Médio',href:`/clientes/${ids.customer}?origem=fila#historico`};
function snapshot(stage='contact'){return {...emptyCommercialContactQueue('2026-10-23'),total_eligible:1,items:[{...person,stage}]};}
const mocks={'@/lib/company-destination':{companyDestination}};

test('commercial queue and agenda preserve deep Company customer links and legacy routes',()=>{
  const Queue=load('src/components/commercial-contact-queue.tsx',{...common,...mocks,'@/lib/supabase/client':{createClient(){throw Error('Unexpected real action')}}}).CommercialContactQueue;
  const Card=load('src/components/commercial-contact-agenda-card.tsx',common).CommercialContactAgendaCard;
  for(const companyMode of [true,false]){
    const s=snapshot();const original=JSON.stringify(s);
    const html=renderToStaticMarkup(React.createElement(Queue,{snapshot:s,companyMode}));
    assert.ok(html.includes(`href="${companyMode?'/company/clientes':'/clientes'}/${ids.customer}?origem=fila#historico"`));
    assert.ok(html.includes('Chamei'));assert.ok(html.includes('Pular'));assert.ok(html.includes('https://wa.me/5599999999999'));
    assert.equal(JSON.stringify(s),original);
    const agenda=renderToStaticMarkup(React.createElement(Card,{snapshot:s,companyMode}));
    assert.ok(agenda.includes(`href="${companyMode?'/company/fila-comercial':'/suplementos/fila-comercial'}"`));
  }
  assert.equal(companyDestination('/suplementos/fila-comercial?origem=nexus#pessoa'),'/company/fila-comercial?origem=nexus#pessoa');
});

test('all four commercial actions keep their RPC and payload in both contexts, failures never reload',async()=>{
  function buttons(node,result=[]){if(!node||typeof node!=='object')return result;if(node.type==='button')result.push(node);React.Children.forEach(node.props?.children,c=>buttons(c,result));return result;}
  const originalWindow=global.window;
  try{
    for(const companyMode of [true,false])for(const [stage,labels] of [['contact',['Chamei','Pular']],['response_check',['Respondeu','Não respondeu','Chamei de novo']]]){
      for(const label of labels){
        const calls=[];let reloads=0;const messages=[];
        global.window={location:{reload:()=>reloads++}};
        const Queue=load('src/components/commercial-contact-queue.tsx',{...common,...mocks,react:{...React,useState:()=>[null,v=>messages.push(v)]},'@/lib/supabase/client':{createClient:()=>({rpc:async(...args)=>{calls.push(args);return {data:{context_count:2},error:null}}})}}).CommercialContactQueue;
        const tree=Queue({snapshot:snapshot(stage),companyMode});assert.equal(calls.length,0);
        const button=buttons(tree).find(b=>React.Children.toArray(b.props.children).includes(label));assert.ok(button,label);button.props.onClick();await new Promise(resolve=>setImmediate(resolve));
        const action={'Chamei':'contacted','Pular':'skipped','Respondeu':'responded','Não respondeu':'no_response','Chamei de novo':'contacted'}[label];
        assert.deepEqual(calls,[['commercial_contact_customer_action_v1',{p_customer_id:ids.customer,p_action:action,p_notes:null}]]);assert.equal(reloads,1);
      }
    }
    let reloads=0;const messages=[];global.window={location:{reload:()=>reloads++}};
    const Queue=load('src/components/commercial-contact-queue.tsx',{...common,...mocks,react:{...React,useState:()=>[null,v=>messages.push(v)]},'@/lib/supabase/client':{createClient:()=>({rpc:async()=>({data:null,error:{message:'Falha simulada'}})})}}).CommercialContactQueue;
    buttons(Queue({snapshot:snapshot(),companyMode:true}))[0].props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.equal(reloads,0);assert.ok(messages.includes('Falha simulada'));
  }finally{global.window=originalWindow;}
});

test('shared commercial server preserves read RPC, guards, errors and empty fallback',async()=>{
  let access={role:'admin'};let error=null;const calls=[];
  const Shared=load('src/components/operational-pages/commercial-contact-queue-page.tsx',{...common,'next/navigation':{redirect:href=>{throw Error(`REDIRECT:${href}`)}},'@/lib/data':{getCurrentUserAccess:async()=>access},'@/lib/commercial-contact-types':{emptyCommercialContactQueue},'@/lib/supabase/server':{createClient:async()=>({rpc:async(...args)=>{calls.push(args);return {data:null,error}}})},'@/components/commercial-contact-queue':{CommercialContactQueue:props=>React.createElement('div',{'data-company':String(props.companyMode)},props.snapshot.items.length)}}).default;
  for(const companyMode of [true,false]){const html=renderToStaticMarkup(await Shared({companyMode}));assert.ok(html.includes(`data-company="${companyMode}"`));assert.deepEqual(calls.at(-1),['commercial_contact_queue_people_v1',{p_limit:40}]);if(companyMode)assert.ok(html.includes('href="/company/nexus/fila"'));}
  const count=calls.length;for(const denied of [{role:'partner',canWriteSupplements:false},{role:'operator',canWriteSupplements:false}]){access=denied;await assert.rejects(()=>Shared({companyMode:true}),/REDIRECT:\/company\/inicio/);}assert.equal(calls.length,count);
  access={role:'operator',canWriteSupplements:true};error=Error('RPC fixture failure');await assert.rejects(()=>Shared({companyMode:true}),/RPC fixture failure/);
  const Page=load('src/app/(app)/company/fila-comercial/page.tsx',{'@/components/operational-pages/commercial-contact-queue-page':{__esModule:true,default:Shared}}).default;assert.equal(Page().type,Shared);assert.equal(Page().props.companyMode,true);
});
