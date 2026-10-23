const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./helpers/company-navigation-fixtures.cjs');
test('existing session boundary still sends anonymous to login and phone-only customer to own portal',async()=>{
 const prior={url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY};
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://fixture.invalid';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='fixture';
 try{for(const user of [null,{phone:'+550000000000',email:null},{email:'operator@example.invalid'}]){
  let accessCalls=0;
  const {updateSession}=load('src/lib/supabase/proxy.ts',{'@/lib/access':{FITNESS_SALES_EMAIL:'fitness@example.invalid',MANAGER_EMAIL:'manager@example.invalid'},'@supabase/ssr':{createServerClient:()=>({auth:{getUser:async()=>({data:{user},error:null})},rpc:async()=>{accessCalls++;return{data:{active:true,role:'operator'}}}})},'next/server':{NextResponse:{next:()=>({kind:'next',cookies:{set(){}}}),redirect:url=>({kind:'redirect',url,cookies:{set(){}}})}}});
  const nextUrl=new URL('https://fixture.invalid/company/inicio');nextUrl.clone=()=>new URL(nextUrl);
  const result=await updateSession({nextUrl,cookies:{getAll:()=>[],set(){}}});
  if(!user){assert.equal(result.url.pathname,'/login');assert.equal(result.url.searchParams.get('next'),'/company/inicio');}
  else if(user.phone){assert.equal(result.url.pathname,'/minha-conta');assert.equal(accessCalls,0);}
  else assert.equal(result.kind,'next');
 }}finally{for(const [key,value] of [['NEXT_PUBLIC_SUPABASE_URL',prior.url],['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',prior.key]]){if(value===undefined)delete process.env[key];else process.env[key]=value}}
});
test('Company entry retains its existing inactive and partner guard',async()=>{
 for(const access of [{active:false,role:'operator'},{active:true,role:'partner'}]){
  const Page=load('src/app/(app)/company/inicio/page.tsx',{'next/navigation':{redirect:href=>{throw Object.assign(new Error('redirect'),{href})}},'next/link':'a','@/lib/data':{getCurrentUserAccess:async()=>access,getDashboard:async()=>({})},'@/components/company-daily-hub':{},'@/components/company-action-grid':{},'@/components/operation-switcher':{},'@/components/company-entry-portal':{},'@/components/company-priority-preview':{}}).default;
  await assert.rejects(Page(),e=>e.href==='/dashboard');
 }
});
