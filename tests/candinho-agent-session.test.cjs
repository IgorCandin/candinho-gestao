/* eslint-disable @typescript-eslint/no-require-imports -- Controller unit tests with fake workers. */
const {test}=require('node:test');const assert=require('node:assert/strict');
const {runSession,validateQueue}=require('../scripts/candinho-agent/session.cjs');
const job=(id,state='approved_read_only')=>({id,revision:'a'.repeat(40),card:'https://trello.com/c/Test123',state,prompt:'Read only'});
const result=(status='reviewed',tokens=5)=>({status,summary:'Isolated evidence',evidence:['fixture'],tokens});
test('continues after a human dependency and checkpoints two actual dispatches',async()=>{
 const calls=[],saved=[];const state={};
 await runSession({queue:[job('blocked','needs_human'),job('one'),job('two')],state,execute:async j=>{calls.push(j.id);return result(j.id==='one'?'needs_human':'reviewed')},save:async s=>saved.push(JSON.parse(JSON.stringify(s)))});
 assert.deepEqual(calls,['one','two']);assert.equal(state.status,'stopped');assert.equal(state.tokens,10);assert.equal(saved[1].jobs['one:'+ 'a'.repeat(40)].status,'in_progress');
});
test('does not repeat finished or interrupted revisions on resume',async()=>{
 const state={jobs:{['one:'+ 'a'.repeat(40)]:{status:'in_progress'}}};let calls=0;
 await runSession({queue:[job('one'),job('two')],state,execute:async()=>{calls++;return result()},save:async()=>{}});assert.equal(calls,1);
});
test('worker failure stops once without a retry or dispatching another job',async()=>{
 let calls=0;const state={};await runSession({queue:[job('one'),job('two')],state,execute:async()=>{calls++;throw Error('quota')},save:async()=>{}});assert.equal(calls,1);assert.equal(state.reason,'worker_failed');
});
test('limits tokens, task count, wall time and manual stop between dispatches',async()=>{
 for(const options of [{maxJobs:1},{maxTokens:5},{stop:()=>true},{maxMs:1,now:(()=>{let i=0;return()=>i++})()}]){
 let calls=0;const state={};await runSession({queue:[job('one'),job('two')],state,execute:async()=>{calls++;return result()},save:async()=>{},...options});assert.ok(calls<=1);assert.ok(['budget','manual_stop'].includes(state.reason));}
});
test('rejects unsafe identities, unapproved states, duplicate jobs and unbounded sessions',async()=>{
 for(const queue of [[job('../escape')],[job('x','merge')],[job('x'),job('x')],[{...job('x'),card:'https://evil.invalid'}]])assert.throws(()=>validateQueue(queue));
 await assert.rejects(runSession({queue:[],state:{},maxJobs:100,execute:async()=>result(),save:async()=>{}}));
});
test('missing usage/evidence cannot produce a successful checkpoint',async()=>{
 const state={};await runSession({queue:[job('one')],state,execute:async()=>({status:'reviewed'}),save:async()=>{}});assert.equal(state.reason,'worker_failed');
});
