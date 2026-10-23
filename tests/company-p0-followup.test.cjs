/* eslint-disable @typescript-eslint/no-require-imports -- Isolated navigation checks, no real API. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {load,common}=require('./helpers/company-navigation-fixtures.cjs');

test('lead customer registration respects Company without replacing the lead form',()=>{
  const {NewLeadForm}=load('src/components/new-lead-form.tsx',{
    ...common,
    'next/navigation':{useRouter:()=>({push(){throw Error('Unexpected navigation')},refresh(){throw Error('Unexpected refresh')}})},
    '@/lib/supabase/client':{createClient(){throw Error('Unexpected database access')}}
  });
  for(const companyMode of [true,false]){
    const html=renderToStaticMarkup(React.createElement(NewLeadForm,{customers:[],products:[],companyMode}));
    assert.ok(html.includes(`href="${companyMode?'/company/clientes/novo':'/clientes/novo'}"`));
    assert.ok(html.includes('Status do lead'));
  }
});

test('Copilot contextualizes only known navigation and preserves unmigrated workflows',()=>{
  function getFunction(file,name,deps={}){
    const text=fs.readFileSync(file,'utf8');
    const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
    assert.ok(fn,`${name} exists`);
    const code=ts.transpileModule(fn.getText(ast).replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
    return vm.runInNewContext(`${code}\n${name}`,deps);
  }
  const companyDestination=getFunction('src/lib/company-destination.ts','companyDestination');
  const href=getFunction('src/components/nexus-copilot-dock.tsx','navigationHref',{companyDestination});
  for(const current of ['/company','/company/vender']){
    assert.equal(href(current,'/suplementos/nexus/habitos?origem=teste#lista'),'/company/suplementos/nexus/habitos?origem=teste#lista');
    assert.equal(href(current,'/fitness/clientes/11111111-1111-4111-8111-111111111111'),'/company/clientes/fitness/11111111-1111-4111-8111-111111111111');
    for(const original of ['/nexus/rotinas','/nexus/fila','/leads/novo?x=1','/suplementos/leads/novo#dados','/bank/planejamento']) assert.equal(href(current,original),original);
  }
  for(const current of ['/company-other','/suplementos','/bank']) assert.equal(href(current,'/suplementos/nexus/habitos'),'/suplementos/nexus/habitos');
  const text=fs.readFileSync('src/components/nexus-copilot-dock.tsx','utf8');
  assert.match(text,/href=\{navigationHref\(pathname, href\)\}/);
  assert.match(text,/navigationHref\(pathname, signal\.actionHref/);
  assert.match(text,/nexusRouteHref\(shortcut\.to_route\)/);
  assert.match(text,/method: "POST"/);
});
