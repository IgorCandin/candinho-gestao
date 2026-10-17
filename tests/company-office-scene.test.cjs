const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const file = path.resolve(__dirname, '../src/components/company-office-scene.tsx');
function load(hooks = React, refresh = () => {}) {
  const compiled = new Module(file, module);
  compiled.require = id => id === 'react' ? hooks : id === './company-office-scene.css' ? {} : id === 'next/navigation' ? { useRouter: () => ({ refresh }) } : id === 'next/link' ? { __esModule: true, default: ({ children, href, prefetch, ...props }) => React.createElement('a', { href, ...props }, children) } : require(id);
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  return compiled.exports.CompanyOfficeScene;
}
const Scene = load();
const room = (name, count) => ({ name, color: '#abc', signals: [{ label: 'Entregas', count, href: '/company/concluir' }], unmonitored: ['Consignações'] });
const render = rooms => renderToStaticMarkup(React.createElement(Scene, { rooms, consulted: '17/10/2026' }));
test('all rooms render together with real queue links and explicit coverage', () => {
  const html = render([room('Suplementos', 3), room('Fitness', 2)]);
  assert.match(html, /3 registro/); assert.match(html, /2 registro/);
  assert.match(html, /href="\/company\/concluir"/); assert.match(html, /Consignações/);
  assert.doesNotMatch(html, /Simular resolução|<aside/);
});
test('unavailable never means zero; zero produces an honest limited empty state', () => {
  assert.match(render([room('Bank', 0)]), /Sem pendências nos indicadores/);
  const unknown = render([room('Bank', null)]);
  assert.match(unknown, /Consulta indisponível/);
  assert.doesNotMatch(unknown, /Sem pendências nos indicadores/);
});
test('no accessible rooms produces no sample characters', () => {
  const html = render([]); assert.match(html, /Nenhuma operação disponível/); assert.doesNotMatch(html, /class="co-agent"/);
});
test('hover, pin, switch, Escape, close/focus and refresh', () => {
  const slots = []; let cursor = 0; let refreshed = 0; let focused = 0;
  const hooks = { ...React, useEffect() {}, useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; }, useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; }, useTransition() { return [false, cb => cb()]; } };
  const Component = load(hooks, () => refreshed++);
  function tree() { cursor = 0; return Component({ rooms: [room('Fitness', 1), room('Bank', 0)], consulted: 'agora' }); }
  function nodes(node) { if (!node || typeof node !== 'object') return []; return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)]; }
  const agent = (view, name) => nodes(view).find(n => n.props.className === 'co-agent' && n.props['aria-label'].includes(name));
  const panel = (view, name) => nodes(view).find(n => n.props.id === `office-room-${name}`);
  let view = tree(); assert.equal(panel(view, 'fitness').props.hidden, true);
  agent(view, 'Bia').props.onMouseEnter(); view = tree(); assert.equal(panel(view, 'fitness').props.hidden, false);
  agent(view, 'Bia').props.onClick({currentTarget:{focus(){focused++;}}}); view = tree();
  agent(view, 'Davi').props.onMouseEnter(); view = tree(); assert.equal(panel(view, 'fitness').props.hidden, false);
  agent(view, 'Davi').props.onClick({currentTarget:{focus(){focused++;}}}); view = tree(); assert.equal(panel(view, 'bank').props.hidden, false);
  view.props.onKeyDown({key:'Escape', preventDefault(){}}); view = tree(); assert.equal(panel(view, 'bank').props.hidden, true);
  agent(view, 'Bia').props.onFocus({currentTarget:{focus(){focused++;}}}); view = tree();
  nodes(view).find(n => n.props['aria-label'] === 'Fechar painel de pendências').props.onClick(); view = tree(); assert.equal(panel(view, 'fitness').props.hidden, true);
  nodes(view).find(n => n.props.className === 'co-refresh').props.onClick(); assert.equal(refreshed, 1); assert.equal(focused, 2);
});

test('page respects operation access and preserves failed counts', async () => {
  const pageFile = path.resolve(__dirname, '../src/app/(app)/company/escritorio/page.tsx');
  const queries = [];
  let access = {active:true,role:'operator',canAccessSupplements:false,canAccessFitness:true,canAccessBank:false};
  const db = { from(table) { const q = {table,filters:[]}; queries.push(q); const chain = { select(){return chain;}, eq(...args){q.filters.push(['eq',...args]);return chain;}, neq(...args){q.filters.push(['neq',...args]);return chain;}, or(){return chain;}, then(resolve){return Promise.resolve({count:table==='fitness_post_sale_overview'?null:2,error:table==='fitness_post_sale_overview'?new Error('offline'):null}).then(resolve);} }; return chain; }, rpc: async () => ({data:{auto_active:0,manual_pending:0},error:null}) };
  const mod = new Module(pageFile,module);
  mod.require = id => id === '@/components/company-office-scene' ? {CompanyOfficeScene:Scene} : id==='next/navigation' ? {redirect(){throw new Error('redirect');}} : id==='@/lib/data' ? {getCurrentUserAccess:async()=>access} : id==='@/lib/supabase/server' ? {createClient:async()=>db} : id==='@/lib/bank-home-data-v2' ? {getBankMonthHomeDataV2(){throw new Error('bank should not be consulted');}} : id==='@/lib/fitness-size-opportunities-data' ? {getFitnessSizeOpportunities:async()=>({opportunities:[]})} : require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(pageFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,pageFile);
  const result = await mod.exports.default();
  assert.deepEqual(result.props.rooms.map(r=>r.name),['Company · Clientes','Fitness']);
  assert.equal(queries.some(q=>['customers','pending_orders','replenishment_overview'].includes(q.table)),false);
  const fitness = result.props.rooms.find(r=>r.name==='Fitness');
  assert.equal(fitness.signals.find(s=>s.label==='Pós-vendas planejados').count,null);
  for(const q of queries.filter(q=>q.table==='fitness_sales_operational')) assert.ok(q.filters.some(f=>f[0]==='neq'&&f[1]==='general_status'&&f[2]==='cancelled'));
  access = {...access,role:'partner'};
  await assert.rejects(mod.exports.default(),/redirect/);
});
