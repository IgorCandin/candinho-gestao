const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {load}=require('./helpers/company-navigation-fixtures.cjs');
const redirect=href=>{throw Object.assign(new Error('redirect'),{href})};
const routing={redirect};
test('home preserves staff/customer destinations and changes only anonymous entry',async()=>{
 for(const [user,expected] of [[null,'/catalogo/descobrir'],[{email:'staff@example.invalid'},'/company/inicio'],[{phone:'+550000000000',email:null},'/minha-conta']]){
  const Page=load('src/app/page.tsx',{'next/navigation':routing,'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user}})}})}}).default;
  await assert.rejects(Page(),e=>e.href===expected);
 }
});
test('legacy roots redirect without rendering legacy catalog; query and operation survive',async()=>{
 for(const [file,expected] of [['src/app/catalogo/page.tsx','/catalogo/descobrir?busca=Creatina+%26+lim%C3%A3o'],['src/app/vitrine/page.tsx','/catalogo/descobrir?busca=Creatina+%26+lim%C3%A3o'],['src/app/catalogo/fitness/page.tsx','/catalogo/descobrir?busca=Creatina+%26+lim%C3%A3o&operacao=fitness']]){
  const Page=load(file,{'next/navigation':routing,'@/lib/storefront-navigation':load('src/lib/storefront-navigation.ts')}).default;
  await assert.rejects(Page({searchParams:Promise.resolve({busca:'Creatina & limão'})}),e=>e.href===expected);
 }
});
test('discovery declares its own indexable canonical and products no longer inherit collection canonical',()=>{
 const source=fs.readFileSync('src/app/catalogo/descobrir/page.tsx','utf8');
 assert.match(source,/index: true/);assert.match(source,/canonical: "\/catalogo\/descobrir"/);
 const detail=fs.readFileSync('src/app/catalogo/[slug]/page.tsx','utf8');assert.match(detail,/canonical:.*\/catalogo\//);
});
