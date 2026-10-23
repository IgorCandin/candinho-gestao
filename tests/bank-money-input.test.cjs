/* eslint-disable @typescript-eslint/no-require-imports -- Pure parser and action-function fixtures, no database. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const files=['contas/actions.ts','atualizar/actions.ts','entradas/actions.ts','entradas/receipt-actions.ts','faturas/actions.ts','faturas/rapido/actions.ts','mensalidades/actions.ts','cobrancas/actions.ts','emprestimos/actions.ts','emprestimos/correction-actions.ts','commitment-actions.ts','objetivos/actions.ts'];
function fn(source,name,deps={}){const ast=ts.createSourceFile('fixture.ts',source,ts.ScriptTarget.Latest,true);const n=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(n);return vm.runInNewContext(ts.transpileModule(n.getText(ast).replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText+'\n'+name,deps);}
function helper(){const file='src/lib/bank-money-input.ts';return fs.existsSync(file)?fn(fs.readFileSync(file,'utf8'),'parseBankMoneyInput'):undefined;}
function parser(source){const name=source.includes('function parseOptionalMoney(')?'parseOptionalMoney':source.includes('function money(')?'money':'parseMoney';return fn(source,name,{parseBankMoneyInput:helper()});}
test('every Bank money wrapper rejects a dotted ambiguous thousand instead of saving 1.23',()=>{
 for(const file of files){const p=parser(fs.readFileSync('src/app/(app)/bank/'+file,'utf8'));for(const raw of ['1.234','12.345','R$ 2.000'])assert.throws(()=>p(raw),undefined,file+': '+raw);}
});
test('central parser accepts explicit BR and technical decimal formats, rejects malformed and ambiguous input',()=>{
 const p=helper();assert.ok(p,'shared parser exists');
 for(const [raw,value] of [['1.234,56',1234.56],['1234,56',1234.56],['1234',1234],['0,99',.99],['1,23',1.23],['1.23',1.23],['1234.56',1234.56],['R$ 2.000,00',2000],['-1,20',-1.2],[' 1 234,56 ',1234.56]])assert.equal(p(raw),value,raw);
 for(const raw of ['1.234','12.345','2.000','1,2,3','1.23,45','1,234.56','1e3','0x10','Infinity','lixo','','1.2345','99999999999999999'])assert.throws(()=>p(raw),undefined,raw);
});
test('all wrappers preserve their previous blank, zero, negative and valid-format contracts',()=>{
 for(const file of files){const full='src/app/(app)/bank/'+file;const before=parser(execFileSync('git',['show','origin/main:'+full],{encoding:'utf8'})),after=parser(fs.readFileSync(full,'utf8'));
 const outcome=(p,value)=>{try{return ['value',p(value)]}catch(e){return ['error',e.message]}};
 for(const value of [null,'','0','-1','1,23','1234,56','1.23'])assert.deepEqual(outcome(after,value),outcome(before,value),file+': '+value);
 }
});
