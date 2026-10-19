import { createServer } from 'node:http';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { createAuthorization, validState, validateClient, googleJson, listProfiles, connectionEnv, scope } from './google-business-connect-core.mjs';

if(process.argv.includes('--help')){
  console.log('Uso: node scripts/connect-google-business.mjs --credentials "C:/caminho/cliente-google.json"\nRequer cliente OAuth para computador do projeto stable-glass-489311-m7.\nAutoriza no navegador, lista perfis, valida leitura e cria .env.google-business.local (ignorado pelo Git).\nNão envia segredos à hospedagem, não publica e não altera avaliações.');
  process.exit(0);
}
async function main(){
  const index=process.argv.indexOf('--credentials');
  if(index<0||!process.argv[index+1])throw Error('Informe --credentials com o caminho do JSON OAuth. Use --help.');
  const output=resolve('.env.google-business.local');
  try{await access(output);throw Error('Já existe .env.google-business.local. Guarde ou remova o arquivo anterior antes de reconectar.');}catch(error){if(error.code!=='ENOENT')throw error;}
  let json;try{json=JSON.parse(await readFile(resolve(process.argv[index+1]),'utf8'));}catch{throw Error('Não foi possível ler o JSON OAuth local. Não envie esse arquivo pelo chat.');}
  const client=validateClient(json);
  let authorization,finish,rejectCallback;
  const callback=new Promise((resolve,reject)=>{finish=resolve;rejectCallback=reject;});
  // Prevent an unhandled rejection if the operator closes the flow before awaiting it.
  callback.catch(()=>{});
  let completed=false;
  const server=createServer((req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
    const url=new URL(req.url??'/','http://127.0.0.1');
    if(req.method!=='GET'||url.pathname!=='/oauth/callback'){res.writeHead(404).end('Não encontrado.');return;}
    if(completed||!authorization||!validState(authorization.state,url.searchParams.get('state'))){res.writeHead(400).end('Solicitação inválida. Retorne ao assistente local.');return;}
    completed=true;
    const code=url.searchParams.get('code');
    if(url.searchParams.has('error')||!code||code.length>4096){res.writeHead(400).end('Autorização não concluída. Retorne ao assistente.');rejectCallback(Error('Autorização cancelada no Google.'));return;}
    res.end('Autorização recebida. Volte ao terminal para escolher e confirmar o perfil.');finish(code);
  });
  const rl=createInterface({input:process.stdin,output:process.stdout});let timer;
  try{
    await new Promise((resolve,reject)=>{server.once('error',()=>reject(Error('Não foi possível iniciar a conexão local.')));server.listen(0,'127.0.0.1',resolve);});
    const redirect=`http://127.0.0.1:${server.address().port}/oauth/callback`;
    authorization=createAuthorization(client.client_id,redirect);
    console.log('A aplicação usa o escopo de administração exigido pelo Google, mas executa somente leitura de perfis e avaliações. Revise a autorização na página oficial.');
    console.log('Abra este endereço no navegador com a conta administradora da Candinho:\n'+authorization.url);
    timer=setTimeout(()=>rejectCallback(Error('Tempo de autorização encerrado. Execute o assistente novamente.')),300000);
    const code=await callback;clearTimeout(timer);server.close();
    const token=await googleJson('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:client.client_id,client_secret:client.client_secret,code,code_verifier:authorization.verifier,redirect_uri:redirect,grant_type:'authorization_code'})});
    if(typeof token.access_token!=='string'||typeof token.refresh_token!=='string')throw Error('O Google não concedeu acesso offline. Nenhuma conexão foi salva.');
    if(token.scope&&!token.scope.split(' ').includes(scope))throw Error('O acesso ao Perfil da Empresa não foi autorizado.');
    const profiles=await listProfiles(token.access_token);
    if(!profiles.length)throw Error('Nenhum perfil acessível. Confira se esta é a conta administradora da Candinho.');
    console.log('\nPerfis disponíveis:');profiles.forEach((p,i)=>console.log(`${i+1}. ${p.title} · ${p.account} · ${p.resource}`));
    const selection=await rl.question('Número do perfil da Candinho (Enter cancela): ');
    if(!/^\d+$/.test(selection)||!profiles[Number(selection)-1])throw Error('Seleção cancelada. Nenhuma conexão foi salva.');
    const selected=profiles[Number(selection)-1];
    const confirmation=await rl.question(`Confirme que "${selected.title}" corresponde à loja em https://maps.app.goo.gl/jBwJKoXhCydht8Vd8. Digite CONECTAR: `);
    if(confirmation.trim()!=='CONECTAR')throw Error('Conexão cancelada.');
    const reviews=await googleJson(`https://mybusiness.googleapis.com/v4/${selected.resource}/reviews?pageSize=1`,{headers:{Authorization:`Bearer ${token.access_token}`}});
    if(!reviews||typeof reviews!=='object'||Array.isArray(reviews)||(reviews.reviews!==undefined&&!Array.isArray(reviews.reviews)))throw Error('Não foi possível validar a leitura de avaliações.');
    await writeFile(output,connectionEnv(client,token.refresh_token,selected.resource),{flag:'wx',mode:0o600});
    console.log('Leitura validada. Configuração salva somente em .env.google-business.local. Não compartilhe o conteúdo.');
    console.log('Próximo passo técnico: cadastrar essas variáveis como segredos no servidor da Vitrine e publicar. Depois conferir Conectado em /company/vitrine. Nada foi publicado por este assistente.');
  }finally{clearTimeout(timer);server.close();rl.close();}
}
main().catch(error=>{const safe=typeof error?.message==='string'&&!/fetch|JSON|ENOENT|token|secret|client_id/i.test(error.message)?error.message:'Não foi possível concluir a conexão. Confira a configuração e tente novamente; nenhum segredo foi exibido.';console.error(safe);process.exitCode=1;});
