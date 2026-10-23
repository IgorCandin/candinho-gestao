/* eslint-disable @typescript-eslint/no-require-imports -- Local fixtures only, no production data. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {load,ids,supplier,saleView}=require('./helpers/company-navigation-fixtures.cjs');

test('supplier reservations open the same sale in Company and keep receiving/cancelling untouched',async()=>{
  for(const companyMode of [true,false]) {
    const f=supplier(),html=renderToStaticMarkup(await f.Page({params:Promise.resolve({id:ids.order}),companyMode}));
    assert.ok(html.includes(`href="${companyMode?'/company/concluir':'/vendas'}/${ids.sale}"`));
    assert.ok(html.includes(`href="${companyMode?'/company/produtos':'/produtos'}/${ids.product}"`));
    assert.match(html,/Receber item/);assert.match(html,/Cancelar pedido/);
    assert.equal(f.forms[0].quantity_pending,2);assert.equal(f.forms[0].flavor_name,'Sabor fictício');
    assert.deepEqual(f.calls,[['order',ids.order],['supplier_order_items_overview','id,flavor_name','purchase_order_id',ids.order]]);
  }
});
test('supplier read errors and missing order remain errors rather than empty success',async()=>{
  await assert.rejects(()=>supplier({missing:true}).Page({params:Promise.resolve({id:ids.order})}),/NOT_FOUND/);
  await assert.rejects(()=>supplier({error:Error('fixture read failed')}).Page({params:Promise.resolve({id:ids.order})}),/fixture read failed/);
});
test('sale customer/product links honor Company while PDF and action props remain unchanged',()=>{
  for(const company of [true,false]) {
    const f=saleView(),backHref=company?'/company/concluir':'/vendas';
    const html=renderToStaticMarkup(React.createElement(f.View,{sale:f.sale,backHref,backLabel:'Voltar'}));
    assert.ok(html.includes(`href="${company?'/company/produtos':'/produtos'}/${ids.product}"`));
    assert.ok(html.includes(`href="${company?'/company/clientes':'/clientes'}/${ids.customer}"`));
    assert.ok(html.includes('/api/orcamentos/quote-fixture/pdf'));
    assert.deepEqual(f.slots.map(slot=>slot.name),['SalePaymentPanel','ChangeSaleCustomer','SaleStatusActions']);
    assert.ok(f.slots.every(slot=>slot.props.saleId===ids.sale));
    assert.equal(f.slots[0].props.totalAmount,50);
    assert.deepEqual(f.slots[2].props.items,[{id:'sale-item',name:'Produto fictício',quantity:1,deliveredQuantity:0}]);
  }
});
function search(access,{logged=true}={}) {
  const calls=[];
  const api=load('src/app/api/company/search/route.ts',{
    'next/server':{NextResponse:{json:(body,init={})=>({body,status:init.status??200,headers:init.headers})}},
    '@/lib/data':{getCurrentUserAccess:async()=>access},
    '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:logged?{id:'fake-user'}:null}})},from:table=>{
      calls.push(table);const query={select(){return this},eq(){return this},ilike(){return this},order(){return this},limit:async()=>({data:[{id:ids.customer,name:'Resultado fictício'}]})};return query;
    }})},
  });
  return {calls,get:()=>api.GET(new Request('http://localhost/api/company/search?q=teste'))};
}
test('Company global search keeps all four result kinds inside Company and preserves cache policy',async()=>{
  const f=search({active:true,role:'admin'}),result=await f.get();
  assert.equal(result.status,200);assert.equal(result.headers['Cache-Control'],'private, no-store');
  assert.deepEqual(result.body.results.map(r=>r.href),[`/company/clientes/${ids.customer}`,`/company/produtos/${ids.customer}`,`/company/clientes/fitness/${ids.customer}`,`/company/produtos/fitness/${ids.customer}`]);
});
test('search still denies anonymous/inactive/partner and only queries authorized operations',async()=>{
  for(const [access,options,status] of [[{active:true,role:'admin'},{logged:false},401],[{active:false,role:'seller'},{},403],[{active:true,role:'partner'},{},403]]){
    const f=search(access,options);assert.equal((await f.get()).status,status);assert.deepEqual(f.calls,[]);
  }
  const f=search({active:true,role:'seller',canAccessFitness:true});await f.get();
  assert.deepEqual(f.calls,['fitness_customers','fitness_products']);
});
test('legacy canonicalizer never rewrites or intercepts Company links, but remains active in legacy',()=>{
  for(const pathname of ['/company','/company/compras/suplementos/fixture','/suplementos/vendas']){
    const effects=[],listeners=new Map();let observed=0,frames=0;
    global.requestAnimationFrame=()=>++frames;global.cancelAnimationFrame=()=>{};
    global.document={body:{},addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
    global.MutationObserver=class{observe(){observed++}disconnect(){observed--}};
    let cleanup;
    try {
      load('src/components/supplement-canonical-navigation-ux.tsx',{'react':{useEffect:fn=>effects.push(fn)},'next/navigation':{usePathname:()=>pathname,useRouter:()=>({push(){throw Error('unexpected navigation')}})}}).SupplementCanonicalNavigationUX();
      cleanup=effects[0]();
      assert.equal(observed,pathname.startsWith('/company')?0:1);
      assert.equal(listeners.size,pathname.startsWith('/company')?0:1);
    } finally {cleanup?.();for(const key of ['requestAnimationFrame','cancelAnimationFrame','document','MutationObserver'])delete global[key];}
  }
});
