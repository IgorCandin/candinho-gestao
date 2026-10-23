/* eslint-disable @typescript-eslint/no-require-imports -- Server action with fail-closed RPC fixture. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const id='11111111-1111-4111-8111-111111111111';
function fixture(allowed=true){
  const calls=[],invalidated=[];
  const file=path.resolve(__dirname,'../src/app/(app)/bank/commitment-actions.ts'),mod=new Module(file,module);
  mod.require=name=>name==='next/navigation'?{redirect:href=>{throw Error('redirect:'+href);}}:name==='next/cache'?{revalidatePath:href=>invalidated.push(href)}:name==='@/lib/supabase/server'?{createClient:async()=>({rpc:async(name,args)=>{calls.push([name,args]);if(name==='can_write_bank')return {data:allowed,error:null};if(String(args.p_commitment_key).startsWith('weekly_subscription:'))return {error:Error('Tipo de compromisso não suportado')};return {error:null};}})}:name==="@/lib/bank-money-input"?require("./helpers/company-navigation-fixtures.cjs").load("src/lib/bank-money-input.ts"):require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
  return {calls,invalidated,run:kind=>{const form=new FormData();form.set('commitment_key',`${kind}:${id}${kind==='weekly_subscription'?':2026-10-19':''}`);form.set('reference_month','2026-10-01');form.set('amount','60,00');form.set('notes','Teste isolado');return mod.exports.adjustBankMonthCommitment(form);}};
}
test('weekly detail routes to existing occurrence controls without calling monthly adjustment',async()=>{
  const h=fixture();await assert.rejects(()=>h.run('weekly_subscription'),new RegExp('redirect:/bank/mensalidades\\?editar='+id));
  assert.deepEqual(h.calls,[['can_write_bank',undefined]]);assert.equal(h.invalidated.length,0);
});
test('supported monthly adjustment preserves permission, payload and invalidation',async()=>{
  const h=fixture();await assert.rejects(()=>h.run('subscription'),/redirect:\/bank\?salvo=compromisso-ajustado/);
  assert.deepEqual(h.calls,[['can_write_bank',undefined],['bank_adjust_month_commitment',{p_commitment_key:`subscription:${id}`,p_reference_month:'2026-10-01',p_amount:60,p_notes:'Teste isolado'}]]);
  assert.deepEqual(h.invalidated,['/bank','/bank/visao-anual']);
});
test('read-only caller cannot adjust or bypass permissions with a weekly key',async()=>{
  const h=fixture(false);await assert.rejects(()=>h.run('weekly_subscription'),/permissão/);assert.equal(h.calls.length,1);
});

test('dashboard keeps monthly form but directs weekly details to the existing subscription editor',async()=>{
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  for(const kind of ['subscription','weekly_subscription']) {
    const row={id:`${kind}:${id}${kind==='weekly_subscription'?':2026-10-19':''}`,kind,title:'Teste',amount:60,dueDate:'2026-10-19',dueMode:'fixed_day',status:'pending',href:'/bank/mensalidades'};
    const month={referenceMonth:'2026-10-01',monthLabel:'outubro',today:'2026-10-19',commitments:[row],overdue:[],dueToday:[row],upcoming:[],monthPending:[],remainingMonthTotal:60,monthPendingTotal:0,overdueTotal:0,dueTodayTotal:60,monthCommitmentTotal:60,receivableThisMonthTotal:0};
    const paid=[];const h=React.createElement;
    const mocks={'next/link':({children,href,className})=>h('a',{href,className},children),'lucide-react':new Proxy({},{get:()=>()=>null}),'@/components/operation-investment-panel':{OperationInvestmentPanel:()=>null},'@/components/bank-paid-form':{BankPaidForm:props=>{paid.push(props);return h('button',null,'Paguei');}},'@/components/bank-dashboard-dialog':{BankDashboardDialog:({children})=>h('section',null,children)},'@/lib/bank-data':{getBankAccounts:async()=>[],getBankDashboardData:async()=>({summary:{totalBalance:100},annualProjection:[],investment:{}}),getBankDebts:async()=>[]},'@/lib/bank-home-data-v2':{getBankMonthHomeDataV2:async()=>month},'@/lib/bank-financial-goals':{getBankFinancialGoals:async()=>[]},'@/lib/format':{formatCurrency:String,formatDateOnly:String},'./commitment-actions':{adjustBankMonthCommitment:()=>{throw Error('WRITE BLOCKED');}},'./atualizar/actions':{saveBankQuickUpdate:()=>{throw Error('WRITE BLOCKED');}}};
    const file=path.resolve(__dirname,'../src/app/(app)/bank/page.tsx'),mod=new Module(file,module);
    mod.require=name=>name in mocks?mocks[name]:name==="@/lib/bank-money-input"?require("./helpers/company-navigation-fixtures.cjs").load("src/lib/bank-money-input.ts"):require(name);
    mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);
    const html=renderToStaticMarkup(await mod.exports.default({searchParams:Promise.resolve({compromisso:row.id})}));
    if(kind==='weekly_subscription') {assert.ok(html.includes(`/bank/mensalidades?editar=${id}`));assert.ok(!html.includes('Salvar valor deste mês'));assert.ok(html.includes('não ao total do mês'));}
    else {assert.ok(html.includes('Salvar valor deste mês'));assert.ok(html.includes('name="amount"'));}
    assert.ok(paid.some(props=>props.commitmentKey===row.id&&props.referenceMonth==='2026-10-01'));
  }
});
