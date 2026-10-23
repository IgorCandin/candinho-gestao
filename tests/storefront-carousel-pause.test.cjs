const {test}=require('node:test'),assert=require('node:assert/strict'),React=require('react');
const {load}=require('./helpers/company-navigation-fixtures.cjs');
const nodes=n=>!n||typeof n!=='object'?[]:[n,...React.Children.toArray(n.props?.children).flatMap(nodes)];
function harness(){let cursor=0;const values=[];const hooks={...React,useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return[values[i],v=>values[i]=typeof v==='function'?v(values[i]):v]},useRef(initial){const i=cursor++;if(!(i in values))values[i]={current:initial};return values[i]},useMemo:f=>f(),useEffect(){}};
 const View=load('src/components/storefront-campaign-rail.tsx',{react:hooks,'./storefront-discovery.module.css':{__esModule:true,default:{campaignWindow:'campaignWindow'}},'./storefront-discovery-image':{StorefrontDiscoveryImage:'img'},'@/lib/storefront-discovery-images':{discoveryImage:()=>'/fixture.png',discoveryCutout:()=>false},'@/lib/storefront-discovery-selection':{carouselTime:x=>x}}).StorefrontCampaign;
 return(props={})=>{cursor=0;return View({products:[{id:'a',operation:'supplements',name:'Creatina Candinho',image_url:'/fixture.png',available:true},{id:'b',operation:'supplements',name:'Fixture',image_url:'/fixture.png',available:true}],operation:'supplements',motion:true,suspended:false,onOpen(){},onExplore(){},price:()=>'',...props})};
}
test('manual pause survives pointer leaving; resume and arrows remain independent',()=>{
 const view=harness(),pause=nodes(view()).find(n=>n.props?.['aria-label']==='Pausar animação de produtos');assert.ok(pause);pause.props.onClick();
 let tree=view(),rail=nodes(tree).find(n=>n.props?.className==='campaignWindow');assert.equal(rail.props['data-paused'],true);rail.props.onMouseLeave();
 tree=view();assert.equal(nodes(tree).find(n=>n.props?.className==='campaignWindow').props['data-paused'],true);assert.ok(nodes(tree).some(n=>n.props?.['aria-label']==='Próximo produto'));
 nodes(tree).find(n=>n.props?.['aria-label']==='Retomar animação de produtos').props.onClick();assert.equal(nodes(view()).find(n=>n.props?.className==='campaignWindow').props['data-paused'],false);
});
test('device reduced motion remains authoritative; no useless playback control without autoplay',()=>{
 const view=harness(),tree=view({motion:false});assert.equal(nodes(tree).find(n=>n.props?.className==='campaignWindow').props['data-paused'],true);assert.ok(!nodes(tree).some(n=>/animação de produtos/.test(n.props?.['aria-label']??'')));
 assert.ok(nodes(tree).some(n=>n.props?.['aria-label']==='Próximo produto'));
});
