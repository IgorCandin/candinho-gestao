import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};

const json=(body:unknown,status=200)=>
  new Response(
    JSON.stringify(body),
    {
      status,
      headers:{
        ...cors,
        "content-type":"application/json; charset=utf-8"
      }
    }
  );

const clean=(v:unknown)=>
  typeof v==="string"&&v.trim()
    ?v.trim()
    :null;

function textOf(r:any){
  if(typeof r?.output_text==="string")return r.output_text;
  for(const i of Array.isArray(r?.output)?r.output:[])
    for(const c of Array.isArray(i?.content)?i.content:[])
      if(c?.type==="output_text"&&typeof c.text==="string")
        return c.text;
  return "";
}

function sourcesOf(r:any){
  const sources=new Set<string>();

  for(const i of Array.isArray(r?.output)?r.output:[]){
    if(i?.type==="web_search_call"){
      for(const x of Array.isArray(i?.action?.sources)?i.action.sources:[]){
        if(typeof x?.url==="string")sources.add(x.url);
      }
    }

    for(const c of Array.isArray(i?.content)?i.content:[]){
      for(const a of Array.isArray(c?.annotations)?c.annotations:[]){
        const url=a?.url??a?.url_citation?.url;
        if(typeof url==="string")sources.add(url);
      }
    }
  }

  return [...sources].slice(0,8);
}

function parse(text:string){
  try{
    return JSON.parse(
      text
        .replace(/^```json\s*/i,"")
        .replace(/^```\s*/,"")
        .replace(/```$/,"")
        .trim()
    );
  }catch{
    return null;
  }
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS"){
    return new Response("ok",{headers:cors});
  }

  if(req.method!=="POST"){
    return json({error:"Método não permitido"},405);
  }

  const url=Deno.env.get("SUPABASE_URL");
  const anon=Deno.env.get("SUPABASE_ANON_KEY");
  const key=Deno.env.get("OPENAI_API_KEY");

  if(!url||!anon||!key){
    return json({error:"Configuração interna indisponível"},503);
  }

  const auth=req.headers.get("authorization")??"";

  const supabase=createClient(
    url,
    anon,
    {
      global:{headers:{Authorization:auth}},
      auth:{persistSession:false}
    }
  );

  const {
    data:userData,
    error:authError
  }=await supabase.auth.getUser();

  if(authError||!userData.user){
    return json({error:"Não autenticado"},401);
  }

  const {
    data:canWrite,
    error:permissionError
  }=await supabase.rpc("can_write");

  if(permissionError){
    return json({error:"Falha ao validar permissão"},500);
  }

  if(!canWrite){
    return json({error:"Sem permissão"},403);
  }

  let body:any;

  try{
    body=await req.json();
  }catch{
    return json({error:"JSON inválido"},400);
  }

  const name=clean(body?.name);

  if(!name||name.length<3){
    return json(
      {error:"Informe um nome de produto mais completo."},
      400
    );
  }

  const existing=
    body?.existing&&typeof body.existing==="object"
      ?body.existing
      :{};

  const categories=
    Array.isArray(body?.categories)
      ?body.categories
        .filter((x:unknown)=>typeof x==="string")
        .slice(0,80)
      :[];

  const prompt=
    `Pesquise na web o produto ${name} e sugira somente dados cadastrais verificáveis para os campos vazios. Priorize fabricante e página oficial. Não invente. Não sugira preços, estoque, fornecedor ou SKU. Campos existentes: ${JSON.stringify(existing)}. Categorias do sistema: ${JSON.stringify(categories)}. Retorne somente JSON válido: {"brand":string|null,"category":string|null,"description":string|null,"objective":string|null,"ideal_profile":string|null,"duration_days":number|null,"information":string|null,"quick_message":string|null,"keywords":string|null,"level":string|null,"confidence":"alta"|"media"|"baixa","research_note":string|null}. Se houver dúvida, use null.`;

  try{
    const response=await fetch(
      "https://api.openai.com/v1/responses",
      {
        method:"POST",
        headers:{
          Authorization:`Bearer ${key}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          model:
            Deno.env.get("OPENAI_PRODUCT_ENRICH_MODEL")
            ??"gpt-5",
          store:false,
          tools:[{type:"web_search"}],
          input:prompt
        })
      }
    );

    const raw=await response.text();

    if(!response.ok){
      throw new Error(
        `Pesquisa falhou (${response.status})`
      );
    }

    const result=JSON.parse(raw);
    const parsed=parse(textOf(result));

    if(!parsed){
      throw new Error(
        "Resposta inválida do Nexus"
      );
    }

    return json({
      suggestions:{
        brand:clean(parsed.brand),
        category:clean(parsed.category),
        description:clean(parsed.description),
        objective:clean(parsed.objective),
        ideal_profile:clean(parsed.ideal_profile),
        duration_days:
          Number(parsed.duration_days)>0
            ?Number(parsed.duration_days)
            :null,
        information:clean(parsed.information),
        quick_message:clean(parsed.quick_message),
        keywords:clean(parsed.keywords),
        level:clean(parsed.level)
      },
      confidence:
        ["alta","media","baixa"].includes(parsed.confidence)
          ?parsed.confidence
          :"baixa",
      research_note:clean(parsed.research_note),
      sources:sourcesOf(result),
      saved:false
    });
  }catch(error){
    return json(
      {
        error:
          error instanceof Error
            ?error.message
            :"Falha ao pesquisar produto"
      },
      500
    );
  }
});
