const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(relative,mocks={}){
  const file=path.resolve(__dirname,relative), compiled=new Module(file,module);
  compiled.require=id=>id in mocks?mocks[id]:require(id);
  compiled._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
  return compiled.exports;
}
const {companyDestination}=load('../src/lib/company-destination.ts');
const id='5bbdc799-2794-45d7-8f39-d0b834f3b125';
test('new tools have real Company page files; legacy URLs remain available',()=>{
  const {companyMigrationTools}=load('../src/lib/company-migration-tools.ts');
  for(const tool of companyMigrationTools){
    const target=tool.href.split('?')[0];
    const native=fs.existsSync(path.resolve(__dirname,'../src/app/(app)',target.slice(1),'page.tsx'));
    const centralRewrite=target==='/company/gestao/central' && fs.existsSync(path.resolve(__dirname,'../src/app/(app)/central/page.tsx')) && fs.readFileSync(path.resolve(__dirname,'../next.config.ts'),'utf8').includes('source: "/company/gestao/central/:path*"');
    assert.ok(native||centralRewrite,target);
  }
  assert.ok(fs.existsSync(path.resolve(__dirname,'../src/app/(app)/fitness/consignacoes/[id]/page.tsx')));
  assert.equal(companyDestination(`/fitness/consignacoes/${id}?origem=teste#pecas`),`/company/fitness/consignacoes/${id}?origem=teste#pecas`);
  assert.equal(companyDestination('/fitness/estoque?q=blusa'),'/company/estoque?operacao=fitness&q=blusa');
  assert.equal(companyDestination('/suplementos/nexus/habitos'),'/company/suplementos/nexus/habitos');
  assert.equal(companyDestination('/suplementos/movimentacoes?page=2&type=sale'),'/company/estoque/movimentacoes?page=2&type=sale');
  assert.equal(companyDestination('/unknown/function'),'/unknown/function');
});
function nodes(node){return !node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(nodes)];}
function settlementHarness(data,error=null,companyMode=true){
  const slots=[];let cursor=0;const calls=[],pushes=[];
  const hooks={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useMemo:fn=>fn()};
  const {FitnessConsignmentSettlementForm:Form}=load('../src/components/fitness-consignment-settlement-form.tsx',{
    react:hooks,'next/navigation':{useRouter:()=>({push:href=>pushes.push(href),refresh(){}})},
    '@/lib/supabase/client':{createClient:()=>({rpc:async(name,params)=>{calls.push({name,params});return {data,error};}})},
    '@/lib/format':{formatCurrency:value=>String(value)},'@/lib/company-destination':{companyDestination},
  });
  return {calls,pushes,view(){cursor=0;return Form({id,companyMode,items:[{id:'item',product_name:'Blusa',size:'G',color:'Preto',quantity_outstanding:2,unit_price:30}]});}};
}
test('consignment settlement preserves sale/devolution payload and opens Company sale',async()=>{
  const h=settlementHarness(id);let tree=h.view();
  nodes(tree).find(n=>n.type==='input'&&n.props.type==='number').props.onChange({target:{value:'1'}});
  tree=h.view();await tree.props.onSubmit({preventDefault(){}});
  assert.equal(h.calls[0].name,'settle_fitness_consignment');
  assert.deepEqual(h.calls[0].params.p_items,[{item_id:'item',quantity_sold:1}]);
  assert.equal(h.calls[0].params.p_payment_mode,'receivable');
  assert.deepEqual(h.pushes,[`/company/concluir/fitness/${id}`]);
});
test('all-return settlement and cancellation remain in Company; legacy context preserved',async()=>{
  global.confirm=()=>true;
  try{
    const h=settlementHarness(null);
    await nodes(h.view()).find(n=>n.type==='button'&&n.props.onClick?.name==='returnAll').props.onClick();
    assert.deepEqual(h.calls[0].params.p_items,[{item_id:'item',quantity_sold:0}]);
    assert.deepEqual(h.pushes,['/company/fitness/consignacoes?devolvida=1']);
    const cancel=settlementHarness(null);
    await nodes(cancel.view()).find(n=>n.type==='button'&&n.props.onClick?.name==='cancel').props.onClick();
    assert.equal(cancel.calls[0].name,'cancel_fitness_consignment');
    assert.deepEqual(cancel.pushes,['/company/fitness/consignacoes?cancelada=1']);
  }finally{delete global.confirm;}
  const legacy=settlementHarness(id,null,false);nodes(legacy.view()).find(n=>n.type==='input'&&n.props.type==='number').props.onChange({target:{value:'2'}});await legacy.view().props.onSubmit({preventDefault(){}});
  assert.deepEqual(legacy.pushes,[`/fitness/vendas/${id}`]);
});
test('failed settlement does not navigate away or claim success',async()=>{
  const h=settlementHarness(null,new Error('Saldo mudou'));
  nodes(h.view()).find(n=>n.type==='input'&&n.props.type==='number').props.onChange({target:{value:'1'}});
  await h.view().props.onSubmit({preventDefault(){}});
  assert.deepEqual(h.pushes,[]);
  assert.ok(nodes(h.view()).some(n=>n.type==='p'&&n.props.children==='Saldo mudou'));
});

test('blank or all-zero quantities never silently close a consignment as a sale',async()=>{
  const h=settlementHarness(null);
  await h.view().props.onSubmit({preventDefault(){}});
  assert.equal(h.calls.length,0);
  nodes(h.view()).find(n=>n.type==='input'&&n.props.type==='number').props.onChange({target:{value:'0'}});
  await h.view().props.onSubmit({preventDefault(){}});
  assert.equal(h.calls.length,0);
  assert.deepEqual(h.pushes,[]);
});
test('Fitness basket renders directly without depending on a missing legacy DOM panel',()=>{
  const {FitnessNexusPurchaseBasketV2:Basket}=load('../src/components/fitness-nexus-purchase-basket-v2.tsx',{
    'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},
    '@/lib/supabase/client':{createClient(){throw Error('unexpected server-side RPC');}},
  });
  const html=renderToStaticMarkup(React.createElement(Basket,{companyMode:true}));
  assert.match(html,/fitness-nexus-purchase-v2/);
  let slot=0;
  const hooks={...React,useState(initial){const i=slot++;return [i===0?Array.from({length:5},(_,n)=>({suggestion_key:String(n),decision:'accepted',suggested_quantity:2,matched_products:[],family_name:'Blusa',size:'G',color:'Preto',sold_30d:1,sold_90d:2})):i===2?false:initial,()=>{}];}};
  const {FitnessNexusPurchaseBasketV2:Loaded}=load('../src/components/fitness-nexus-purchase-basket-v2.tsx',{
    react:hooks,
    'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},
    '@/lib/supabase/client':{createClient(){throw Error('unexpected RPC');}},
  });
  const loaded=renderToStaticMarkup(React.createElement(Loaded,{companyMode:true}));
  assert.match(loaded,/10 de 10/);
  assert.match(loaded,/company\/compras/);
});
