import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{...cors,"content-type":"application/json; charset=utf-8"}
});

const clean=(value:unknown)=>typeof value==="string"&&value.trim()?value.trim():null;

function textOf(response:any){
  if(typeof response?.output_text==="string")return response.output_text;
  for(const item of Array.isArray(response?.output)?response.output:[]){
    for(const content of Array.isArray(item?.content)?item.content:[]){
      if(content?.type==="output_text"&&typeof content.text==="string")return content.text;
    }
  }
  return "";
}

function parseJson(text:string){
  try{
    return JSON.parse(text.replace(/^```json\s*/i,"").replace(/^```\s*/,"").replace(/```$/,"").trim());
  }catch{
    return null;
  }
}

function absoluteUrl(value:string,base:string){
  try{return new URL(value,base).toString();}catch{return null;}
}

function extractMetaImage(html:string,pageUrl:string){
  const patterns=[
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/i
  ];
  for(const pattern of patterns){
    const match=html.match(pattern);
    if(match?.[1]){
      const resolved=absoluteUrl(match[1],pageUrl);
      if(resolved&&/^https?:\/\//i.test(resolved))return resolved;
    }
  }
  return null;
}

async function imageFromPage(pageUrl:string){
  try{
    const response=await fetch(pageUrl,{
      headers:{
        "User-Agent":"Mozilla/5.0 (compatible; CandinhoNexus/1.0)",
        "Accept":"text/html,application/xhtml+xml"
      },
      signal:AbortSignal.timeout(7000)
    });
    if(!response.ok)return null;
    const html=(await response.text()).slice(0,500000);
    return extractMetaImage(html,pageUrl);
  }catch{
    return null;
  }
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Método não permitido"},405);

  const url=Deno.env.get("SUPABASE_URL");
  const anon=Deno.env.get("SUPABASE_ANON_KEY");
  const key=Deno.env.get("OPENAI_API_KEY");
  if(!url||!anon||!key)return json({error:"Configuração interna indisponível"},503);

  const auth=req.headers.get("authorization")??"";
  const supabase=createClient(url,anon,{
    global:{headers:{Authorization:auth}},
    auth:{persistSession:false}
  });

  const {data:user,error:authError}=await supabase.auth.getUser();
  if(authError||!user.user)return json({error:"Não autenticado"},401);

  const {data:can,error:permissionError}=await supabase.rpc("central_can_manage_demand_gaps");
  if(permissionError)return json({error:"Falha ao validar permissão"},500);
  if(!can)return json({error:"Sem permissão"},403);

  let body:any;
  try{body=await req.json();}catch{return json({error:"JSON inválido"},400);}

  const name=clean(body?.name);
  if(!name||name.length<3)return json({error:"Digite um nome de produto mais completo."},400);

  const prompt=`Pesquise na web o produto comercial "${name}". Quero identificar visualmente o produto correto para registrar uma demanda/ruptura no ERP Candinho. Encontre até 6 páginas de produto confiáveis, priorizando fabricante oficial e grandes lojas brasileiras. Não invente URLs. Retorne SOMENTE JSON válido no formato {"candidates":[{"title":string,"page_url":string,"image_url":string|null}]}. image_url deve ser uma URL direta de imagem somente se estiver claramente disponível na página pesquisada; caso contrário use null.`;

  try{
    const openaiResponse=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:Deno.env.get("OPENAI_PRODUCT_ENRICH_MODEL")??"gpt-5",
        store:false,
        tools:[{type:"web_search"}],
        input:prompt
      })
    });

    const raw=await openaiResponse.text();
    if(!openaiResponse.ok)throw new Error(`Pesquisa Nexus falhou (${openaiResponse.status})`);

    const response=JSON.parse(raw);
    const parsed=parseJson(textOf(response));
    const rawCandidates=Array.isArray(parsed?.candidates)?parsed.candidates.slice(0,6):[];

    const results:any[]=[];
    const seen=new Set<string>();

    for(const candidate of rawCandidates){
      const pageUrl=clean(candidate?.page_url);
      if(!pageUrl||!/^https?:\/\//i.test(pageUrl))continue;

      let imageUrl=clean(candidate?.image_url);
      if(!imageUrl||!/^https?:\/\//i.test(imageUrl)){
        imageUrl=await imageFromPage(pageUrl);
      }

      if(!imageUrl||seen.has(imageUrl))continue;
      seen.add(imageUrl);

      results.push({
        title:clean(candidate?.title)??name,
        image_url:imageUrl,
        source_url:pageUrl
      });

      if(results.length>=3)break;
    }

    if(results.length===0){
      return json({
        candidates:[],
        message:"O Nexus encontrou referências do produto, mas não conseguiu extrair imagens seguras dessas páginas. Tente deixar o nome mais completo, incluindo marca e tamanho."
      });
    }

    return json({candidates:results});
  }catch(error){
    return json({error:error instanceof Error?error.message:"Falha ao pesquisar imagens"},500);
  }
});
