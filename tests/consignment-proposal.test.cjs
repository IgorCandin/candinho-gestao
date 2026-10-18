const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const {PDFDocument}=require('pdf-lib');
function load(relative,mocks={}){
 const file=path.resolve(__dirname,relative),mod=new Module(file,module);
 mod.require=id=>id in mocks?mocks[id]:require(id);
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);
 return mod.exports;
}
const id='11111111-2222-4333-8444-555555555555';
function route(access={active:true,canAccessFitness:true},itemError=null){
 const calls=[],documents=[];
 const db={from(table){calls.push(table);return {select(){return this},eq(){return this},async maybeSingle(){return {data:{id,customer_name:'Cliente teste',started_on:'2026-10-18'}}},async order(){return {data:[{product_name:'Jaqueta',size:'G',color:'Preto',quantity_sent:2,unit_price:59.9,quantity_sold:0}],error:itemError}}};}};
 const {GET}=load('../src/app/api/fitness/consignacoes/[id]/orcamento/route.ts',{
  '@/lib/data':{getCurrentUserAccess:async()=>access},'@/lib/supabase/server':{createClient:async()=>db},
  '@/lib/fitness-consignment-proposal-pdf':{buildConsignmentProposalPdf:async p=>{documents.push(p);return new Uint8Array([1,2])}},
  'node:fs/promises':{readFile:async()=>{throw Error('fixture without logo')}},
 });
 return {GET,calls,documents};
}
test('proposal reads this consignment and original sent pieces, without creating quote or sale',async()=>{
 const h=route();const response=await h.GET(new Request('http://test'),{params:Promise.resolve({id})});
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/pdf/);
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(h.calls,['fitness_consignments_overview','fitness_consignment_items_overview']);
 assert.deepEqual(h.documents[0].items,[{name:'Jaqueta',size:'G',color:'Preto',quantity:2,unitPrice:59.9}]);
 assert.equal(h.documents[0].id,id);
});
test('permission, invalid identifier and failed item reads cannot produce a partial or empty quote',async()=>{
 const denied=route({active:true,canAccessFitness:false});assert.equal((await denied.GET(null,{params:Promise.resolve({id})})).status,403);assert.equal(denied.calls.length,0);
 const invalid=route();assert.equal((await invalid.GET(null,{params:Promise.resolve({id:'bad'})})).status,400);assert.equal(invalid.calls.length,0);
 const failed=route(undefined,{message:'failure'});assert.equal((await failed.GET(null,{params:Promise.resolve({id})})).status,500);assert.equal(failed.documents.length,0);
});
test('PDF handles long names, accents and many items with readable page breaks',async()=>{
 const {buildConsignmentProposalPdf}=load('../src/lib/fitness-consignment-proposal-pdf.ts');
 const bytes=await buildConsignmentProposalPdf({id,customerName:'Cliente de teste · Conceição',startedOn:'2026-10-18',items:Array.from({length:35},()=>({name:'Jaqueta de proteção UV com descrição longa '.repeat(3),size:'G',color:'Azul Marinho',quantity:2,unitPrice:59.9}))});
 const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>1);
 assert.ok(bytes.length>2000);
});
