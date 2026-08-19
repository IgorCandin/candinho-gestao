import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } }); }
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);
  const url=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), token=text(Deno.env.get("META_WHATSAPP_ACCESS_TOKEN"))||text(Deno.env.get("META_ACCESS_TOKEN")), version=text(Deno.env.get("META_GRAPH_API_VERSION"));
  if (!url||!anon||!service||!token||!version) return json({ error: "Configuração da integração Meta indisponível" }, 503);
  const authorization=request.headers.get("authorization")??"", userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}}), admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth}=await userClient.auth.getUser(); if(!auth.user) return json({error:"Não autenticado"},401);
  const {data:access,error:accessError}=await userClient.rpc("get_my_access_v2"), permissions=Array.isArray(access)?access[0]:access;
  if(accessError||!(permissions?.can_manage_users||permissions?.role==="admin")) return json({error:"Somente administradores podem desregistrar o número"},403);
  let body:{phone_number_id?:unknown}; try{body=await request.json();}catch{return json({error:"JSON inválido"},400);}
  const phoneNumberId=text(body.phone_number_id); if(!/^\d+$/.test(phoneNumberId)) return json({error:"Identificador de telefone inválido"},400);
  const {data:integration}=await admin.from("central_integrations").select("id,account_name").eq("provider","whatsapp").eq("account_external_id",phoneNumberId).maybeSingle(); if(!integration) return json({error:"Integração WhatsApp não encontrada"},404);
  const response=await fetch(`https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(phoneNumberId)}/deregister`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp"})}); const result=await response.json().catch(()=>({})) as {error?:{message?:string}};
  if(!response.ok)return json({error:result.error?.message||"A Meta não aceitou o desregistro"},502);
  const now=new Date().toISOString(); await Promise.all([admin.from("central_integrations").update({status:"disconnected",last_error:null,updated_at:now}).eq("id",integration.id),admin.from("central_channels").update({active:false,updated_at:now}).eq("provider","whatsapp").eq("account_external_id",phoneNumberId),admin.from("audit_events").insert({entity_type:"central_integration",entity_id:integration.id,action:"meta_phone_deregistered",details:{account_name:integration.account_name,phone_number_id:phoneNumberId},created_by:auth.user.id})]);
  return json({deregistered:true});
});
