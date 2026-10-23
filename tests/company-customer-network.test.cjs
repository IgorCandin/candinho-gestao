/* eslint-disable @typescript-eslint/no-require-imports -- Existing portal with fictitious network, no API writes. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {load,common,ids}=require('./helpers/company-navigation-fixtures.cjs');
function fixture(pathname,enabled=true){
  const effects=[];let index=0;
  const data={network:{customerId:ids.customer,autoPartner:null,affiliations:[],relationships:[{id:'relation-fixture',relatedCustomerId:ids.sale,relatedName:'Pessoa relacionada fictícia',relationType:'friend',direction:'outgoing'}]},customers:[],partners:[]};
  const values=[{},data,false,false,null,'related','','friend','','','','student_of_partner','',true,true];
  const Portal=load('src/components/customer-relationships-portal.tsx',{...common,'next/navigation':{usePathname:()=>pathname},react:{...React,useMemo:fn=>fn(),useEffect:fn=>effects.push(fn),useState:()=>[values[index++],()=>{}]},'react-dom':{createPortal:content=>content}}).CustomerRelationshipsPortal;
  return {tree:Portal({enabled}),effects};
}
test('existing network renders in Company with related customer links remaining in Company',()=>{
  for(const prefix of ['/company/clientes','/clientes']){
    const {tree}=fixture(`${prefix}/${ids.customer}`);assert.ok(tree,'same portal must recognize the route');
    const html=renderToStaticMarkup(tree);assert.ok(html.includes('Vínculos do cliente'));assert.ok(html.includes('Pessoa relacionada fictícia'));assert.ok(html.includes(`href="${prefix}/${ids.sale}"`));assert.ok(html.includes('Adicionar relacionado'));assert.ok(html.includes('Remover vínculo'));
  }
});
test('portal stays absent for disabled access, Fitness ids and non-detail paths',()=>{
  assert.equal(fixture(`/company/clientes/${ids.customer}`,false).tree,null);
  for(const pathname of ['/company/clientes','/company/clientes/novo',`/company/clientes/fitness/${ids.customer}`,`/company/clientes/${ids.customer}/editar`,`/company-other/clientes/${ids.customer}`])assert.equal(fixture(pathname).tree,null,pathname);
});
test('activating Company portal mounts its anchor and only reads the existing network API',async()=>{
  const {effects}=fixture(`/company/clientes/${ids.customer}`);let appended=0,removed=0;
  const originalDocument=global.document,originalFetch=global.fetch;const calls=[];
  try{global.fetch=async(...args)=>{calls.push(args);return {ok:true,json:async()=>({network:{},customers:[],partners:[]})}};global.document={createElement:()=>({remove:()=>removed++}),querySelector:selector=>selector==='main'?{appendChild:()=>appended++}:null};const cleanup=effects[0]();effects[1]();await new Promise(resolve=>setImmediate(resolve));assert.equal(appended,1);assert.deepEqual(calls,[[`/api/customers/${ids.customer}/relationships`,{cache:'no-store'}]]);cleanup();assert.equal(removed,1);}finally{global.document=originalDocument;global.fetch=originalFetch;}
});
