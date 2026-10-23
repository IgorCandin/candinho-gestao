const {test}=require('node:test'),assert=require('node:assert/strict'),React=require('react');
const {load}=require('./helpers/company-navigation-fixtures.cjs');
function nodes(n){return !n||typeof n!=='object'?[]:[n,...React.Children.toArray(n.props?.children).flatMap(nodes)]}
function text(n){return typeof n==='string'?n:!n||typeof n!=='object'?'':React.Children.toArray(n.props?.children).map(text).join(' ')}
function harness(){let cursor=0;const state=[],calls=[];const hooks={...React,useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return[state[i],v=>state[i]=typeof v==='function'?v(state[i]):v]},useMemo:f=>f(),useEffect(){}};
 const View=load('src/components/new-supplier-order-form.tsx',{react:hooks,'next/link':'a','next/navigation':{useRouter:()=>({push(){},refresh(){}})},'@/components/company-category-picker':{CompanyCategoryPicker:'category-picker'},'@/lib/format':{formatCurrency:String},'@/lib/supabase/client':{createClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return{data:'fixture-order',error:null}}})}}).NewSupplierOrderForm;
 return{calls,view(){cursor=0;return View({companyMode:true,initialSuppliers:[{id:'supplier',name:'Fixture'}],products:[],locations:[{id:'location',code:'CS',name:'Fixture'}],lastPurchaseCosts:{}})}};
}
const button=(h,label)=>nodes(h.view()).find(n=>n.type==='button'&&text(n).trim()===label);
function field(h,label,index=0){const labels=nodes(h.view()).filter(n=>n.type==='label'&&text(n).includes(label));return nodes(labels[index]).find(n=>['input','textarea','select'].includes(n.type));}
test('one provisional product can supply two flavor lines and is saved only through the existing atomic wrapper',async()=>{
 const h=harness();field(h,'Fornecedor ou marketplace').props.onChange({target:{value:'supplier'}});
 button(h,'Não encontrou? Cadastrar produto').props.onClick();field(h,'Nome do produto').props.onChange({target:{value:'Produto fixture'}});field(h,'Sabores (opcional').props.onChange({target:{value:'Morango\nLimão'}});button(h,'Usar neste pedido').props.onClick();assert.equal(h.calls.length,0);
 field(h,'Sabor').props.onChange({target:{value:'Morango'}});button(h,'Adicionar produto').props.onClick();
 const draftOption=nodes(h.view()).find(n=>n.type==='option'&&text(n).includes('Produto fixture'));
 field(h,'Produto',1).props.onChange({target:{value:draftOption.props.value}});field(h,'Sabor',1).props.onChange({target:{value:'Limão'}});
 await nodes(h.view()).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].name,'create_company_purchase_order_with_products_v1');const items=h.calls[0].args.p_items;
 assert.equal(items.length,2);assert.equal(items[0].draft_product.draft_key,items[1].draft_product.draft_key);assert.deepEqual(items.map(i=>i.draft_flavor),['Morango','Limão']);assert.ok(items.every(i=>i.flavor_id===null));
});
test('empty or repeated flavor names stay provisional and cannot reach a write',()=>{
 const h=harness();button(h,'Não encontrou? Cadastrar produto').props.onClick();field(h,'Nome do produto').props.onChange({target:{value:'Fixture'}});
 for(const value of ['Morango\n morango ','Morango\n\nLimão']){field(h,'Sabores (opcional').props.onChange({target:{value}});button(h,'Usar neste pedido').props.onClick();assert.ok(nodes(h.view()).some(n=>n.props?.role==='alert'));assert.equal(h.calls.length,0);}
});
