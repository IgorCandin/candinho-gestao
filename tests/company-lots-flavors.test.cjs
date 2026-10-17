const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
const path=require('node:path');
const file=path.resolve(__dirname,'../src/lib/company-destination.ts');
const mod=new Module(file,module);
mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
const {companyDestination}=mod.exports;
test('lotes e sabores preservam filtros e fragmentos',()=>{
  const id='fb79a1a5-f61a-482f-b3f7-222941608c16';
  for(const url of ['/estoque/lotes',`/estoque/lotes/${id}`,'/estoque/sabores','/produtos/sabores/historico']) {
    assert.equal(companyDestination(`${url}?produto=${id}#historico`),`/company${url}?produto=${id}#historico`);
    assert.equal(companyDestination(`/suplementos${url}`),`/company${url}`);
  }
  assert.equal(companyDestination('/estoque/lotes/desconhecido'),'/estoque/lotes/desconhecido');
});
test('atalhos pausados Central preservam Company sem reativar IA',()=>{
  for(const route of ['ativacao','inbox','nexus','integracoes']) {
    const source=fs.readFileSync(path.resolve(__dirname,`../src/app/(app)/central/${route}/page.tsx`),'utf8');
    assert.ok(source.includes('redirect("/company/gestao/central'));
    assert.ok(!source.includes('redirect("/central'));
  }
});
