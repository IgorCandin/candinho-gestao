const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(relative,mocks={}){
 const file=path.resolve(__dirname,relative),compiled=new Module(file,module);
 compiled.require=id=>id in mocks?mocks[id]:require(id);
 compiled._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
 return compiled.exports;
}
test('stock attention prioritizes uncovered demand without treating incoming stock as delivered',()=>{
 const {compareStockAttention,stockPriority}=load('../src/lib/stock-attention-priority.ts');
 const row=(product_name,available_quantity,backlog_quantity,incoming_quantity=0)=>({product_name,available_quantity,backlog_quantity,incoming_quantity,needs_replenishment:true});
 const urgent=row('Urgent',0,4,100),less=row('Less',0,1),reserved=row('Reserved',5,2),replenish=row('Replenish',0,0);
 assert.deepEqual([replenish,reserved,less,urgent].sort(compareStockAttention).map(x=>x.product_name),['Urgent','Less','Reserved','Replenish']);
 assert.equal(stockPriority(urgent).rank,0);
});
test('received income remains editable and defaults to the existing total, never double counted',()=>{
 const {BankPlanningIncomes}=load('../src/components/bank-planning-incomes.tsx',{
 react:{...React,useActionState:()=>[{message:'',ok:false},()=>{},false]},
 'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},
 '@/lib/format':{formatCurrency:String},
 '@/app/(app)/bank/entradas/receipt-actions':{confirmPlannerIncome(){}},
 });
 const props={month:'2026-10-01',canWrite:true,incomes:[{id:'receipt',title:'Income',state:'received',amount:3000,confirmedAmount:3000,sourceId:'source',receivedOn:'2026-10-05',kind:'fixed'}]};
 const html=renderToStaticMarkup(React.createElement(BankPlanningIncomes,props));
 assert.match(html,/Corrigir valor ou data/);assert.match(html,/value="3000,00"/);assert.doesNotMatch(html,/value="6000,00"/);assert.match(html,/value="2026-10-05"/);
 assert.doesNotMatch(renderToStaticMarkup(React.createElement(BankPlanningIncomes,{...props,canWrite:false})),/<form/);
});
