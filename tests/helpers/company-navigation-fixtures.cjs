/* eslint-disable @typescript-eslint/no-require-imports -- Isolated read-only component fixtures. */
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require('typescript'),React=require('react');
function load(relative,mocks={}) {
  const file=path.resolve(__dirname,'../..',relative),mod=new Module(file,module);
  mod.require=id=>id in mocks?mocks[id]:require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
  return mod.exports;
}
const h=React.createElement;
const Link=({children,...props})=>h('a',props,children);
const common={
  'next/link':Link,'next/image':({src,alt,width,height})=>h('img',{src,alt,width,height}),
  'next/navigation':{notFound(){throw Error('NOT_FOUND')}},
  '@/components/demo-banner':{DemoBanner:()=>null},
  '@/components/page-header':{PageHeader:({title,description,action})=>h('header',null,h('h1',null,title),h('p',null,description),action)},
  '@/lib/format':{formatCurrency:value=>`R$ ${value}`,formatDateOnly:String,formatDate:String},
};
const ids={order:'11111111-1111-4111-8111-111111111111',sale:'22222222-2222-4222-8222-222222222222',product:'33333333-3333-4333-8333-333333333333',customer:'44444444-4444-4444-8444-444444444444'};
function supplier({error=null,missing=false}={}) {
  const calls=[],forms=[];
  const item={id:'item-fixture',product_id:ids.product,product_name:'Produto fictício',category:'Teste',quantity_ordered:3,quantity_received:1,quantity_pending:2,unit_cost:30,item_status:'partial',waiting_sales:[{sale_id:ids.sale,customer_name:'Cliente fictício',sale_date:'2026-10-23',quantity_missing:1}]};
  const order={id:ids.order,supplier_id:'supplier-fixture',supplier_name:'Fornecedor fictício',item_count:1,destination_code:'TESTE',destination_name:'Local fictício',ordered_on:'2026-10-23',items:[item],status:'partial',ordered_units:3,received_units:1,pending_units:2,waiting_sales_count:1,order_total:90,notes:'Notas fictícias'};
  const shared='src/components/operational-pages/supplier-order-details-page.tsx';
  const relative=fs.existsSync(path.resolve(__dirname,'../..',shared))?shared:'src/app/(app)/pedidos-fornecedor/[id]/page.tsx';
  const Page=load(relative,{...common,
    '@/lib/data':{getSupplierOrderDetails:async id=>{calls.push(['order',id]);return missing?null:order}},
    '@/lib/supabase/server':{createClient:async()=>({from:table=>({select:columns=>({eq:async(column,id)=>{calls.push([table,columns,column,id]);return {data:[{id:item.id,flavor_name:'Sabor fictício'}],error}}})})})},
    '@/components/receive-purchase-item-form':{ReceivePurchaseItemForm:({item})=>{forms.push(item);return h('button',{type:'button'},'Receber item')}},
    '@/components/purchase-order-cancel-action':{PurchaseOrderCancelAction:props=>h('button',{'data-order':props.orderId,type:'button'},'Cancelar pedido')},
  }).default;
  return {Page,calls,forms,order};
}
function saleView() {
  const sale={id:ids.sale,customer_id:ids.customer,customer_name:'Cliente fictício',quote_id:'quote-fixture',order_at:'2026-10-23',total_amount:50,general_status:'active',payment_status:'pending',delivery_status:'pending',items:[{id:'sale-item',product_id:ids.product,product_name:'Produto fictício',quantity:1,unit_price:50,unit_cost:30,delivered_quantity:0}]};
  const slots=[];
  const View=load('src/components/sale-details-view.tsx',{...common,
    '@/lib/reservation-status':{getReservationStatusLabel:String},
    '@/components/badge':{Badge:({value})=>h('span',null,value)},
    ...Object.fromEntries([['sale-payment-panel','SalePaymentPanel'],['sale-status-actions','SaleStatusActions'],['change-sale-customer','ChangeSaleCustomer']].map(([file,name])=>[`@/components/${file}`,{[name]:props=>{slots.push({name,props});return h('button',{type:'button'},name)}}])),
  }).SaleDetailsView;
  return {View,sale,slots};
}
module.exports={load,common,ids,supplier,saleView};
