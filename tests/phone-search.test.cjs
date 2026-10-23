const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {load}=require('./helpers/company-navigation-fixtures.cjs');
const {phoneMatchesQuery}=load('src/lib/phone-search.ts');
test('phone search normalizes punctuation without turning text or short numbers into phone matches',()=>{
 for(const query of ['32999990000','(32) 99999-0000','9999-0000','+55 32 99999 0000'])assert.equal(phoneMatchesQuery(query,'+55 (32) 99999-0000'),true);
 for(const query of ['','123','produto 9999','00001111'])assert.equal(phoneMatchesQuery(query,'+55 (32) 99999-0000'),false);
 assert.equal(phoneMatchesQuery('99990000',null),false);
});
test('mobile back target and header column grow together, preserving the actual navigation handler',()=>{
 const css=fs.readFileSync('src/app/styles.css','utf8'),shell=fs.readFileSync('src/components/app-shell.tsx','utf8');
 assert.match(css,/\.mobile-header\s*\{ grid-template-columns: 44px minmax\(0, 1fr\) auto; gap: 8px; \}/);
 assert.match(css,/\.mobile-back-button\s*\{ width: 44px; height: 44px;/);
 assert.match(shell,/<button className="mobile-back-button" type="button" aria-label="Voltar" onClick=\{goBack\}>/);
});
