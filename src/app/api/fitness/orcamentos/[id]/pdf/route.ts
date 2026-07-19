import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDFDocument,StandardFonts,rgb,type PDFPage } from "pdf-lib";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime="nodejs";
const W=595.28,H=841.89,M=38;
const BG=rgb(.025,.025,.032),PANEL=rgb(.08,.08,.1),TEXT=rgb(.96,.96,.98),MUTED=rgb(.65,.65,.72),PINK=rgb(.96,.28,.58),LINE=rgb(.2,.2,.24);
const safe=(v:unknown)=>String(v??"").normalize("NFC").replace(/[–—]/g,"-").replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
const money=(v:unknown)=>`R$ ${Number(v??0).toFixed(2).replace(".",",")}`;
const date=(v:unknown)=>{const s=String(v??"");if(!s)return "-";const[y,m,d]=s.slice(0,10).split("-");return `${d}/${m}/${y}`};

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const access=await getCurrentUserAccess();if(!access.canAccessFitness)return NextResponse.json({error:"Acesso negado"},{status:403});
 const{id}=await params;const supabase=await createClient();
 const[{data:q,error},{data:items}]=await Promise.all([supabase.from("fitness_quotes_overview").select("*").eq("id",id).maybeSingle(),supabase.from("fitness_quote_items_overview").select("*").eq("quote_id",id).order("created_at")]);
 if(error)return NextResponse.json({error:error.message},{status:500});if(!q)return NextResponse.json({error:"Orçamento não encontrado"},{status:404});
 const pdf=await PDFDocument.create();const regular=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 let logo:any=null;try{logo=await pdf.embedPng(await readFile(path.join(process.cwd(),"public","candinho-fitness-logo.png")))}catch{}
 let page:PDFPage=pdf.addPage([W,H]);let y=H-120;
 page.drawRectangle({x:0,y:0,width:W,height:H,color:BG});page.drawRectangle({x:0,y:H-94,width:W,height:94,color:rgb(.018,.018,.023)});page.drawRectangle({x:0,y:0,width:4,height:H,color:PINK});
 if(logo){const scale=Math.min(180/logo.width,50/logo.height);page.drawImage(logo,{x:M,y:H-72,width:logo.width*scale,height:logo.height*scale})}else page.drawText("CANDINHO FITNESS",{x:M,y:H-58,size:20,font:bold,color:TEXT});
 const badge=`ORÇAMENTO #${q.quote_number}`;page.drawText(badge,{x:W-M-bold.widthOfTextAtSize(badge,10),y:H-54,size:10,font:bold,color:PINK});
 page.drawRectangle({x:M,y:y-76,width:W-2*M,height:76,color:PANEL});page.drawText("PREPARADO PARA",{x:M+16,y:y-18,size:7,font:bold,color:PINK});page.drawText(safe(q.customer_name),{x:M+16,y:y-43,size:18,font:bold,color:TEXT});if(q.customer_phone)page.drawText(safe(q.customer_phone),{x:M+16,y:y-62,size:8,font:regular,color:MUTED});y-=95;
 const cards=[["DATA",date(q.quoted_on)],["VÁLIDO ATÉ",date(q.valid_until)],["STATUS",q.status==="confirmed"?"Convertido":"Em orçamento"]];const gap=9,cw=(W-2*M-gap*2)/3;cards.forEach(([l,v],i)=>{const x=M+i*(cw+gap);page.drawRectangle({x,y:y-46,width:cw,height:46,color:PANEL,borderColor:LINE,borderWidth:.6});page.drawText(l,{x:x+10,y:y-15,size:6.5,font:bold,color:MUTED});page.drawText(safe(v),{x:x+10,y:y-33,size:9,font:bold,color:i===1?PINK:TEXT})});y-=67;
 page.drawText("ITENS DA PROPOSTA",{x:M,y,size:8,font:bold,color:PINK});y-=18;
 for(const [idx,item] of ((items??[]) as any[]).entries()){if(y<90){page=pdf.addPage([W,H]);page.drawRectangle({x:0,y:0,width:W,height:H,color:BG});page.drawRectangle({x:0,y:0,width:4,height:H,color:PINK});y=H-55}page.drawRectangle({x:M,y:y-43,width:W-2*M,height:43,color:idx%2?rgb(.055,.055,.07):PANEL});page.drawText(safe(`${item.product_name} · ${item.size} · ${item.color}`),{x:M+10,y:y-18,size:9,font:bold,color:TEXT});page.drawText(`${item.quantity} x ${money(item.unit_price)}`,{x:M+10,y:y-34,size:7.5,font:regular,color:MUTED});const total=money(item.total_price);page.drawText(total,{x:W-M-10-bold.widthOfTextAtSize(total,9),y:y-26,size:9,font:bold,color:TEXT});y-=47}
 y-=12;page.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:.7,color:LINE});y-=24;
 const right=(label:string,val:string,accent=false)=>{page.drawText(label,{x:W-M-190,y,size:8,font:regular,color:MUTED});page.drawText(val,{x:W-M-bold.widthOfTextAtSize(val,11),y:y-1,size:11,font:bold,color:accent?PINK:TEXT});y-=23};
 right("Subtotal",money(q.gross_amount));if(Number(q.discount_amount)>0)right("Desconto",`- ${money(q.discount_amount)}`);right("TOTAL",money(q.total_amount),true);
 if(q.notes){y-=10;page.drawText("OBSERVAÇÕES",{x:M,y,size:7,font:bold,color:PINK});y-=16;page.drawText(safe(q.notes).slice(0,220),{x:M,y,size:8,font:regular,color:MUTED})}
 for(const[p,index]of pdf.getPages().map((p,i)=>[p,i] as const)){p.drawLine({start:{x:M,y:28},end:{x:W-M,y:28},thickness:.5,color:LINE});p.drawText("Candinho Fitness · Qualidade que entrega resultado.",{x:M,y:14,size:7,font:regular,color:MUTED});p.drawText(String(index+1),{x:W-M-8,y:14,size:7,font:regular,color:MUTED})}
 const bytes=await pdf.save();return new Response(Buffer.from(bytes),{headers:{"content-type":"application/pdf","content-disposition":`inline; filename=\"orcamento-fitness-${q.quote_number}.pdf\"`,"cache-control":"no-store"}});
}
