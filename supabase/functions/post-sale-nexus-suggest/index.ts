import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"content-type":"application/json; charset=utf-8"}});
function outputText(response:any){if(typeof response?.output_text==="string")return response.output_text;for(const item of Array.isArray(response?.output)?response.output:[])for(const content of Array.isArray(item?.content)?item.content:[])if(content?.type==="output_text"&&typeof content.text==="string")return content.text;return""}
const clean=(v:unknown)=>typeof v==="string"&&v.trim()?v.trim():null;
function parseJson(text:string){const normalized=text.replace(/^```json\s*/i,"").replace(/^```\s*/,"").replace(/```$/,"").trim();try{return JSON.parse(normalized)}catch{return{message:normalized}}}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return reply({error:"Método não permitido"},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),openai=Deno.env.get("OPENAI_API_KEY"),model=Deno.env.get("OPENAI_POST_SALE_MODEL")??"gpt-5-mini";
 if(!url||!anon||!service||!openai)return reply({error:"Configuração interna indisponível"},503);
 const auth=req.headers.get("authorization")??"";const user=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});const admin=createClient(url,service,{auth:{persistSession:false}});
 const{data:userData}=await user.auth.getUser();if(!userData.user)return reply({error:"Não autenticado"},401);
 const{data:canWrite}=await user.rpc("can_write");if(!canWrite)return reply({error:"Sem permissão para operar o pós-venda"},403);
 let body:{batch_id?:string};try{body=await req.json()}catch{return reply({error:"JSON inválido"},400)}if(!body.batch_id)return reply({error:"batch_id é obrigatório"},400);
 const batchResult=await admin.from("post_sale_batch_overview").select("*").eq("id",body.batch_id).maybeSingle();if(batchResult.error||!batchResult.data)return reply({error:"Acompanhamento de pós-venda não encontrado"},404);const batch=batchResult.data as any;
 const customerResult=await admin.from("customers").select("id,name,phone,city,reference,notes,sensitive_to_caffeine,anxiety_or_insomnia,prohibited_products,approach_preferences,tags,crm_status,last_contact_at,last_contact_outcome").eq("id",batch.customer_id).maybeSingle();const customer=customerResult.data??{};
 const linksResult=await admin.from("post_sale_batch_sales").select("sale_id").eq("batch_id",body.batch_id);const currentSaleIds=(linksResult.data??[]).map((row:any)=>row.sale_id);
 const currentSalesResult=currentSaleIds.length?await admin.from("sales").select("id,quoted_at,delivered_at,total_amount,notes,sale_items(quantity,unit_price,products(name,category,objective,quick_message,information))").in("id",currentSaleIds).order("quoted_at",{ascending:false}):{data:[] as any[]};
 const historyResult=await admin.from("sales").select("id,quoted_at,delivered_at,total_amount,notes,sale_items(quantity,unit_price,products(name,category,objective,quick_message))").eq("customer_id",batch.customer_id).eq("record_type","sale").neq("general_status","cancelled").order("quoted_at",{ascending:false}).limit(12);
 const leadsResult=await admin.from("sales").select("id,quoted_at,general_status,notes,sale_items(quantity,products(name,category))").eq("customer_id",batch.customer_id).eq("record_type","lead").order("quoted_at",{ascending:false}).limit(8);
 const interactionsResult=await admin.from("customer_interactions").select("interaction_type,contact_on,channel,outcome,notes,status").eq("customer_id",batch.customer_id).order("contact_on",{ascending:false}).limit(12);
 const context={acompanhamento:{id:batch.id,data_prevista:batch.due_on,quantidade_compras:batch.sale_count,produtos_resumidos:batch.product_summary,valor_total:batch.total_amount,observacoes:batch.notes},cliente:customer,compras_deste_acompanhamento:currentSalesResult.data??[],historico_recente_de_compras:historyResult.data??[],leads_recentes:leadsResult.data??[],interacoes_recentes:interactionsResult.data??[]};
 const prompt=`Você é o Nexus, assistente comercial interno da Candinho Suplementos. Gere uma mensagem humana de pós-venda para WhatsApp usando SOMENTE os dados fornecidos. A mensagem deve soar como Igor falando, natural, curta e consultiva, sem parecer automação. Pergunte como a pessoa está se saindo com os produtos e adapte a pergunta ao que ela realmente comprou. Quando houver várias compras próximas, trate tudo em um único contato de forma natural. Não invente uso, sintomas, resultados ou preferências. Não faça diagnóstico ou promessa médica. Respeite campos de sensibilidade à cafeína, ansiedade/insônia e produtos proibidos. Não pressione recompra; cross-sell só pode aparecer em suggested_action, nunca forçado na mensagem. Evite emojis de coração, especialmente em mensagens para mulheres. Retorne SOMENTE JSON válido sem markdown no formato: {"message":"mensagem pronta","context_summary":"resumo interno em 1-3 frases","suggested_action":"próxima ação comercial opcional ou null","warnings":["alertas importantes"],"tone":"descrição curta do tom"}.\n\nCONTEXTO:\n${JSON.stringify(context)}`;
 try{
  const aiResponse=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${openai}`,"Content-Type":"application/json"},body:JSON.stringify({model,input:[{role:"user",content:[{type:"input_text",text:prompt}]}]})});const raw=await aiResponse.text();
  if(!aiResponse.ok){let detail=raw.slice(0,500);try{detail=JSON.parse(raw)?.error?.message??detail}catch{}throw new Error(`OpenAI ${aiResponse.status}: ${detail}`)}
  const parsedResponse=JSON.parse(raw),text=outputText(parsedResponse).trim();if(!text)throw new Error("O Nexus não retornou uma mensagem");const result=parseJson(text),message=clean(result.message)??text;
  const metadata={context_summary:clean(result.context_summary),suggested_action:clean(result.suggested_action),warnings:Array.isArray(result.warnings)?result.warnings.filter((v:unknown)=>typeof v==="string"):[],tone:clean(result.tone),model,generated_at:new Date().toISOString()};
  const saved=await admin.from("post_sale_batches").update({ai_last_message:message,ai_last_generated_at:new Date().toISOString(),ai_metadata:metadata,updated_at:new Date().toISOString()}).eq("id",body.batch_id);if(saved.error)throw new Error(saved.error.message);
  return reply({message,...metadata});
 }catch(error){const message=error instanceof Error?error.message:"Falha ao gerar mensagem de pós-venda";console.error("post-sale-nexus-suggest",message);return reply({error:message},500)}
});
