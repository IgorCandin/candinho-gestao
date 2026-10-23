const {test}=require('node:test'),assert=require('node:assert/strict'),React=require('react');
const {load}=require('./helpers/company-navigation-fixtures.cjs');
const {discoveryUrl,discoveryFilters}=load('src/lib/storefront-navigation.ts');
const nodes=n=>!n||typeof n!=='object'?[]:[n,...React.Children.toArray(n.props?.children).flatMap(nodes)];
function stateHooks(){let cursor=0;const values=[];return{reset(){cursor=0},hooks:{...React,useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return[values[i],v=>values[i]=typeof v==='function'?v(values[i]):v]},useMemo:fn=>fn(),useEffect(){},useRef:()=>({current:null})}}}
function discovery(props={}){const h=stateHooks();const View=load('src/components/storefront-discovery.tsx',{
 react:h.hooks,'next/link':'a','next/image':'img','./storefront-discovery-image':{StorefrontDiscoveryImage:'img'},'./storefront-discovery.module.css':new Proxy({},{get:(_,key)=>key}),
 './storefront-campaign-rail':{StorefrontCampaign:'campaign'},'./use-storefront-motion':{useStorefrontMotion:()=>({enabled:false})},'./use-storefront-scroll':{useStorefrontScroll(){}},
 '@/lib/storefront-discovery-images':{discoveryCutout(){},discoveryImage(){},discoveryOriginal(){}},'@/lib/storefront-discovery-selection':{availableSizes:()=>[],discoveryCollections:()=>[]},'@/lib/format':{formatCurrency:String},
 './storefront-support':{StorefrontSupport:'support'},'./storefront-saved-share':{StorefrontSavedShare:'saved-share'},'@/lib/storefront-selection-message':{defaultSelectionChoice:{},STOREFRONT_WHATSAPP:'fixture'},
 }).StorefrontDiscovery;return()=>{h.reset();return View({snapshot:{products:{supplements:[],fitness:[]},promotions:{supplements:[],fitness:[]}},links:[],availability:{},testimonials:[],remaining:null,...props})};}
test('public header separates client and internal access, with skip link and no legacy storefront navigation',()=>{
 const tree=discovery()(),links=nodes(tree).filter(n=>n.type==='a');
 assert.ok(links.some(n=>n.props.href==='/company/inicio'&&String(n.props.children).includes('Área interna')));
 assert.ok(links.some(n=>n.props.href==='/minha-conta'));assert.ok(links.some(n=>n.props.href==='#discovery-products'));
 assert.ok(!links.some(n=>n.props.href==='/vitrine'||n.props.href==='/catalogo'));
 assert.ok(links.some(n=>n.props.href==='/politica-de-privacidade'));
});
test('legacy deep-link filters seed the discovery UI and stay within a fixed public destination',()=>{
 const params={operacao:'Fitness',busca:'Legging & rosa',tag:['a','b'],next:'https://example.invalid'};
 const u=new URL(discoveryUrl(params),'https://local.invalid');assert.equal(u.pathname,'/catalogo/descobrir');assert.deepEqual(u.searchParams.getAll('tag'),['a','b']);
 const filters=discoveryFilters(params);assert.deepEqual(filters,{initialOperation:'fitness',initialQuery:'Legging & rosa'});
 const tree=discovery(filters)();assert.equal(tree.props['data-operation'],'fitness');assert.equal(nodes(tree).find(n=>n.type==='input').props.value,'Legging & rosa');
 assert.equal(discoveryFilters({operation:'unknown',q:['Creatina','Outra']}).initialQuery,'Creatina');
});
test('coupon privacy link and announced error do not change consent defaults or the RPC contract',async()=>{
 const h=stateHooks(),calls=[],original=global.FormData;global.FormData=class{get(){return null}};
 try{const View=load('src/components/storefront-coupon-signup.tsx',{react:h.hooks,'./use-storefront-coupon':{useStorefrontCoupon:()=>({setCoupon(){}})},'@/lib/supabase/client':{createClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return{error:new Error('Fixture recusada')}}})}}).StorefrontCouponSignup;
 const view=()=>{h.reset();return View({initialRemaining:null})};let tree=view();
 assert.ok(nodes(tree).some(n=>n.type==='a'&&n.props.href==='/politica-de-privacidade'&&n.props.rel==='noopener noreferrer'));
 assert.ok(nodes(tree).filter(n=>n.type==='input'&&n.props.type==='checkbox').every(n=>!n.props.defaultChecked&&!n.props.checked));
 await nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:{}});
 assert.equal(calls[0].name,'claim_storefront_coupon_v1');assert.equal(calls[0].args.p_consent_whatsapp,false);assert.equal(calls[0].args.p_consent_email,false);assert.equal(calls[0].args.p_consent_sms,false);
 assert.ok(nodes(view()).some(n=>n.props?.role==='alert'));
 }finally{global.FormData=original}
});
