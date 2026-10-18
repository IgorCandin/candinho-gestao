const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(relative,mocks={}){
  const file=path.resolve(__dirname,relative),mod=new Module(file,module);
  mod.require=id=>id in mocks?mocks[id]:require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
  return mod.exports.default;
}
const Link=({children,href})=>React.createElement('a',{href},children);
const Header=({title,action})=>React.createElement('header',null,title,action);
const format={formatCurrency:String,formatDateOnly:String,formatDateTime:String};
function consignments(access,rows=[],error=null){
  const calls=[];
  const query={select(value){calls.push(['select',value]);return this;},async order(...args){calls.push(['order',...args]);return {data:rows,error};}};
  const Page=load('../src/components/operational-pages/fitness-consignments-page.tsx',{
    'next/link':Link,'next/navigation':{redirect:href=>{throw new Error(`redirect:${href}`);}},
    '@/components/page-header':{PageHeader:Header},'@/lib/format':format,
    '@/lib/data':{getCurrentUserAccess:async()=>access},
    '@/lib/supabase/server':{createClient:async()=>({from(name){calls.push(['from',name]);return query;}})},
  });
  return {Page,calls};
}
test('consignações preservam registros e links nos dois contextos',async()=>{
  const rows=[{id:'teste',customer_name:'Cliente fictício',product_summary:'Blusa G',started_on:'2026-10-17',expected_return_on:null,units_outstanding:2,outstanding_value:60,status:'partial'}];
  for(const companyMode of [false,true]){
    const h=consignments({canAccessFitness:true,canWriteFitness:true},rows);
    const html=renderToStaticMarkup(await h.Page({companyMode}));
    const base=companyMode?'/company/fitness/consignacoes':'/fitness/consignacoes';
    assert.ok(html.includes(`${base}/nova`));assert.ok(html.includes(`${base}/teste`));
    assert.ok(html.includes('Acerto parcial'));assert.ok(html.includes('Blusa G'));
    assert.deepEqual(h.calls,[['from','fitness_consignments_overview'],['select','*'],['order','created_at',{ascending:false}]]);
  }
});
test('consignações negam acesso antes da consulta e não escondem falha como lista vazia',async()=>{
  const denied=consignments({canAccessFitness:false});
  await assert.rejects(()=>denied.Page(),/redirect:\/dashboard/);assert.equal(denied.calls.length,0);
  const failed=consignments({canAccessFitness:true},[],new Error('falha simulada'));
  await assert.rejects(()=>failed.Page(),/falha simulada/);
  const readOnly=consignments({canAccessFitness:true,canWriteFitness:false});
  const html=renderToStaticMarkup(await readOnly.Page({companyMode:true}));
  assert.ok(!html.includes('/nova'));assert.ok(html.includes('Nenhuma consignação'));
});

test('consignações oferecem orçamento e abrem somente a venda vinculada em cada contexto',async()=>{
  const baseRow={id:'closed',customer_name:'Teste',started_on:'2026-10-18',units_outstanding:0,outstanding_value:0,status:'closed',sale_id:'sale-linked'};
  for(const companyMode of [true,false]){
    const h=consignments({canAccessFitness:true,canWriteFitness:false},[baseRow,{...baseRow,id:'returned',sale_id:null}]);
    const html=renderToStaticMarkup(await h.Page({companyMode}));
    assert.ok(html.includes('/api/fitness/consignacoes/closed/orcamento'));
    assert.ok(html.includes('Orçamento desta consignação'));
    assert.ok(!html.includes('href="/company/orcamentos'));
    assert.ok(html.includes(`${companyMode?'/company/concluir/fitness':'/fitness/vendas'}/sale-linked`));
    assert.ok(html.includes('Abrir venda'));assert.ok(html.includes('Devolvida sem venda'));
    assert.ok(!html.includes('/null'));assert.ok(!html.includes('/nova'));
  }
});
test('movimentações preservam filtros, consulta, busca e paginação Company/legado',async()=>{
  for(const companyMode of [false,true]){
    const calls=[],components=[];
    const Capture=props=>{components.push(props);return null;};
    const Page=load('../src/components/operational-pages/fitness-movements-page.tsx',{
      'next/link':Link,'@/components/page-header':{PageHeader:Header},'@/lib/format':format,
      '@/components/commercial-pagination':{CommercialPagination:Capture},
      '@/components/commercial-search-form':{CommercialSearchForm:Capture},
      '@/lib/operational-pagination-data':{getFitnessMovementsPage:async params=>{calls.push(params);return {rows:[],page:2,totalPages:3,total:120,pageSize:50};}},
    });
    const html=renderToStaticMarkup(await Page({companyMode,searchParams:Promise.resolve({page:'2',q:' Blusa G ',type:'sale'})}));
    const base=companyMode?'/company/fitness/movimentacoes':'/fitness/movimentacoes';
    assert.deepEqual(calls,[{page:2,pageSize:50,search:'Blusa G',movementType:'sale'}]);
    assert.ok(html.includes(`${base}?type=purchase&amp;q=Blusa+G`));
    assert.equal(components[0].action,base);assert.equal(components[0].hidden.type,'sale');
    assert.equal(components[1].pathname,base);assert.deepEqual(components[1].params,{q:'Blusa G',type:'sale'});
    assert.equal(components[1].page,2);assert.equal(components[1].totalPages,3);
  }
});
test('rotas legadas usam componentes compartilhados sem parâmetro interno companyMode',()=>{
  for(const route of ['estoque/[id]','fitness/consignacoes','fitness/movimentacoes']){
    const text=fs.readFileSync(path.resolve(__dirname,`../src/app/(app)/${route}/page.tsx`),'utf8');
    assert.ok(text.includes('@/components/operational-pages/'));
    assert.ok(!text.includes('companyMode'));
  }
});
