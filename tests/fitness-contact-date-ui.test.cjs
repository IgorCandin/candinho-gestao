const {test}=require('node:test'),assert=require('node:assert/strict'),React=require('react');
const {load}=require('./helpers/company-navigation-fixtures.cjs');
function nodes(n){return !n||typeof n!=='object'?[]:[n,...React.Children.toArray(n.props?.children).flatMap(nodes)]}
function harness(canWrite=true,contact){let cursor=0;const state=[],calls=[];const hooks={...React,useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],v=>state[i]=v]}};
 const View=load('src/components/fitness-opportunity-contact-actions.tsx',{'./fitness-opportunity-contact-actions.css':{},'next/link':'a',react:hooks,'next/navigation':{useRouter:()=>({refresh(){}})},'@/components/company-workflow-sync':{notifyCompanyWorkflowUpdated(){}},'@/lib/fitness-opportunity-contact':load('src/lib/fitness-opportunity-contact.ts'),'@/lib/format':{formatDateOnly:String}}).FitnessOpportunityContactActions;
 return{calls,view(){cursor=0;return View({customerId:'fixture',today:'2026-10-23',canWrite,contact,onSaved:c=>calls.push(c)})}};
}
const button=(tree,text)=>nodes(tree).find(n=>n.type==='button'&&n.props.children===text);
test('contacted opens six-day suggestion without saving; chosen date and status reach the same API',async()=>{
 const h=harness(),original=global.fetch;let body;
 global.fetch=async(url,options)=>{body=JSON.parse(options.body);return{ok:true,json:async()=>({contact:{status:'contacted',revision:1,next_contact_on:body.nextContactOn}})}};
 try{button(h.view(),'Já chamei · aguardar resposta').props.onClick();let input=nodes(h.view()).find(n=>n.type==='input');assert.equal(body,undefined);assert.equal(input.props.value,'2026-10-29');assert.equal(input.props.min,'2026-10-24');input.props.onChange({target:{value:'2026-11-03'}});await button(h.view(),'Salvar contato e retorno').props.onClick();assert.equal(body.status,'contacted');assert.equal(body.nextContactOn,'2026-11-03');await new Promise(setImmediate);assert.equal(h.calls.length,1);}finally{global.fetch=original}
});
test('past date never saves, existing future date can be edited and read-only has no controls',async()=>{
 const original=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw Error('must not save')};
 try{const h=harness(true,{status:'contacted',next_contact_on:'2026-11-05',updated_at:'2026-10-23T12:00:00Z',revision:1});button(h.view(),'Já chamei · aguardar resposta').props.onClick();let input=nodes(h.view()).find(n=>n.type==='input');assert.equal(input.props.value,'2026-11-05');input.props.onChange({target:{value:'2026-10-23'}});await button(h.view(),'Salvar contato e retorno').props.onClick();assert.equal(calls,0);assert.ok(nodes(h.view()).some(n=>n.props?.role==='alert'));assert.equal(nodes(harness(false).view()).filter(n=>n.type==='button').length,0);}finally{global.fetch=original}
});
