// Read-only exact function-body audit. No source snippets or customer data are printed.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ts=require('typescript');

function findDuplicateFunctions(files,minTokens=80){
  const groups=new Map();
  for(const file of files){
    const source=ts.createSourceFile(file.path,file.source,ts.ScriptTarget.Latest,true,file.path.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    function visit(node){
      if((ts.isFunctionDeclaration(node)||ts.isMethodDeclaration(node)||ts.isArrowFunction(node)||ts.isFunctionExpression(node))&&node.body&&ts.isBlock(node.body)){
        const scanner=ts.createScanner(ts.ScriptTarget.Latest,true,ts.LanguageVariant.JSX,node.body.getText(source));
        const tokens=[];let token;
        while((token=scanner.scan())!==ts.SyntaxKind.EndOfFileToken) tokens.push(`${token}:${scanner.getTokenText()}`);
        if(tokens.length>=minTokens){
          const hash=crypto.createHash('sha256').update(tokens.join('\n')).digest('hex');
          const rows=groups.get(hash)??[];
          rows.push({path:file.path,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,tokens:tokens.length});
          groups.set(hash,rows);
        }
      }
      ts.forEachChild(node,visit);
    }
    visit(source);
  }
  return [...groups.values()].filter(rows=>new Set(rows.map(row=>row.path)).size>1);
}
module.exports={findDuplicateFunctions};
if(require.main===module){
  const root=path.resolve(__dirname,'../src'),files=[];
  function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,item.name);if(item.isDirectory())walk(full);else if(/\.tsx?$/.test(item.name)&&!item.name.endsWith('.d.ts'))files.push({path:path.relative(path.resolve(__dirname,'..'),full).split(path.sep).join('/'),source:fs.readFileSync(full,'utf8')});}}
  walk(root);
  const groups=findDuplicateFunctions(files);
  console.log(JSON.stringify({scope:'Exact function bodies of 80+ tokens across source files; candidates only, no automatic refactor or data merge',filesScanned:files.length,groupsFound:groups.length,groups:groups.slice(0,25)},null,2));
}
