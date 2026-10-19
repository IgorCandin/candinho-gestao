import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const access=await getCurrentUserAccess();if(!access.active||access.role==="partner"||(access.role!=="admin"&&!access.canWriteFitness))return NextResponse.json({error:"Sem permissão para registrar contato Fitness."},{status:403});
 const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({error:"Cliente inválida."},{status:400});
 let body;try{body=await request.json()}catch{return NextResponse.json({error:"Dados inválidos."},{status:400})}
 if(!body||!["contacted","responded","later"].includes(body.status)||!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0||(body.notes!=null&&(typeof body.notes!=="string"||body.notes.length>1000)))return NextResponse.json({error:"Resultado ou versão inválida."},{status:400});
 if(body.status==="later"&&(!/^\d{4}-\d{2}-\d{2}$/.test(body.nextContactOn??"")||!Number.isFinite(Date.parse(body.nextContactOn+"T12:00:00Z"))||new Date(body.nextContactOn+"T12:00:00Z").toISOString().slice(0,10)!==body.nextContactOn))return NextResponse.json({error:"Escolha uma data válida de retorno."},{status:400});
 const db=await createClient();const {data,error}=await db.rpc("record_fitness_opportunity_contact_v1",{p_customer_id:id,p_status:body.status,p_expected_revision:body.expectedRevision,p_next_contact_on:body.status==="later"?body.nextContactOn:null,p_notes:body.notes??null});
 if(error)return NextResponse.json({error:error.code==="40001"?"Este contato mudou em outra tela. Atualize antes de salvar.":error.code==="42501"?"Sem permissão para registrar contato Fitness.":"Não foi possível registrar o contato. Confira os dados e tente novamente."},{status:error.code==="40001"?409:error.code==="42501"?403:400});
 revalidatePath("/company/acompanhar");revalidatePath("/company/vender");revalidatePath("/company/fitness/oportunidades");return NextResponse.json({contact:data});
}
