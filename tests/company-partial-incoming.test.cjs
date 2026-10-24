/* eslint-disable @typescript-eslint/no-require-imports -- Isolated component fixtures, no live database. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {load,common,supplier,ids}=require('./helpers/company-navigation-fixtures.cjs');
const workflow=load('src/lib/company-purchase-workflow.ts');
const partial={id:'partial-fixture',operation:'Suplementos',supplierName:'Shopee fictícia',summary:'Biotina · Whey · Touro Power',orderedOn:'2026-10-19',expectedOn:null,orderedUnits:7,receivedUnits:4,pendingUnits:3,total:100,status:'partial',waitingSales:0,href:'/company/compras/suplementos/partial-fixture'};
function render(stage,canWrite=false,operation='all') {
  const View=load('src/components/company-purchase-workspace.tsx',{...common,
    '@/lib/company-purchase-workflow':workflow,
    '@/components/company-purchase-suggestions':{CompanyPurchaseSuggestions:()=>null},
    '@/components/purchase-order-cancel-action':{PurchaseOrderCancelAction:()=>React.createElement('button',null,'Cancelar pedido')},
    './company-completion-filters.css':{},'./company-purchase-workspace.css':{},
  }).CompanyPurchaseWorkspace;
  return renderToStaticMarkup(React.createElement(View,{suggestions:[],orders:[partial,{...partial,id:'untouched-fixture',supplierName:'Outro fictício',receivedUnits:0,pendingUnits:7,status:'pending'}, {...partial,id:'closed-fixture',supplierName:'Fechado fictício',status:'received',pendingUnits:0}],leanMode:false,allowedOperations:['Suplementos','Fitness'],canWriteSupplements:canWrite,canWriteFitness:false,initialStage:stage,initialOperation:operation,today:'2026-10-24'}));
}
test('A caminho includes partial receipts and its count without changing receipt classification',()=>{
  const html=render('incoming');
  assert.match(html,/<h3>Shopee fictícia<\/h3>/);
  assert.match(html,/Pedidos a caminho<\/span><strong>2<\/strong>/);
  assert.match(html,/2 aviso\(s\)/);
  assert.match(html,/3 unidade\(s\) restantes/);
  assert.equal(workflow.purchaseStage(partial),'receive');
  assert.doesNotMatch(html,/Fechado fictício/);
});
test('Tudo counts/renders each order once while Falta receber remains the partial subset',()=>{
  const all=render('all'),receive=render('receive');
  assert.equal((all.match(/<h3>Shopee fictícia<\/h3>/g)||[]).length,1);
  assert.equal((all.match(/<h3>Outro fictício<\/h3>/g)||[]).length,1);
  assert.match(all,/2 aviso\(s\)/);
  assert.match(all,/Unidades a receber<\/span><strong>10<\/strong>/);
  assert.match(receive,/<h3>Shopee fictícia<\/h3>/);
  assert.doesNotMatch(receive,/<h3>Outro fictício<\/h3>/);
  assert.match(receive,/1 aviso\(s\)/);
});
test('operation and write affordances remain scoped, without adding mutations',()=>{
  assert.doesNotMatch(render('incoming',false,'Fitness'),/Shopee fictícia/);
  assert.match(render('incoming'),/Ver itens e recebimentos/);
  assert.doesNotMatch(render('incoming'),/Cancelar pedido/);
  assert.match(render('incoming',true),/Conferir e receber itens/);
});
test('shared Company detail offers only the outstanding item with the original flavor and quantity',async()=>{
  const fixture=supplier();
  const base=fixture.order.items[0];
  fixture.order.items=[{...base,id:'done',product_name:'Biotina fictícia',quantity_ordered:3,quantity_received:3,quantity_pending:0,item_status:'received',waiting_sales:[]},{...base,product_name:'Touro Power fictício',quantity_ordered:3,quantity_received:0,quantity_pending:3,item_status:'pending'}];
  const html=renderToStaticMarkup(await fixture.Page({params:Promise.resolve({id:ids.order}),companyMode:true}));
  assert.equal(fixture.forms.length,1);
  assert.equal(fixture.forms[0].quantity_pending,3);
  assert.equal(fixture.forms[0].flavor_name,'Sabor fictício');
  assert.match(html,/Touro Power fictício/);
  assert.match(html,/Item totalmente recebido/);
  assert.match(html,/\/company\/concluir\//);
});
