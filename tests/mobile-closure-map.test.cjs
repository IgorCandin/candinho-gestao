/* eslint-disable @typescript-eslint/no-require-imports -- Read-only SSR fixture. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');

async function render(error=null) {
  const boards=[];
  const saved=[{check_key:'supp-sales',state:'approved',notes:'iPhone conferido'}];
  const file=path.resolve(__dirname,'../src/app/(app)/company/mapa/page.tsx');
  const loaded=new Module(file,module);
  loaded.require=id=>{
    if(id==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
    if(id==='@/components/migration-audit-board')return {MigrationAuditBoard:props=>{boards.push(props);return React.createElement('section',null,props.title??'Audit');}};
    if(id==='@/lib/company-migration-tools')return {companyMigrationTools:[]};
    if(id==='@/lib/supabase/server')return {createClient:async()=>({from:table=>{
      assert.equal(table,'migration_audit_checks');return {select:()=>({in:async()=>({data:error?null:saved,error})})};
    }})};
    return require(id);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
  const original=console.error;console.error=()=>{};
  try{return {html:renderToStaticMarkup(await loaded.exports.default()),boards,saved};}finally{console.error=original;}
}
test('mobile checklist reuses ten existing keys and preserves saved approvals and full roadmap',async()=>{
  const {html,boards,saved}=await render();const mobile=boards[0];
  assert.equal(mobile.rows.length,10);assert.equal(new Set(mobile.rows.map(r=>r.key)).size,10);
  const full=boards.slice(1).flatMap(board=>board.rows);
  mobile.rows.forEach(row=>assert.ok(full.some(existing=>existing.key===row.key)));
  assert.strictEqual(mobile.saved,saved);assert.equal(saved[0].notes,'iPhone conferido');
  assert.match(html,/Roteiro completo e migração/);assert.match(html,/não foram reproduzidos/);
  assert.match(html,/Francyelle/);assert.doesNotMatch(html,/Próxima conferência · 17\/10/);
});
test('failed approval read is visible and never presented as lost progress',async()=>{
  const {html}=await render({message:'unavailable'});
  assert.match(html,/role="alert"/);assert.match(html,/pode mostrar itens já aprovados/);
});
