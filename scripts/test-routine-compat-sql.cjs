/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS isolated PostgreSQL runner, matching existing harnesses. */
/* Isolated PostgreSQL contract; existing RPC engine and prepared adapter, no production credentials. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PGlite}=require(process.env.PGLITE_MODULE||path.resolve('.codex-tmp/sql-harness/node_modules/@electric-sql/pglite'));
async function main(){const db=new PGlite();try{
  await db.exec(`create schema auth;create role anon;create role authenticated;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.user',true),'')::uuid$$;
    create table nexus_user_routines(id uuid primary key,title text,description text,source text,steps jsonb);
    create table nexus_routine_runs(id uuid primary key,routine_id uuid,user_id uuid,current_step integer,status text,started_at timestamptz default now(),updated_at timestamptz default now(),completed_at timestamptz,history jsonb default '[]');`);
  const source=fs.readFileSync('supabase/migrations/20260806225408_nexus_guided_routines_v1.sql','utf8');
  function engine(name){const start=source.indexOf(`create or replace function public.${name}(`);assert.ok(start>=0);return source.slice(start,source.indexOf('\n$$;',start)+4);}
  await db.exec(engine('nexus_active_routine_v1'));await db.exec(engine('nexus_advance_routine_v1'));await db.exec(engine('nexus_cancel_routine_v1'));
  const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',routine='00000000-0000-4000-8000-000000000003',run='00000000-0000-4000-8000-000000000004';
  const expected='/clientes/00000000-0000-4000-8000-000000000005';const observed=`/company${expected}`;
  await db.query("select set_config('test.user',$1,false)",[owner]);
  await db.query("insert into nexus_user_routines values($1,'Fixture',null,'manual',$2)",[routine,JSON.stringify([{href:expected},{href:expected},{href:'/nexus/fila'}])]);
  await db.query("insert into nexus_routine_runs(id,routine_id,user_id,current_step,status) values($1,$2,$3,0,'active')",[run,routine,owner]);
  await db.query("select nexus_advance_routine_v1($1,'arrive',$2)",[run,observed]);
  assert.equal((await db.query('select current_step from nexus_routine_runs')).rows[0].current_step,0,'reproduces literal URL mismatch in existing RPC');
  const adapter=fs.readFileSync('docs/engineering/prepared/nexus_routine_step_compat.sql','utf8');
  assert.match(adapter,/for update;/i);assert.match(adapter,/user_id=v_user/);
  await db.exec(adapter);
  const acl=(await db.query("select has_function_privilege('anon','nexus_advance_routine_step_v1(uuid,integer,text,text,text)','EXECUTE') as anon,has_function_privilege('authenticated','nexus_advance_routine_step_v1(uuid,integer,text,text,text)','EXECUTE') as authenticated")).rows[0];assert.equal(acl.anon,false);assert.equal(acl.authenticated,true);
  const advance=(step,action='arrive',href=expected,actual=observed)=>db.query('select nexus_advance_routine_step_v1($1,$2,$3,$4,$5)',[run,step,action,href,actual]);
  await advance(0);let state=(await db.query('select * from nexus_routine_runs')).rows[0];
  assert.equal(state.current_step,1);assert.equal(state.history[0].href,expected);assert.equal(state.history[0].observed_href,observed);
  await assert.rejects(()=>advance(0),/rotina mudou/);assert.equal((await db.query('select current_step from nexus_routine_runs')).rows[0].current_step,1,'duplicate step rejected even with consecutive identical hrefs');
  await advance(1,'arrive','/different');assert.equal((await db.query('select current_step from nexus_routine_runs')).rows[0].current_step,1);
  await db.query("select set_config('test.user',$1,false)",[other]);await assert.rejects(()=>advance(1),/rotina mudou/);
  assert.equal((await db.query('select nexus_cancel_routine_v1($1) as cancelled',[run])).rows[0].cancelled,false);
  await db.query("select set_config('test.user','',false)");await assert.rejects(()=>advance(1),/Sessão inválida/);
  await db.query("select set_config('test.user',$1,false)",[owner]);await advance(1,'skip');
  assert.equal((await db.query('select current_step from nexus_routine_runs')).rows[0].current_step,2);
  assert.equal((await db.query('select nexus_cancel_routine_v1($1) as cancelled',[run])).rows[0].cancelled,true);
  await assert.rejects(()=>advance(2),/rotina mudou/);
  assert.equal((await db.query('select nexus_cancel_routine_v1($1) as cancelled',[run])).rows[0].cancelled,false);
  await db.exec("update nexus_routine_runs set status='active',current_step=2");await advance(2,'arrive','/nexus/fila','/nexus/fila');
  state=(await db.query('select * from nexus_routine_runs')).rows[0];assert.equal(state.status,'completed');assert.equal(state.current_step,3);assert.equal(state.history.length,4);
  await assert.rejects(()=>advance(2),/rotina mudou/);
  console.log('PASS: existing mismatch reproduced; guarded arrival, duplicate/consecutive step, divergence, owner/session, skip, cancel, completion and observed-href audit verified in isolated PostgreSQL. Row-lock SQL checked; true multi-connection contention not simulated by PGlite.');
}finally{await db.close();}}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
