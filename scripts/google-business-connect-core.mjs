import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export const projectId = 'stable-glass-489311-m7';
export const scope = 'https://www.googleapis.com/auth/business.manage';
export function createAuthorization(clientId, redirectUri) {
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope, access_type: 'offline', prompt: 'consent', state, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') }).toString();
  return { state, verifier, url: url.href };
}
export function validState(expected, actual) {
  if (typeof actual !== 'string' || actual.length > 256) return false;
  const left=Buffer.from(expected),right=Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left,right);
}
export function validateClient(json) {
  const client=json?.installed;
  if (!client || client.project_id !== projectId || typeof client.client_id !== 'string' || !client.client_id.endsWith('.apps.googleusercontent.com') || typeof client.client_secret !== 'string' || !client.client_secret) throw Error('Use o JSON de um cliente OAuth para computador do projeto stable-glass-489311-m7.');
  return client;
}
export async function googleJson(url, options={}, request=fetch) {
  const response=await request(url,{...options,cache:'no-store',signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw Error(response.status===403 ? 'API ou perfil sem acesso: confira aprovação, APIs habilitadas e conta administradora.' : response.status===401 ? 'Autorização recusada. Reconecte a conta administradora.' : response.status===429 ? 'Cota do Google atingida. Tente novamente mais tarde.' : 'O Google não concluiu a consulta. Nenhum arquivo de conexão foi salvo.');
  return response.json();
}
export async function listProfiles(accessToken, request=fetch) {
  const headers={Authorization:`Bearer ${accessToken}`};
  async function pages(base,field) {
    const results=[];let next='';const seen=new Set();
    do {
      if(seen.has(next)||seen.size>=100)throw Error('Paginação inesperada. Nenhuma conexão foi salva.');
      seen.add(next);const url=new URL(base);if(next)url.searchParams.set('pageToken',next);
      const data=await googleJson(url.href,{headers},request);
      if(data[field]!==undefined&&!Array.isArray(data[field]))throw Error('Resposta inesperada do Google.');
      results.push(...(data[field]??[]));next=data.nextPageToken??'';
    } while(next);
    return results;
  }
  const accounts=await pages('https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20','accounts');
  const profiles=[];const seen=new Set();
  for(const account of accounts){
    if(!/^accounts\/\d+$/.test(account?.name??''))continue;
    const locations=await pages(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,metadata&pageSize=100`,'locations');
    for(const location of locations){
      if(!/^locations\/\d+$/.test(location?.name??''))continue;
      const resource=`${account.name}/${location.name}`;
      if(seen.has(resource))continue;seen.add(resource);
      profiles.push({resource,title:typeof location.title==='string'?location.title:location.name,account:typeof account.accountName==='string'?account.accountName:account.name});
    }
  }
  return profiles;
}
export function connectionEnv(client, refreshToken, resource) {
  if(!/^accounts\/\d+\/locations\/\d+$/.test(resource)||typeof refreshToken!=='string'||!refreshToken)throw Error('Conexão incompleta.');
  // JSON-quoted dotenv values prevent embedded newlines from injecting another variable.
  return Object.entries({GOOGLE_BUSINESS_CLIENT_ID:client.client_id,GOOGLE_BUSINESS_CLIENT_SECRET:client.client_secret,GOOGLE_BUSINESS_REFRESH_TOKEN:refreshToken,GOOGLE_BUSINESS_LOCATION:resource,GOOGLE_BUSINESS_MAPS_URL:'https://maps.app.goo.gl/jBwJKoXhCydht8Vd8'}).map(([key,value])=>`${key}=${JSON.stringify(value)}`).join('\n')+'\n';
}
