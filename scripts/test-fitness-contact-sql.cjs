/* Isolated PostgreSQL/WASM only. No network, credentials or real customers. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PGlite}=require(process.env.PGLITE_MODULE||path.resolve('.codex-tmp/sql-harness/node_modules/@electric-sql/pglite'));
async function main(){
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   create function public.can_write_fitness() returns boolean language sql as $$select coalesce(current_setting('test.write',true),'false')::boolean$$;
   create function public.can_access_operation(text) returns boolean language sql as $$select true$$;
   create table public.fitness_customers(id uuid primary key,active boolean);
   insert into public.fitness_customers values('00000000-0000-4000-8000-000000000001',true),('00000000-0000-4000-8000-000000000002',false);
   set test.uid='00000000-0000-4000-8000-000000000003';set test.write='true';`);
  await db.exec(fs.readFileSync('supabase/migrations/20261019203000_fitness_opportunity_contacts.sql','utf8'));
  const today=(await db.query(`select (now() at time zone 'America/Sao_Paulo')::date::text as today`)).rows[0].today;
  const day=n=>new Date(Date.parse(today+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
  const call=(status,revision,date=null,customer='00000000-0000-4000-8000-000000000001')=>db.query('select public.record_fitness_opportunity_contact_v1($1,$2,$3,$4,$5) as contact',[customer,status,revision,date,'fixture']);
  // Red: existing SQL rejects the date selected for contacted.
  await assert.rejects(call('contacted',0,day(10)),e=>e.code==='22023');
  console.log('RED reproduced: original SQL rejects contacted custom date');
  await db.exec(fs.readFileSync('supabase/migrations/20261023171120_fitness_contact_optional_return.sql','utf8'));
  assert.equal((await call('contacted',0,day(10))).rows[0].contact.next_contact_on,day(10));
  assert.equal((await call('contacted',1)).rows[0].contact.next_contact_on,day(6));
  for(const date of [today,day(-1)])await assert.rejects(call('contacted',2,date),e=>e.code==='22023');
  await assert.rejects(call('later',2,today),e=>e.code==='22023');
  await assert.rejects(call('contacted',2,'2026-02-30'),e=>e.code==='22008');
  await assert.rejects(call('responded',2,day(4)),e=>e.code==='22023');
  await assert.rejects(call('contacted',1,day(4)),e=>e.code==='40001');
  await db.exec("set test.write='false'");
  await assert.rejects(call('contacted',2,day(4)),e=>e.code==='42501');
  await db.exec("set test.write='true'");
  await assert.rejects(call('contacted',0,day(4),'00000000-0000-4000-8000-000000000002'));
  assert.equal((await call('later',2,day(15))).rows[0].contact.next_contact_on,day(15));
  assert.equal((await call('responded',3)).rows[0].contact.next_contact_on,null);
  const rows=(await db.query('select status,next_contact_on::text,revision from public.fitness_opportunity_contact_history order by revision')).rows;
  assert.equal(rows.length,4);assert.equal(rows[0].next_contact_on,day(10));assert.equal(rows[1].next_contact_on,day(6));
  const before=JSON.stringify(rows);
  await db.exec(fs.readFileSync('supabase/migrations/20261023171120_fitness_contact_optional_return.sql','utf8'));
  assert.equal(JSON.stringify((await db.query('select status,next_contact_on::text,revision from public.fitness_opportunity_contact_history order by revision')).rows),before);
  console.log('PASS: custom/default dates, past/today/invalid, status, revision, permissions, inactive customer, history and migration without rewrites');
 }finally{await db.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
