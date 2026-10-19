/* eslint-disable @typescript-eslint/no-require-imports -- Isolated probe, no real telemetry. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function inspect({zoom=1,scrollWidth=414,right=414}) {
  const sent=[],seen=new Set();
  const body={scrollWidth,offsetWidth:414};
  const header={tagName:'HEADER',id:'',classList:['company-command-header'],parentElement:body,offsetParent:body,matches:()=>false,getBoundingClientRect:()=>({left:0,right,top:-113,bottom:-47,width:right,height:66})};
  body.querySelectorAll=()=>[header];
  global.document={body,documentElement:{scrollWidth,offsetWidth:414,clientWidth:414,clientHeight:750}};
  global.window={innerWidth:Math.round(414/zoom),innerHeight:Math.round(750/zoom),visualViewport:{width:414/zoom,height:750/zoom,scale:zoom},getComputedStyle:()=>({position:'sticky',visibility:'visible',opacity:'1'}),sessionStorage:{getItem:key=>seen.has(key)?'1':null,setItem:key=>seen.add(key)}};
  global.fetch=async(url,options)=>{sent.push(JSON.parse(options.body));return {};};
  const file=path.resolve(__dirname,'../src/components/nexus-ux-doctor-probe.tsx'),mod=new Module(file,module);
  mod.require=id=>id==='react'?{useEffect(){}}:id==='next/navigation'?{usePathname(){}}:require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8')+'\nexport {inspectLayout};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
  try {return {issue:mod.exports.inspectLayout('/company/vitrine'),sent};}
  finally {for(const key of ['document','window','fetch'])delete global[key];}
}
test('Doctor does not confuse manual pinch zoom with document overflow or sticky clipping',()=>{
  const result=inspect({zoom:1.45410633});assert.equal(result.issue,false);assert.equal(result.sent.length,0);
});
test('Doctor still detects actual overflow while zoomed and at normal scale',()=>{
  for(const zoom of [1,1.45410633]) {
    const result=inspect({zoom,scrollWidth:460,right:460});assert.equal(result.issue,true);
    assert.equal(result.sent.find(x=>x.signal_type==='horizontal_overflow').overflow_px,46);
    assert.equal(result.sent.find(x=>x.signal_type==='fixed_clip').overflow_px,46);
  }
});
